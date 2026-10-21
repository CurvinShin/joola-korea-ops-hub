import type { FacilityTier } from "@/lib/types/database.types";

// 브랜드 파트너 승인 후 안내(브랜딩 · 네트). 규칙 원본은 옵시디안 가이드라인 6번과
// 2026-10-21 대화에서 확정한 내용이다. 숫자·문구를 바꾸려면 이 파일만 고치면 된다.

// 0056 마이그레이션으로 partner_applications에 추가된 컬럼.
export interface PartnerOnboardingFields {
  branding_ack_at: string | null;
  pronet_purchase_qty: number | null;
  symmetry_purchase_qty: number | null;
  net_inquiry_at: string | null;
}

// 시안 전달 링크(승인된 신청자에게만 상태 확인 페이지에 보인다).
export const DESIGN_PROPOSAL_URL = "https://joola.box.com/s/avmsok9v4a62szrlvs7rytpvpf9iwriv";

export const PRONET_PRICE = 1_100_000; // 부가세 포함
export const SYMMETRY_NET_PRICE = 330_000; // 부가세 포함
export const PRO_FREE_PRONET_MAX = 5;

export const BRANDING_GUIDE: string[] = [
  "시안을 확인하신 뒤 페인트, 고급 현수막, 시트지 등으로 브랜딩해 주세요. 재질은 시설에서 자유롭게 선택하셔도 됩니다.",
  "영상이나 사진을 어느 위치에서 찍더라도 코트와 함께 JOOLA 브랜딩이 보여야 합니다.",
  "브랜딩 위치는 시설에서 정하며, JOOLA KOREA는 위치에 대해 책임을 지지 않습니다.",
  "다만 브랜딩이 너무 작거나 어디에서도 잘 보이지 않는 상황은 없도록 부탁드립니다.",
  "브랜딩 시공 비용은 시설에서 부담합니다.",
];

// 프로네트 도착 전 임시 네트와 운송비 안내(무상 지급분·구매분 모두 해당).
// 2026-10-19 혜택·의무 안내문(미디어 노출 금지, 도착 후 영업일 3일 이내 교체)을 그대로 이어받았다.
export const NET_DELIVERY_NOTICE: string[] = [
  "프로네트는 주문 후 도착까지 최대 2개월이 걸릴 수 있습니다.",
  "프로네트가 도착하기 전에는 JOOLA 시미트리 네트를 대여해서 사용하실 수 있습니다. 대여 네트의 운반비(왕복)와 구매하신 프로네트의 운반비는 시설에서 부담합니다.",
  "JOOLA 시미트리 네트(또는 JOOLA 네트)를 대여하지 않으시면, 프로네트를 받으실 때(무상 지급분·구매분 모두)까지 다른 브랜드 네트를 사용하셔도 됩니다. 다만 다른 브랜드 네트가 보이는 사진·영상 등 미디어 노출은 하지 말아 주세요.",
  "프로네트가 도착하면 영업일 3일 이내에 교체해 주세요.",
];

// 무상 지급 프로네트 수. Pro는 코트 수만큼(최대 5개), Edge는 1개, Champion은 없음.
export function freeProNets(tier: FacilityTier, courts: number): number {
  const c = Math.max(0, Math.floor(courts));
  if (tier === "pro") return Math.min(c, PRO_FREE_PRONET_MAX);
  if (tier === "edge") return Math.min(c, 1);
  return 0;
}

// 무상 지급분을 넘어서 네트가 더 필요한 코트 수.
export function additionalNetsNeeded(tier: FacilityTier, courts: number): number {
  return Math.max(0, Math.floor(courts) - freeProNets(tier, courts));
}

export function netTotal(pronetQty: number, symmetryQty: number): number {
  return pronetQty * PRONET_PRICE + symmetryQty * SYMMETRY_NET_PRICE;
}

export type NetQuantityCheck = { ok: true } | { ok: false; error: string };

export function validateNetQuantities(
  tier: FacilityTier,
  courts: number,
  pronetQty: number,
  symmetryQty: number,
): NetQuantityCheck {
  if (!Number.isInteger(pronetQty) || !Number.isInteger(symmetryQty) || pronetQty < 0 || symmetryQty < 0) {
    return { ok: false, error: "수량은 0 이상의 정수로 입력해 주세요." };
  }
  const needed = additionalNetsNeeded(tier, courts);
  if (pronetQty + symmetryQty > needed) {
    return {
      ok: false,
      error: `추가로 필요한 네트는 ${needed}개입니다. 프로네트와 시미트리 네트의 합이 ${needed}개 이하여야 합니다. 더 필요하시면 담당자에게 문의해 주세요.`,
    };
  }
  return { ok: true };
}

export function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function freeNetPolicyText(tier: FacilityTier, courts: number): string {
  const free = freeProNets(tier, courts);
  if (tier === "pro") return `Pro Court는 코트 수만큼(최대 ${PRO_FREE_PRONET_MAX}개) 프로네트를 무상으로 지급합니다. 귀 시설은 ${free}개입니다.`;
  if (tier === "edge") return `Edge Court는 프로네트 1개를 무상으로 지급합니다. 귀 시설은 ${free}개입니다.`;
  return "Champion Court는 프로네트 무상 지급이 없으며, 파트너 할인가로 구매만 가능합니다.";
}
