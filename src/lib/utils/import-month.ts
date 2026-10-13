// 수입 요청을 "월" 단위로 묶을 때 쓰는 한국 시간(KST) 기준 월 계산.
// 요청 시각(created_at, UTC 저장)을 KST로 바꿔 "YYYY-MM"을 만들고, 선택한 월의
// 시작/끝 시각(KST 자정)을 ISO 문자열로 돌려준다.

export function kstMonthKey(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 7);
}

export function currentKstMonth(): string {
  return kstMonthKey(new Date().toISOString());
}

export function kstMonthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from: `${month}-01T00:00:00+09:00`, to: `${next}-01T00:00:00+09:00` };
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

export const IMPORT_STATUS_LABEL: Record<string, string> = {
  requested: "접수",
  submitted: "수입 요청 완료",
  received: "입고 완료",
  cancelled: "취소",
};

export const IMPORT_STATUS_TONE: Record<string, "amber" | "blue" | "green" | "slate"> = {
  requested: "amber",
  submitted: "blue",
  received: "green",
  cancelled: "slate",
};
