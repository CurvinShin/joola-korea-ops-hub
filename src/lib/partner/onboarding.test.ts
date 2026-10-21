import { describe, expect, it } from "vitest";
import {
  PRONET_PRICE,
  SYMMETRY_NET_PRICE,
  additionalNetsNeeded,
  freeProNets,
  netTotal,
  validateNetQuantities,
} from "./onboarding";

describe("freeProNets", () => {
  it("Pro는 코트 수만큼, 최대 5개", () => {
    expect(freeProNets("pro", 2)).toBe(2);
    expect(freeProNets("pro", 5)).toBe(5);
    expect(freeProNets("pro", 6)).toBe(5);
  });

  it("Edge는 1개(코트가 1개 이상일 때)", () => {
    expect(freeProNets("edge", 3)).toBe(1);
    expect(freeProNets("edge", 1)).toBe(1);
    expect(freeProNets("edge", 0)).toBe(0);
  });

  it("Champion은 없음", () => {
    expect(freeProNets("champion", 4)).toBe(0);
  });
});

describe("additionalNetsNeeded", () => {
  it("무상 지급분을 뺀 나머지 코트 수", () => {
    expect(additionalNetsNeeded("pro", 6)).toBe(1);
    expect(additionalNetsNeeded("pro", 4)).toBe(0);
    expect(additionalNetsNeeded("edge", 3)).toBe(2);
    expect(additionalNetsNeeded("champion", 3)).toBe(3);
  });
});

describe("netTotal", () => {
  it("프로네트 110만원, 시미트리 33만원(부가세 포함)", () => {
    expect(PRONET_PRICE).toBe(1_100_000);
    expect(SYMMETRY_NET_PRICE).toBe(330_000);
    expect(netTotal(2, 1)).toBe(2_530_000);
    expect(netTotal(0, 0)).toBe(0);
  });
});

describe("validateNetQuantities", () => {
  it("필요한 수량 이내면 통과", () => {
    expect(validateNetQuantities("edge", 3, 1, 1).ok).toBe(true);
    expect(validateNetQuantities("champion", 2, 0, 0).ok).toBe(true);
  });

  it("필요한 수량을 넘으면 오류", () => {
    const r = validateNetQuantities("edge", 3, 2, 1);
    expect(r.ok).toBe(false);
  });

  it("무상 지급분으로 충분하면 추가 구매 불가", () => {
    expect(validateNetQuantities("pro", 3, 1, 0).ok).toBe(false);
  });

  it("음수·소수는 오류", () => {
    expect(validateNetQuantities("champion", 3, -1, 0).ok).toBe(false);
    expect(validateNetQuantities("champion", 3, 1.5, 0).ok).toBe(false);
  });
});
