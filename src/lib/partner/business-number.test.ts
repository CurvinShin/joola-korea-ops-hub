import { describe, expect, it } from "vitest";
import { normalizeBusinessNumber } from "./business-number";

describe("사업자등록번호 형식", () => {
  it("3-2-5 형식과 하이픈 없는 10자리를 받아 하이픈 형식으로 통일한다", () => {
    expect(normalizeBusinessNumber("123-45-67890")).toBe("123-45-67890");
    expect(normalizeBusinessNumber("1234567890")).toBe("123-45-67890");
    expect(normalizeBusinessNumber(" 123-45-67890 ")).toBe("123-45-67890");
  });
  it("자릿수나 하이픈 위치가 틀리면 거절한다", () => {
    expect(normalizeBusinessNumber("123-456-789")).toBeNull();
    expect(normalizeBusinessNumber("123-456-7890")).toBeNull();
    expect(normalizeBusinessNumber("12-345-67890")).toBeNull();
    expect(normalizeBusinessNumber("123-45-6789")).toBeNull();
    expect(normalizeBusinessNumber("abc-de-fghij")).toBeNull();
    expect(normalizeBusinessNumber("")).toBeNull();
  });
});
