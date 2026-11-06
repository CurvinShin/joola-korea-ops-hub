/**
 * 딜러 주문(견적서) 번호: {kr_code}-{YY}{순번 2자리 이상}, 예) KR10-2660.
 * 같은 번호를 두 번 쓸 수밖에 없었던 예전 주문은 뒤에 -1, -2를 붙여 구분한다(KR10-2658-1).
 */

export type ParsedOrderNumber =
  | { ok: true; number: string; yy: string; seq: number; suffix: number | null }
  | { ok: false; error: string };

export function parseOrderNumber(input: string, krCode: string): ParsedOrderNumber {
  const number = input.replace(/\s+/g, "").toUpperCase();
  if (!number) return { ok: false, error: "번호를 입력해주세요." };

  const prefix = `${krCode.toUpperCase()}-`;
  if (!number.startsWith(prefix)) {
    return { ok: false, error: `번호는 "${prefix}"로 시작해야 합니다. 예: ${prefix}2613` };
  }
  const m = number.slice(prefix.length).match(/^(\d{2})(\d{2,})(?:-(\d+))?$/);
  if (!m) {
    return { ok: false, error: `번호 형식을 인식할 수 없습니다. 예: ${prefix}2613 ("수정1" 같은 글자는 빼고 입력해주세요)` };
  }
  return { ok: true, number, yy: m[1], seq: parseInt(m[2], 10), suffix: m[3] ? parseInt(m[3], 10) : null };
}

/** 번호를 직접 고쳤을 때 다음 자동 발급 번호(next_seq): 기존 값보다 작아지지 않게 하고, 연도가 다르면 새로 시작한다. */
export function nextSeqAfter(params: {
  currentNextSeq: number | null;
  currentYear: string | null;
  yy: string;
  seq: number;
}): number {
  const { currentNextSeq, currentYear, yy, seq } = params;
  const current = currentYear === yy ? currentNextSeq ?? 0 : 0;
  return Math.max(current, seq + 1);
}
