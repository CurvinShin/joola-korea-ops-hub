import { describe, expect, it } from "vitest";
import {
  PARTNER_APPLY_BASE_URL,
  PARTNER_REPLY_TEMPLATES,
  buildApplyLink,
  fillReplyTemplate,
} from "./reply-templates";

describe("buildApplyLink", () => {
  it("초대 코드로 운영 도메인 링크를 만든다", () => {
    expect(buildApplyLink("abc-123")).toBe(`${PARTNER_APPLY_BASE_URL}/abc-123`);
  });

  it("앞뒤 공백은 제거한다", () => {
    expect(buildApplyLink("  abc  ")).toBe(`${PARTNER_APPLY_BASE_URL}/abc`);
  });

  it("코드가 없거나 비어 있으면 null", () => {
    expect(buildApplyLink(undefined)).toBeNull();
    expect(buildApplyLink("")).toBeNull();
    expect(buildApplyLink("   ")).toBeNull();
  });
});

describe("fillReplyTemplate", () => {
  it("{LINK}를 링크로 바꾼다", () => {
    const out = fillReplyTemplate("신청서: {LINK}", "https://example.com/x");
    expect(out).toBe("신청서: https://example.com/x");
  });

  it("링크가 없으면 안내 문구로 바꾼다", () => {
    const out = fillReplyTemplate("신청서: {LINK}", null);
    expect(out).not.toContain("{LINK}");
    expect(out).toContain("붙여넣으세요");
  });

  it("{LINK}가 없는 문구는 그대로 둔다", () => {
    expect(fillReplyTemplate("안녕하세요", "https://x")).toBe("안녕하세요");
  });
});

describe("PARTNER_REPLY_TEMPLATES", () => {
  it("첫 문의 답변에는 링크 자리가 있다", () => {
    const inquiry = PARTNER_REPLY_TEMPLATES.find((t) => t.key === "inquiry");
    expect(inquiry?.body).toContain("{LINK}");
  });

  it("key가 중복되지 않는다", () => {
    const keys = PARTNER_REPLY_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
