// 업데이트 기록(app_updates)에서 관리자/딜러 화면이 같이 쓰는 라벨과 월 묶기 도우미.

export type AppUpdateRow = {
  id: string;
  released_on: string;
  kind: "new" | "improved" | "fixed";
  audience: "internal" | "dealers";
  title: string;
  body: string;
};

export const UPDATE_KIND_LABEL: Record<string, string> = {
  new: "새 기능",
  improved: "개선",
  fixed: "수정",
};

export const UPDATE_KIND_TONE: Record<string, "green" | "blue" | "amber"> = {
  new: "green",
  improved: "blue",
  fixed: "amber",
};

export const UPDATE_AUDIENCE_LABEL: Record<string, string> = {
  internal: "내부용",
  dealers: "딜러 공개",
};

/** 최신 월이 먼저 오도록 "YYYY-MM" 단위로 묶는다(입력은 이미 최신순). */
export function groupUpdatesByMonth(rows: AppUpdateRow[]): { month: string; items: AppUpdateRow[] }[] {
  const map = new Map<string, AppUpdateRow[]>();
  for (const r of rows) {
    const key = r.released_on.slice(0, 7);
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return [...map.entries()].map(([month, items]) => ({ month, items }));
}

export function monthTitle(month: string): string {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}
