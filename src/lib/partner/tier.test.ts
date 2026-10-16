import { describe, expect, it } from "vitest";
import { computePotentialTier, computeTier, regionCourtLevel, type TierInput } from "./tier";

// 규칙 원본: 옵시디안 `06 위키/가이드라인 - 브랜드 파트너십.md` 5번(2026-10-16 확정).

const none = {
  ops: { regularLessons: false, hostedEvents: false, monthlyUsers800: false, salesStaff: false },
  access: { carOnly: false, subway10min: false, bus5min: false, residential: false, parking: false },
  coach: { dupr4: false, nationalPodium: false, snsReach: false, certifiedOr3Years: false },
};

const all = {
  ops: { regularLessons: true, hostedEvents: true, monthlyUsers800: true, salesStaff: true },
  access: { carOnly: false, subway10min: true, bus5min: true, residential: true, parking: true },
  coach: { dupr4: true, nationalPodium: true, snsReach: true, certifiedOr3Years: true },
};

function input(overrides: Partial<TierInput>): TierInput {
  return {
    region: "seoul",
    courtsCount: 2,
    venueSuitable: true,
    salesCapability: "retail",
    wholesaleVerified: false,
    demoPackagePurchase: false,
    proNetInstalled: false,
    ...none,
    ...overrides,
  };
}

describe("지역×코트 수 수준", () => {
  it("서울: 2코트 이상 Pro, 1코트 Edge", () => {
    expect(regionCourtLevel("seoul", 2, true)).toBe("pro");
    expect(regionCourtLevel("seoul", 1, true)).toBe("edge");
  });
  it("경기·인천: 3코트 Pro, 2코트 Edge, 1코트 Champion", () => {
    expect(regionCourtLevel("gyeonggi", 3, true)).toBe("pro");
    expect(regionCourtLevel("incheon", 2, true)).toBe("edge");
    expect(regionCourtLevel("gyeonggi", 1, false)).toBe("champion");
  });
  it("지방: 6코트 Pro, 2~5코트 Edge, 1코트는 공간이 충분할 때만 Champion", () => {
    expect(regionCourtLevel("busan", 6, true)).toBe("pro");
    expect(regionCourtLevel("busan", 5, true)).toBe("edge");
    expect(regionCourtLevel("busan", 2, true)).toBe("edge");
    expect(regionCourtLevel("jeonbuk", 1, true)).toBe("champion");
    expect(regionCourtLevel("jeonbuk", 1, false)).toBe("none");
  });
  it("코트가 없으면 브랜딩 불가", () => {
    expect(regionCourtLevel("seoul", 0, true)).toBe("none");
  });
});

describe("점수", () => {
  it("만점은 90점(도매 확인 + 모든 항목)", () => {
    const r = computeTier(
      input({ ...all, salesCapability: "wholesale", wholesaleVerified: true, demoPackagePurchase: true, proNetInstalled: true })
    );
    expect(r.score).toBe(90);
    expect(r.tier).toBe("pro");
  });
  it("도매는 확인 전 10점, 확인 후 20점", () => {
    expect(computeTier(input({ salesCapability: "wholesale" })).breakdown.sales).toBe(10);
    expect(computeTier(input({ salesCapability: "wholesale", wholesaleVerified: true })).breakdown.sales).toBe(20);
  });
  it("개인 차량으로만 갈 수 있으면 접근성 전체 0점", () => {
    const r = computeTier(input({ access: { ...all.access, carOnly: true } }));
    expect(r.breakdown.access).toBe(0);
  });
  it("운영 능력 만점 10점(정기 레슨 4 + 대회 2 + 이용자 3 + 세일즈 인력 1)", () => {
    expect(computeTier(input({ ops: all.ops })).breakdown.ops).toBe(10);
  });
});

describe("티어 판정", () => {
  it("70점 이상이어도 Pro 필수 조건이 없으면 Edge", () => {
    const r = computeTier(input({ ...all, salesCapability: "wholesale", wholesaleVerified: true }));
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.proRequirementsMet).toBe(false);
    expect(r.tier).toBe("edge");
  });
  it("45~69점은 Edge, 45점 미만은 Champion", () => {
    // 서울 1코트(25) + 도소매(10) + 운영 10 = 45
    expect(computeTier(input({ courtsCount: 1, ops: all.ops })).tier).toBe("edge");
    // 서울 1코트(25) + 도소매(10) = 35
    expect(computeTier(input({ courtsCount: 1 })).tier).toBe("champion");
  });
  it("판매 불가는 점수와 상관없이 검토 필요", () => {
    const r = computeTier(input({ ...all, salesCapability: "none" }));
    expect(r.tier).toBeNull();
    expect(r.reviewReasons).toContain("판매 불가 시설(예외 승인 대상)");
  });
  it("지방 1코트 + 공간 부족은 검토 필요", () => {
    const r = computeTier(input({ region: "jeonnam", courtsCount: 1, venueSuitable: false }));
    expect(r.tier).toBeNull();
  });
  it("지방 1코트 Champion은 담당자 확인 사유를 남긴다", () => {
    const r = computeTier(input({ region: "jeonnam", courtsCount: 1, venueSuitable: true }));
    expect(r.tier).toBe("champion");
    expect(r.reviewReasons).toContain("지방 1코트: 입지·코트 품질 담당자 확인 필요");
  });
});

describe("신청 단계 예상 티어와 조건 충족 시 티어", () => {
  it("서울 2코트·도매 신청자는 지금 Edge, 조건을 채우면 Pro", () => {
    const i = input({ ...all, salesCapability: "wholesale" });
    expect(computeTier(i).tier).toBe("edge");
    expect(computePotentialTier(i).tier).toBe("pro");
  });
  it("도소매는 Pro 필수 조건(도매)을 채울 수 없어 조건 충족 시에도 Edge", () => {
    const i = input({ ...all, salesCapability: "retail" });
    expect(computePotentialTier(i).tier).toBe("edge");
  });
});
