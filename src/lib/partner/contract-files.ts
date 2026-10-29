/** 시설 계약서 PDF 보관함의 공통 규칙(브라우저·서버 모두 사용하는 순수 함수). */
export const CONTRACT_BUCKET = "facility-contracts";
export const CONTRACT_MAX_BYTES = 20 * 1024 * 1024;

export type ContractPdfCheck = { ok: true } | { ok: false; message: string };

export function validateContractPdf(file: { name: string; size: number; type: string }): ContractPdfCheck {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return { ok: false, message: "PDF 파일만 올릴 수 있습니다." };
  if (file.size <= 0) return { ok: false, message: "빈 파일은 올릴 수 없습니다." };
  if (file.size > CONTRACT_MAX_BYTES) return { ok: false, message: "파일 하나는 20MB 이하여야 합니다." };
  return { ok: true };
}

/** 저장 경로는 한글·공백 문제를 피하려고 영문·숫자로만 만든다(원래 파일 이름은 목록에 따로 저장). */
export function contractStoragePath(facilityId: string, uniqueId: string): string {
  return `${facilityId}/${uniqueId}.pdf`;
}

export function isContractPathFor(facilityId: string, path: string): boolean {
  return path.startsWith(`${facilityId}/`) && path.endsWith(".pdf") && !path.slice(facilityId.length + 1).includes("/");
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
