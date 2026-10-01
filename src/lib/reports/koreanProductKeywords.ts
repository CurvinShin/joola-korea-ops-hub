// 네이버 상품명(한글, 선수/라인명을 한글 발음대로 표기)에서 영문 상품 카탈로그
// (products.name)를 찾을 때 쓸 키워드 매핑.
//
// "매핑 추가" 화면에서, 사람이 매번 SKU/영문명을 기억해서 타이핑하는 대신
// 후보 상품 목록을 보여주고 고르기만 하면 되게 하려고 만들었다. 네이버
// 상품명에 아래 한글 키워드가 보이면, 매칭되는 영문 키워드로 products.name을
// 검색해 후보로 띄운다. JOOLA 피클볼 라인업(선수명/모델명)은 종류가
// 한정적이라 이런 고정 사전으로도 충분히 커버된다 — 새 라인업이 나오면 여기에
// 한 줄만 추가하면 된다.
export const KOREAN_PRODUCT_KEYWORDS: { ko: string; en: string }[] = [
  // 선수/라인명
  { ko: "애거시", en: "Agassi" },
  { ko: "그라프", en: "Graf" },
  { ko: "하이페리온", en: "Hyperion" },
  { ko: "페르세우스", en: "Perseus" },
  { ko: "스콜피우스", en: "Scorpeus" },
  { ko: "코스모스", en: "Kosmos" },
  { ko: "매그너스", en: "Magnus" },
  { ko: "벤 존스", en: "Ben Johns" },
  { ko: "벤존스", en: "Ben Johns" },
  { ko: "타이슨 맥거핀", en: "Tyson McGuffin" },
  { ko: "맥거핀", en: "McGuffin" },
  { ko: "스탁스루드", en: "Staksrud" },

  // 패들 라인/시리즈
  { ko: "더블 비전", en: "Double Vision" },
  { ko: "더블비전", en: "Double Vision" },
  { ko: "히트 비전", en: "Heat Vision" },
  { ko: "히트비전", en: "Heat Vision" },
  { ko: "비전", en: "Vision" },
  { ko: "프로5", en: "Pro V" },
  { ko: "프로 5", en: "Pro V" },
  { ko: "프로4", en: "Pro IV" },
  { ko: "프로 4", en: "Pro IV" },
  { ko: "3s", en: "3S" },
  { ko: "파워fx", en: "PowerFX" },
  { ko: "파워 fx", en: "PowerFX" },
  { ko: "챔피언", en: "Champion" },

  // 공/액세서리
  { ko: "hc-40", en: "HC-40" },
  { ko: "피클볼 공", en: "Ball" },
  { ko: "피클볼공", en: "Ball" },
  { ko: "백팩", en: "Backpack" },
  { ko: "슬링백", en: "Sling Bag" },
  { ko: "삭스", en: "Socks" },
  { ko: "타올", en: "Towel" },
  { ko: "키체인", en: "Keychain" },
  { ko: "모자", en: "Cap" },
  { ko: "슈즈", en: "Shoes" },
  { ko: "세트", en: "Set" },
];

// 네이버 한글 상품명에서 매칭되는 영문 키워드들을 뽑아낸다(중복 제거). 못
// 찾으면 빈 배열 — 이 경우 호출 쪽에서 수동 검색으로 넘어가면 된다.
export function extractEnglishKeywords(koreanName: string): string[] {
  const lower = koreanName.toLowerCase();
  const found = new Set<string>();
  for (const { ko, en } of KOREAN_PRODUCT_KEYWORDS) {
    if (lower.includes(ko.toLowerCase())) {
      found.add(en);
    }
  }
  return Array.from(found);
}
