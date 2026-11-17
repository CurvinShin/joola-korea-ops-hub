import { describe, expect, it } from "vitest";
import { dealerOrderDeadline, promoPhase, validatePromoDates } from "./promo-pricing";

// 2026 블랙프라이데이: 기간 11/2~11/15, 딜러 주문 마감 11/13
const bf = { active: true, starts_on: "2026-11-02", ends_on: "2026-11-15", dealer_order_until: "2026-11-13" };

describe("dealerOrderDeadline", () => {
  it("마감일이 있으면 마감일", () => {
    expect(dealerOrderDeadline("2026-11-15", "2026-11-13")).toBe("2026-11-13");
  });
  it("마감일이 비어 있으면 종료일", () => {
    expect(dealerOrderDeadline("2026-11-15", null)).toBe("2026-11-15");
    expect(dealerOrderDeadline("2026-11-15", undefined)).toBe("2026-11-15");
    expect(dealerOrderDeadline("2026-11-15", "")).toBe("2026-11-15");
  });
});

describe("promoPhase", () => {
  it("블프: 시작 전 예정, 11/2~11/13 진행중, 11/14~11/15 딜러 주문 마감, 11/16부터 종료", () => {
    expect(promoPhase(bf, "2026-11-01")).toBe("upcoming");
    expect(promoPhase(bf, "2026-11-02")).toBe("ordering");
    expect(promoPhase(bf, "2026-11-13")).toBe("ordering");
    expect(promoPhase(bf, "2026-11-14")).toBe("orderClosed");
    expect(promoPhase(bf, "2026-11-15")).toBe("orderClosed");
    expect(promoPhase(bf, "2026-11-16")).toBe("ended");
  });
  it("마감일이 없으면 종료일까지 진행중", () => {
    const p = { ...bf, dealer_order_until: null };
    expect(promoPhase(p, "2026-11-15")).toBe("ordering");
    expect(promoPhase(p, "2026-11-16")).toBe("ended");
  });
  it("비활성이면 날짜와 관계없이 비활성", () => {
    expect(promoPhase({ ...bf, active: false }, "2026-11-05")).toBe("inactive");
  });
});

describe("validatePromoDates", () => {
  it("정상 범위는 통과", () => {
    expect(validatePromoDates("2026-11-02", "2026-11-15", "2026-11-13")).toBeNull();
    expect(validatePromoDates("2026-11-02", "2026-11-15", null)).toBeNull();
    expect(validatePromoDates("2026-11-02", "2026-11-15", "2026-11-02")).toBeNull();
    expect(validatePromoDates("2026-11-02", "2026-11-15", "2026-11-15")).toBeNull();
  });
  it("종료일이 시작일보다 빠르면 거부", () => {
    expect(validatePromoDates("2026-11-15", "2026-11-02", null)).toMatch("종료일");
  });
  it("마감일이 기간 밖이면 거부", () => {
    expect(validatePromoDates("2026-11-02", "2026-11-15", "2026-11-16")).toMatch("딜러 주문 마감일");
    expect(validatePromoDates("2026-11-02", "2026-11-15", "2026-11-01")).toMatch("딜러 주문 마감일");
  });
});
