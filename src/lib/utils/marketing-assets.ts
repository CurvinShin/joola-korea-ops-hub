// 마케팅 에셋 목록을 관리자/딜러 화면이 같이 쓰는 도우미.

export type MarketingAssetRow = {
  id: string;
  title: string;
  category: string;
  url: string;
  description: string | null;
  audience: "internal" | "dealers";
  sort_order: number;
};

/** 자주 쓰는 분류(입력창 추천용). 목록에는 실제 입력된 분류가 그대로 묶여 나온다. */
export const ASSET_CATEGORY_SUGGESTIONS = ["제품 이미지", "브로셔·카탈로그", "로고·브랜드 가이드", "영상", "SNS 콘텐츠", "기타"];

export const ASSET_AUDIENCE_LABEL: Record<string, string> = {
  internal: "내부용",
  dealers: "딜러 공개",
};

/** 분류별로 묶는다(분류는 추천 순서 → 나머지 가나다 순). */
export function groupAssetsByCategory(rows: MarketingAssetRow[]): { category: string; items: MarketingAssetRow[] }[] {
  const map = new Map<string, MarketingAssetRow[]>();
  for (const r of rows) {
    const list = map.get(r.category) ?? [];
    list.push(r);
    map.set(r.category, list);
  }
  const rank = (c: string) => {
    const i = ASSET_CATEGORY_SUGGESTIONS.indexOf(c);
    return i === -1 ? 999 : i;
  };
  return [...map.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], "ko"))
    .map(([category, items]) => ({ category, items }));
}

/** http(s) 링크만 허용한다. 주소 앞에 http가 없으면 https를 붙인다. 형식이 틀리면 null. */
export function normalizeAssetUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
