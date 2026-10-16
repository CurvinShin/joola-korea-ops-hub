// 브랜드 파트너(시설) 티어 자동 계산.
//
// 규칙의 원본은 옵시디안 `06 위키/가이드라인 - 브랜드 파트너십.md` 5번 항목이다
// (2026-10-16 확정). 점수·경계값은 아래 TIER_CONFIG 한 곳에서만 바꾼다.
// 순수 함수라서 서버(신청 접수)와 브라우저(신청서 미리보기) 양쪽에서 같은 결과를 낸다.

import type { FacilityTier, KrRegion } from "@/lib/types/database.types";

export type SalesCapability = "wholesale" | "retail" | "none";
export type RegionGroup = "seoul" | "metro" | "province";

export interface TierInput {
  region: KrRegion;
  // 대관·경기가 가능한 코트 면 수
  courtsCount: number;
  // 천장 높이·앞뒤 공간이 대관·경기에 충분한지(지방 1코트 판정에 사용)
  venueSuitable: boolean;
  salesCapability: SalesCapability;
  // 딜러십 계약 + 초도 물량 구매를 마쳤는지. 신청 단계에서는 항상 false이고
  // 담당자가 확인한 뒤에만 true가 된다(자가 응답으로 도매 20점을 받지 못하게).
  wholesaleVerified: boolean;
  demoPackagePurchase: boolean;
  proNetInstalled: boolean;
  ops: {
    regularLessons: boolean;
    hostedEvents: boolean;
    monthlyUsers800: boolean;
    salesStaff: boolean;
  };
  access: {
    carOnly: boolean;
    subway10min: boolean;
    bus5min: boolean;
    residential: boolean;
    parking: boolean;
  };
  coach: {
    dupr4: boolean;
    nationalPodium: boolean;
    snsReach: boolean;
    certifiedOr3Years: boolean;
  };
}

export const TIER_CONFIG = {
  regionCourtPoints: { pro: 40, edge: 25, champion: 10, none: 0 },
  // 지역별로 각 수준이 되는 최소 코트 수. null이면 그 수준이 없다.
  regionCourtMin: {
    seoul: { pro: 2, edge: 1, champion: null },
    metro: { pro: 3, edge: 2, champion: 1 },
    province: { pro: 6, edge: 2, champion: 1 },
  },
  salesPoints: { wholesaleVerified: 20, wholesaleUnverified: 10, retail: 10, none: 0 },
  opsPoints: { regularLessons: 4, hostedEvents: 2, monthlyUsers800: 3, salesStaff: 1 },
  accessPoints: { subway10min: 4, bus5min: 2, residential: 3, parking: 1 },
  coachPoints: { dupr4: 3, nationalPodium: 3, snsReach: 2, certifiedOr3Years: 2 },
  thresholds: { pro: 70, edge: 45 },
} as const;

export const MAX_SCORE = 90;

const METRO_REGIONS: KrRegion[] = ["gyeonggi", "incheon"];

export function regionGroupOf(region: KrRegion): RegionGroup {
  if (region === "seoul") return "seoul";
  if (METRO_REGIONS.includes(region)) return "metro";
  return "province";
}

export type CourtLevel = "pro" | "edge" | "champion" | "none";

export function regionCourtLevel(region: KrRegion, courtsCount: number, venueSuitable: boolean): CourtLevel {
  if (courtsCount < 1) return "none";
  const group = regionGroupOf(region);
  const min = TIER_CONFIG.regionCourtMin[group];
  if (courtsCount >= min.pro) return "pro";
  if (courtsCount >= min.edge) return "edge";
  if (min.champion !== null && courtsCount >= min.champion) {
    // 지방 1코트는 입지·코트 품질이 받쳐 줄 때만 Champion, 아니면 브랜딩 불가.
    if (group === "province" && !venueSuitable) return "none";
    return "champion";
  }
  return "none";
}

function sumFlags<K extends string>(flags: Record<K, boolean>, points: Record<K, number>): number {
  return (Object.keys(points) as K[]).reduce((acc, k) => acc + (flags[k] ? points[k] : 0), 0);
}

export interface TierBreakdown {
  regionCourt: number;
  sales: number;
  ops: number;
  access: number;
  coach: number;
}

export interface TierResult {
  score: number;
  breakdown: TierBreakdown;
  courtLevel: CourtLevel;
  // null = 자동 판정 불가(검토 필요)
  tier: FacilityTier | null;
  proRequirementsMet: boolean;
  reviewReasons: string[];
}

export function computeTier(input: TierInput): TierResult {
  const courtLevel = regionCourtLevel(input.region, input.courtsCount, input.venueSuitable);
  const sp = TIER_CONFIG.salesPoints;
  const sales =
    input.salesCapability === "wholesale"
      ? input.wholesaleVerified
        ? sp.wholesaleVerified
        : sp.wholesaleUnverified
      : input.salesCapability === "retail"
        ? sp.retail
        : sp.none;

  const breakdown: TierBreakdown = {
    regionCourt: TIER_CONFIG.regionCourtPoints[courtLevel],
    sales,
    ops: sumFlags(input.ops, TIER_CONFIG.opsPoints),
    access: input.access.carOnly
      ? 0
      : sumFlags(
          {
            subway10min: input.access.subway10min,
            bus5min: input.access.bus5min,
            residential: input.access.residential,
            parking: input.access.parking,
          },
          TIER_CONFIG.accessPoints
        ),
    coach: sumFlags(input.coach, TIER_CONFIG.coachPoints),
  };
  const score = breakdown.regionCourt + breakdown.sales + breakdown.ops + breakdown.access + breakdown.coach;

  const proRequirementsMet =
    input.salesCapability === "wholesale" &&
    input.wholesaleVerified &&
    input.demoPackagePurchase &&
    input.proNetInstalled;

  const reviewReasons: string[] = [];
  if (courtLevel === "none") reviewReasons.push("지역×코트 수 기준 미달(브랜딩 불가 구간)");
  if (input.salesCapability === "none") reviewReasons.push("판매 불가 시설(예외 승인 대상)");
  if (regionGroupOf(input.region) === "province" && input.courtsCount === 1 && courtLevel === "champion") {
    reviewReasons.push("지방 1코트: 입지·코트 품질 담당자 확인 필요");
  }

  let tier: FacilityTier | null;
  if (courtLevel === "none" || input.salesCapability === "none") {
    tier = null;
  } else if (score >= TIER_CONFIG.thresholds.pro) {
    tier = proRequirementsMet ? "pro" : "edge";
  } else if (score >= TIER_CONFIG.thresholds.edge) {
    tier = "edge";
  } else {
    tier = "champion";
  }

  return { score, breakdown, courtLevel, tier, proRequirementsMet, reviewReasons };
}

// 신청자에게 "조건을 채우면 받을 수 있는 티어"를 안내하기 위한 계산.
// 도매를 고른 경우 딜러십 계약·초도 구매를 마쳤다고 가정하고, Pro 필수 조건도 채웠다고 본다.
export function computePotentialTier(input: TierInput): TierResult {
  return computeTier({
    ...input,
    wholesaleVerified: input.salesCapability === "wholesale",
    demoPackagePurchase: true,
    proNetInstalled: true,
  });
}

export const facilityTierLabel: Record<FacilityTier, string> = {
  pro: "Pro Court",
  edge: "Edge Court",
  champion: "Champion Court",
};
