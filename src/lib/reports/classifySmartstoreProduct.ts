// 스마트스토어(네이버) 상품명 → dealer_quote_items(0028)와 같은 카테고리 체계로
// 분류하는 규칙 기반 분류기.
//
// 딜러 견적서는 Claude가 PDF 175건을 직접 읽고 수작업으로 분류했지만,
// 스마트스토어 주문조회 엑셀은 사용자가 앞으로도 계속 새 파일을 올릴 것이므로
// (최신화 버튼) 매번 수작업 없이 자동 분류되는 코드가 필요하다. 2026-09-30
// 기준 실제 판매된 66개 상품명 전체로 검증했고, 하나도 "미분류"로 빠지지
// 않았다. 다만 앞으로 새로운 라인업 상품명이 나오면 이 규칙에 없는 키워드가
// 등장할 수 있으니, 분류에 실패하면 "미분류"로 남기고(무리하게 추측하지
// 않고) 화면에서 바로 보이게 해서 나중에 규칙을 보강할 수 있게 한다.
import { TOP_CATEGORIES, PADDLE_SUBS } from "./productCategoryReport";

export type TopCategory = (typeof TOP_CATEGORIES)[number] | "미분류";
export type PaddleSub = (typeof PADDLE_SUBS)[number];

export interface ClassifiedProduct {
  category: TopCategory;
  subcategory: PaddleSub | null;
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function classifySmartstoreProduct(productName: string): ClassifiedProduct {
  const n = productName.toLowerCase();

  if (includesAny(n, ["슈즈", "shoes"])) {
    return { category: "신발", subcategory: null };
  }

  if (
    includesAny(n, [
      "티셔츠",
      "t-shirt",
      "긴팔티",
      "long sleeve",
      "반팔티",
      "short sleeve",
      "후드티",
      "hoodie",
      "스코트",
      "skort",
      "반바지",
      "woven short",
    ])
  ) {
    return { category: "의류", subcategory: null };
  }

  if (
    includesAny(n, [
      "백팩",
      "backpack",
      "슬링백",
      "삭스",
      "socks",
      "타올",
      "towel",
      "키체인",
      "keychain",
      "모자",
      "cap)",
    ])
  ) {
    return { category: "악세사리", subcategory: null };
  }

  if (includesAny(n, ["피클볼 공", "피클볼공"])) {
    return { category: "공", subcategory: null };
  }

  // 여기부터는 "패들" 문자열이 없어도(예: 스페셜 에디션 표기) 라인업 키워드만
  // 보이면 패들로 분류한다 — 실제 상품명 중 일부는 "패들"이라는 단어 없이
  // 모델명만 쓰는 경우가 있었다.
  if (includesAny(n, ["프로5", "프로 5", "pro v", "pro5"])) {
    return { category: "패들", subcategory: "프로V" };
  }
  if (includesAny(n, ["프로4", "프로 4", "pro iv", "pro4"])) {
    return { category: "패들", subcategory: "프로IV" };
  }
  if (includesAny(n, ["비전", "vision"])) {
    return { category: "패들", subcategory: "비전" };
  }
  if (includesAny(n, ["3s"])) {
    return { category: "패들", subcategory: "3S" };
  }
  if (includesAny(n, ["파워 fx", "power fx", "powerfx"])) {
    return { category: "패들", subcategory: "PowerFX" };
  }
  if (includesAny(n, ["애거시", "그라프", "agassi", "graf"])) {
    return { category: "패들", subcategory: "챔피언" };
  }

  if (includesAny(n, ["패들", "paddle", "mm"])) {
    if (includesAny(n, ["세트", "set"])) {
      return { category: "패들", subcategory: "기타(세트)" };
    }
    return { category: "패들", subcategory: "기타(엔트리)" };
  }

  return { category: "미분류", subcategory: null };
}
