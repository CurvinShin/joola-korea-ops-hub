import { describe, expect, it } from "vitest";
import { contractPlainText, renderContract, type ContractInput } from "./contract-template";

const base: ContractInput = {
  facilityName: "테스트시설",
  address: "테스트시 테스트로 1",
  businessNumber: "000-00-00000",
  representativeName: "홍길동",
  tier: "edge",
  courts: 3,
  pronetPurchaseQty: 1,
  symmetryPurchaseQty: 1,
};

describe("renderContract", () => {
  it("남은 변수 표시({ })가 없다", () => {
    for (const tier of ["pro", "edge", "champion"] as const) {
      const text = contractPlainText(renderContract({ ...base, tier }));
      expect(text).not.toMatch(/[{}]/);
    }
  });

  it("신청자 정보가 들어간다", () => {
    const text = contractPlainText(renderContract(base));
    expect(text).toContain("테스트시설");
    expect(text).toContain("000-00-00000");
    expect(text).toContain("홍길동");
    expect(text).toContain("Edge Court");
  });

  it("기본 지급품은 코트 수 공식으로 계산한다 (3코트: 공 300, 볼캐디 2, 배리어 9)", () => {
    const text = contractPlainText(renderContract({ ...base, courts: 3 }));
    expect(text).toContain("공 300개, 볼캐디 2개, 배리어 9개");
  });

  it("등급별 문구는 해당 등급 것만 들어간다", () => {
    const pro = contractPlainText(renderContract({ ...base, tier: "pro", courts: 6 }));
    const edge = contractPlainText(renderContract({ ...base, tier: "edge" }));
    const champion = contractPlainText(renderContract({ ...base, tier: "champion" }));

    expect(pro).toContain("8종 16개");
    expect(pro).toContain("무상 수량은 5개");
    expect(pro).toContain("1억원 이상");
    expect(pro).not.toContain("4종 8개");

    expect(edge).toContain("4종 8개");
    expect(edge).toContain("5,000만원 이상");
    expect(edge).not.toContain("8종 16개");
    expect(edge).not.toContain("개점 패들 지급은 없다");

    expect(champion).toContain("개점 패들 지급은 없다");
    expect(champion).toContain("3,000만원 이상");
    expect(champion).toContain("프로네트 무상 지급은 없으며");
    expect(champion).not.toContain("4종 8개");
  });

  it("네트 구매 수량과 금액이 들어간다 (프로네트 1 + 시미트리 1 = 143만원)", () => {
    const text = contractPlainText(renderContract({ ...base, pronetPurchaseQty: 1, symmetryPurchaseQty: 1 }));
    expect(text).toContain("프로네트 1개, 시미트리 네트 1개");
    expect(text).toContain("1,430,000원(부가세 포함)");
  });

  it("구매할 네트가 없으면 없다고 쓴다", () => {
    const text = contractPlainText(renderContract({ ...base, pronetPurchaseQty: 0, symmetryPurchaseQty: 0 }));
    expect(text).toContain("추가로 구매하기로 한 네트는 없다");
  });

  it("다른 브랜드 제품 사용 금지는 대표·코치 대상이며 앰버서더는 예외", () => {
    const text = contractPlainText(renderContract(base));
    expect(text).toContain("시설의 대표와 코치는 다른 브랜드 제품(패들 등)을 사용하지 않는다");
    expect(text).toContain("앰버서더인 대표나 코치가 그 브랜드의 제품을 사용하는 것은 허용한다");
  });

  it("서명 지문용 평문은 같은 입력이면 항상 같다", () => {
    expect(contractPlainText(renderContract(base))).toBe(contractPlainText(renderContract(base)));
  });
});
