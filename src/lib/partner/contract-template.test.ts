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
    expect(edge).not.toContain("개점 패들 지급은 없습니다");

    expect(champion).toContain("개점 패들 지급은 없습니다");
    expect(champion).toContain("3,000만원 이상");
    expect(champion).toContain("프로네트 무상 지급은 없으며");
    expect(champion).not.toContain("4종 8개");
  });

  it("네트 구매 수량과 금액이 들어간다 (프로네트 1 + 시미트리 1 = 143만원)", () => {
    const text = contractPlainText(renderContract({ ...base, pronetPurchaseQty: 1, symmetryPurchaseQty: 1 }));
    expect(text).toContain("프로네트 1개, 시미트리 네트 1개");
    expect(text).toContain("1,430,000원(부가세 포함)");
  });

  it("구매할 네트가 없으면 수량 조항을 넣지 않고 번호 참조를 맞춘다", () => {
    const none = contractPlainText(renderContract({ ...base, pronetPurchaseQty: 0, symmetryPurchaseQty: 0 }));
    expect(none).not.toContain("구매하기로 한 수량");
    expect(none).not.toContain("필요한 네트는");
    expect(none).toContain("제4조 제4항의 임시 네트 사용");
    const some = contractPlainText(renderContract(base));
    expect(some).toContain("구매하기로 한 수량");
    expect(some).toContain("제4조 제5항의 임시 네트 사용");
  });

  it("계약서 문장은 존댓말(합니다체)로 끝난다", () => {
    const text = contractPlainText(renderContract(base));
    expect(text).not.toMatch(/(한다|된다|있다|없다|이다|않는다|진다)\.(\s|$)/);
    expect(text).toContain("프로네트는 주문 후 도착까지 최대 2개월이 소요될 수 있습니다.");
  });

  it("판매 실적은 의무가 아니라 등급 상향과 연계된다고만 안내한다", () => {
    const text = contractPlainText(renderContract(base));
    expect(text).toContain("주된 목적은 JOOLA 브랜드 홍보에 있습니다");
    expect(text).not.toContain("지속적으로 연결하기 위해 노력");
  });

  it("다른 브랜드 제품 사용 금지는 대표·코치 대상이며 앰버서더는 예외", () => {
    const text = contractPlainText(renderContract(base));
    expect(text).toContain("시설의 대표와 코치는 다른 브랜드 제품(패들 등)을 사용하지 않습니다");
    expect(text).toContain("앰버서더인 대표나 코치가 그 브랜드의 제품을 사용하는 것은 허용합니다");
  });

  it("서명 지문용 평문은 같은 입력이면 항상 같다", () => {
    expect(contractPlainText(renderContract(base))).toBe(contractPlainText(renderContract(base)));
  });
});
