// JOOLA 딜러 세그멘테이션 기준 (HQ APAC 분류 체계 그대로 반영).
// Category → Sub Category → (있는 경우만) Sub Detail 3단계 구조이며,
// Online/Offline은 사용자가 고르는 값이 아니라 각 리프(leaf) 조합에
// 이미 정해져 있는 참고 정보라 여기 상수에만 들어있다.
//
// 참고: 이 체계는 기존 dealers.classification(플래그십/일반/온라인전용/총판)을
// 화면 표시상 대체한다. classification 컬럼 자체는 DB에 그대로 남아있고
// (다른 곳에서 참조하지 않음), 폼에서는 항상 기존 값을 그대로 유지해서
// 제출한다 — 이 세그먼트 3개 필드(segment_category/subcategory/detail)가
// 실질적인 새 분류 기준이다.

export type OnlineOffline = "Online" | "B&M" | "Omni";

export interface SegmentDetail {
  detail: string;
  onlineOffline: OnlineOffline;
}

export interface SegmentSubCategory {
  subCategory: string;
  // Sub Category 단계에서 바로 끝나는 경우(Sub Detail 없음)에만 존재.
  onlineOffline?: OnlineOffline;
  // Sub Detail 단계가 있는 경우에만 존재.
  details?: SegmentDetail[];
}

export interface SegmentCategory {
  category: string;
  // Distributor / Sub Dealers처럼 Category 단계에서 바로 끝나는 경우 존재.
  onlineOffline?: OnlineOffline;
  subCategories?: SegmentSubCategory[];
}

export const DEALER_SEGMENTS: SegmentCategory[] = [
  {
    category: "DTC",
    subCategories: [
      { subCategory: "Joola Website", onlineOffline: "Online" },
      { subCategory: "Joola B&M", onlineOffline: "B&M" },
      { subCategory: "Joola On-site", onlineOffline: "B&M" },
    ],
  },
  {
    category: "E-Commerce",
    subCategories: [
      { subCategory: "Global E-commerce", onlineOffline: "Online" },
      { subCategory: "National E-commerce", onlineOffline: "Online" },
      { subCategory: "Amazon", onlineOffline: "Online" },
    ],
  },
  {
    category: "Sporting Goods",
    subCategories: [
      { subCategory: "Sport Only", onlineOffline: "Omni" },
      { subCategory: "DSG", onlineOffline: "Omni" },
    ],
  },
  {
    category: "Mass Merchant",
    subCategories: [
      { subCategory: "Department Store", onlineOffline: "Omni" },
      { subCategory: "General", onlineOffline: "Omni" },
    ],
  },
  {
    category: "Speciality",
    subCategories: [
      {
        subCategory: "Sport Speciality",
        details: [
          { detail: "Regional", onlineOffline: "Omni" },
          { detail: "Local", onlineOffline: "Omni" },
          { detail: "Online", onlineOffline: "Online" },
        ],
      },
      {
        subCategory: "Sport Facility",
        details: [
          { detail: "Global", onlineOffline: "B&M" },
          { detail: "National", onlineOffline: "B&M" },
          { detail: "Regional", onlineOffline: "B&M" },
          { detail: "Local", onlineOffline: "B&M" },
        ],
      },
      {
        subCategory: "Green Grass",
        details: [{ detail: "Country Clubs", onlineOffline: "B&M" }],
      },
      { subCategory: "Mono-Brand", onlineOffline: "B&M" },
    ],
  },
  {
    category: "Institution",
    subCategories: [
      {
        subCategory: "Organizations / Associations",
        details: [
          { detail: "National", onlineOffline: "B&M" },
          { detail: "Regional", onlineOffline: "B&M" },
          { detail: "Local", onlineOffline: "B&M" },
        ],
      },
      {
        subCategory: "School",
        details: [
          { detail: "National", onlineOffline: "B&M" },
          { detail: "Regional", onlineOffline: "B&M" },
          { detail: "Local", onlineOffline: "B&M" },
        ],
      },
    ],
  },
  {
    category: "Distributor / Sub Dealers",
    onlineOffline: "Omni",
  },
];

export function findCategory(category: string | null | undefined) {
  return DEALER_SEGMENTS.find((c) => c.category === category);
}

export function findSubCategory(category: string | null | undefined, subCategory: string | null | undefined) {
  return findCategory(category)?.subCategories?.find((s) => s.subCategory === subCategory);
}

export function getOnlineOffline(
  category: string | null | undefined,
  subCategory: string | null | undefined,
  detail: string | null | undefined
): OnlineOffline | null {
  const cat = findCategory(category);
  if (!cat) return null;
  if (!cat.subCategories || cat.subCategories.length === 0) return cat.onlineOffline ?? null;
  const sub = cat.subCategories.find((s) => s.subCategory === subCategory);
  if (!sub) return null;
  if (!sub.details || sub.details.length === 0) return sub.onlineOffline ?? null;
  const det = sub.details.find((d) => d.detail === detail);
  return det?.onlineOffline ?? null;
}

// 딜러 목록/상세 페이지의 세그먼트 배지에 쓰는 표시용 문자열.
// 예: "Speciality · Sport Speciality · Local (Omni)"
export function formatDealerSegment(
  category: string | null | undefined,
  subCategory: string | null | undefined,
  detail: string | null | undefined
): string {
  if (!category) return "미지정";
  const parts = [category, subCategory, detail].filter((p): p is string => !!p);
  const oo = getOnlineOffline(category, subCategory, detail);
  return oo ? `${parts.join(" · ")} (${oo})` : parts.join(" · ");
}
