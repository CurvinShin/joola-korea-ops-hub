import { describe, expect, it } from "vitest";
import { nextSeqAfter, parseOrderNumber } from "./order-number";

describe("parseOrderNumber", () => {
  it("정상 번호", () => {
    expect(parseOrderNumber("KR10-2660", "KR10")).toEqual({ ok: true, number: "KR10-2660", yy: "26", seq: 60, suffix: null });
  });
  it("공백·소문자는 정리하고, -1 접미사를 읽는다", () => {
    expect(parseOrderNumber(" kr10-2658-1 ", "KR10")).toEqual({ ok: true, number: "KR10-2658-1", yy: "26", seq: 58, suffix: 1 });
  });
  it("3자리 순번", () => {
    expect(parseOrderNumber("KR02-26105", "KR02")).toMatchObject({ ok: true, seq: 105 });
  });
  it("다른 딜러 코드·형식 오류는 거절", () => {
    expect(parseOrderNumber("KR11-2610", "KR10").ok).toBe(false);
    expect(parseOrderNumber("KR10-26", "KR10").ok).toBe(false);
    expect(parseOrderNumber("KR10-2660(수정1)", "KR10").ok).toBe(false);
    expect(parseOrderNumber("", "KR10").ok).toBe(false);
  });
});

describe("nextSeqAfter", () => {
  it("현재보다 앞 번호면 그대로 둔다", () => {
    expect(nextSeqAfter({ currentNextSeq: 62, currentYear: "26", yy: "26", seq: 58 })).toBe(62);
  });
  it("현재보다 뒤 번호면 한 칸 뒤로", () => {
    expect(nextSeqAfter({ currentNextSeq: 61, currentYear: "26", yy: "26", seq: 70 })).toBe(71);
  });
  it("연도가 다르면 새로 시작", () => {
    expect(nextSeqAfter({ currentNextSeq: 99, currentYear: "25", yy: "26", seq: 3 })).toBe(4);
    expect(nextSeqAfter({ currentNextSeq: null, currentYear: null, yy: "26", seq: 3 })).toBe(4);
  });
});
