import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// 브랜드 파트너 신청서 전용 서버 유틸. SERVER-ONLY — "use client" 파일에서 import하지 말 것.
// - 계좌번호 암호화(AES-256-GCM). 키는 PARTNER_DATA_KEY(32바이트를 base64로 인코딩한 값).
//   키를 잃어버리면 이미 저장된 계좌번호는 복호화할 수 없으니 안전한 곳에 따로 보관할 것.
// - 신청자 결과 확인 링크용 토큰 발급/해시. DB에는 해시만 저장한다.
// - 초대 링크 코드 비교(PARTNER_APPLY_INVITE_TOKEN).

function dataKey(): Buffer {
  const raw = process.env.PARTNER_DATA_KEY;
  if (!raw) throw new Error("PARTNER_DATA_KEY is not set — required for partner applications.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("PARTNER_DATA_KEY must be 32 bytes encoded as base64.");
  return key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Unsupported encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", dataKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function newStatusToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashStatusToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// 신청 횟수 제한용. 원본 IP는 저장하지 않고 키를 섞은 해시만 남긴다.
export function hashIp(ip: string): string {
  return createHmac("sha256", dataKey()).update(ip).digest("hex");
}

export function isValidInviteToken(candidate: string): boolean {
  const expected = process.env.PARTNER_APPLY_INVITE_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
