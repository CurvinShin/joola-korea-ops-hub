import { describe, expect, it } from "vitest";
import { familyOf } from "./listing-priority";
import { isActiveStatus, matchStoreProducts, parseStoreProductRows, storeFamilyOf } from "./store-listing";

// 실제 스마트스토어 상품명(2026-10-21 상품 목록 파일)에서 가져온 예시와, 견적서 영문 제품명이 같은 제품군 키가 되는지 본다.
const PAIRS: Array<[string, string]> = [
  ["율라 JOOLA 프로5 스콜피우스 콜린 존스 16mm 피클볼 패들 라켓", "JOOLA Scorpeus Pro V Collin Johns Club Green 16mm Pickleball Paddle (Global)"],
  ["율라 JOOLA 프로5 하이페리온 벤 존스 14mm 피클볼 패들 라켓", "JOOLA Hyperion Pro V Ben Johns Bolt Blue 14mm Pickleball Paddle (Global)"],
  ["율라 JOOLA 프로5 그라프 16mm 피클볼 패들 라켓", "JOOLA Graf Pro V Steffi Graf Seaside Green 16mm Pickleball Paddle (Global)"],
  ["율라 JOOLA 프로5 페르세우스 랠리 로켓 팝스 피클볼 패들 라켓", "JOOLA Perseus Pro V Rally Rocket 16mm Pickleball Paddle (DTC)"],
  ["율라 JOOLA 프로5 코스모스 타이슨 맥거핀 14mm 하이브리드 피클볼 패들 라켓", "JOOLA Kosmos Pro V Tyson McGuffin Surge Green 14mm Pickleball Paddle (Global)"],
  ["율라 JOOLA 애거시 프로5 워시드 인디고 데님 패들 14mm 피클볼 라켓", "JOOLA Agassi Pro V Andre Agassi Washed Indigo 14mm Pickleball Paddle (DTC)"],
  ["율라 JOOLA 하이페리온 비전 16mm 블루 피클볼 패들 라켓", "JOOLA Hyperion Vision 16mm - Storm - Blue Pickleball Paddle (DTC)"],
  ["율라 JOOLA 파워 FX 페르세우스 16mm 피클볼 패들 라켓 폼패들", "JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)"],
  ["율라 JOOLA 더블 비전 스콜피우스 16mm 피클볼 패들 라켓", "Double Vision Scorpeus 16mm Pickleball Paddle"],
  ["율라 히트 비전 애거시 16mm 피클볼 패들 라켓", "Heat Vision Agassi 16mm Pickleball Paddle"],
  ["율라 JOOLA 피클볼 패들 커버 범용 네오프렌 라켓", "JOOLA Universal Neoprene Cover - Ready Always"],
  ["율라 JOOLA 드로스트링 슬링백 블랙 피클볼 패들 라켓 가방", "JOOLA Drawstring Sling Bag (Black)"],
  ["율라 JOOLA 드로스트링 백팩 블랙 피클볼 패들 라켓 가방", "JOOLA Drawstring Backpack (Black)"],
  ["율라 JOOLA 프로 백팩 블랙 피클볼 패들 라켓 가방", "JOOLA PRO BACKPACK (Black /JOOLA Yellow)"],
  ["율라 JOOLA 팀 앵클 삭스 스포츠 양말 단목 테니스 배드민턴 운동 러닝 런닝", "Team Ankle Socks Black"],
  ["율라 JOOLA 팀 크루 삭스 스포츠 양말 장목 테니스 배드민턴 운동 러닝 런닝", "Team Crew Socks White"],
  ["율라 JOOLA 여자 프린티드 피클볼 스코트 화이트", "300559, Women's Pickleball Skort (15 \"), Black, XS"],
  ["율라 JOOLA R4LLY 랠리 피클볼 남자 운동화 블랙 피클볼화 인도어화", "Men's FUNKSH1n_PB: R4L LY - Black"],
  ["율라 JOOLA R4LLY 랠리 피클볼 여자 운동화 화이트 피클볼화 인도어화", "Women's FUNKSH1n_PB: R4LLY - White"],
  ["율라 JOOLA 워드마크 스포츠타올 L 건식 수건 수영장 등산 운동 헬스장 러닝 땀수건", "JOOLA Large Wordmark Towel (Black/JOOLA Yellow) - OSFA"],
  ["율라 JOOLA 워드마크 스포츠타올 S 건식 수건 수영장 등산 운동 헬스장 러닝 땀수건", "JOOLA Small Wordmark Towel (Club Green/Tropic Tide) - OSFA"],
  ["율라 JOOLA 트레이너 피클볼 패들 4개 세트 라켓", "600011 Trainer Paddle Set"],
  ["율라 JOOLA 피클볼 공 세트(3개입) 피클볼공 실내용", "JOOLA Primo Indoor Plus Pickleball (3 Pack)"],
];

describe("storeFamilyOf — 스마트스토어 한글 상품명 ↔ 견적서 제품군", () => {
  for (const [store, quote] of PAIRS) {
    it(`${store.slice(0, 28)}…`, () => {
      const s = storeFamilyOf(store);
      expect(s).not.toBeNull();
      expect(s!.key).toBe(familyOf(quote).key);
    });
  }

  it("프로4(Pro IV)와 프로5(Pro V)를 구분한다", () => {
    expect(storeFamilyOf("율라 JOOLA 프로4 스콜피우스 16mm 피클볼 패들")!.label).toBe("Scorpeus Pro IV");
    expect(storeFamilyOf("율라 JOOLA 프로5 스콜피우스 16mm 피클볼 패들")!.label).toBe("Scorpeus Pro V");
  });

  it("프로4·3S 듀얼·애거시 시리즈·HC-40·품절 상품도 맞춘다", () => {
    expect(storeFamilyOf("율라 JOOLA 프로4 페르세우스 벤 존스 14mm 피클볼 패들 라켓")!.label).toBe("Perseus Pro IV");
    expect(storeFamilyOf("율라 JOOLA 프로4 아시아 컬러웨이 매그너스 타이슨 맥거핀 14mm 피클볼 패들 라켓")!.label).toBe("Magnus Pro IV");
    expect(storeFamilyOf("율라 X 레이저 JOOLA 프로4 페르세우스 레이저 피클볼 패들 라켓")!.label).toBe("Perseus Pro IV");
    expect(storeFamilyOf("율라 JOOLA 프로 3S 듀얼 매그너스 타이슨 맥거핀 14mm 피클볼 패들 라켓")!.label).toBe("3S Dual");
    expect(storeFamilyOf("율라 JOOLA 애거시 시리즈 애거시 프로 14mm 피클볼 패들 라켓")!.label).toBe("Agassi Pro IV");
    expect(storeFamilyOf("율라 JOOLA 애거시 시리즈 그라프 프로 16mm 피클볼 패들 라켓")!.label).toBe("Graf Pro IV");
    expect(storeFamilyOf("율라 JOOLA 피클볼 공 세트(100구) HC-40 하드코트용 실외용 피클볼공 벌크")!.label).toBe("HC-40");
    expect(isActiveStatus("품절")).toBe(true); // 품절은 스토어에 등록은 되어 있는 상태
  });

  it("세대를 알 수 없는 패들(세트 등)은 맞추지 않는다", () => {
    expect(storeFamilyOf("율라 JOOLA (세트) 프로 3S 매그너스 피클볼 패들 1개+전용 커버 1개")).toBeNull();
  });
});

describe("parseStoreProductRows / matchStoreProducts", () => {
  it("상품명·판매상태 열만 읽는다", () => {
    const r = parseStoreProductRows([{ 상품명: " 율라  JOOLA 프로5 그라프 16mm ", 판매상태: "판매중", 판매가: 1 }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.products).toEqual([{ name: "율라 JOOLA 프로5 그라프 16mm", status: "판매중" }]);
  });

  it("상품명 열이 없으면 오류를 돌려준다", () => {
    expect(parseStoreProductRows([{ 이름: "x" }]).ok).toBe(false);
  });

  it("판매종료·삭제 상태는 등록된 제품으로 세지 않는다", () => {
    expect(isActiveStatus("판매중")).toBe(true);
    expect(isActiveStatus("판매종료")).toBe(false);
    const m = matchStoreProducts([
      { name: "율라 JOOLA 프로5 그라프 16mm 피클볼 패들", status: "판매중" },
      { name: "율라 JOOLA 프로5 애거시 14mm 피클볼 패들", status: "판매종료" },
      { name: "율라 JOOLA 아무 상품", status: "판매중" },
    ]);
    expect(m.matched.map((x) => x.label)).toEqual(["Graf Pro V"]);
    expect(m.unmatched).toEqual(["율라 JOOLA 아무 상품"]);
    expect(m.ignoredCount).toBe(1);
    expect(m.productCount).toBe(2);
  });
});
