import { describe, expect, it } from "vitest";
import { fetchAllPages, PAGE_SIZE } from "./productCategoryReport";

// 1,000행을 넘는 테이블도 페이지를 이어 붙여 전부 가져오는지 확인한다.
function fakeTable(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ n: i }));
  return (from: number, to: number) => Promise.resolve({ data: rows.slice(from, to + 1), error: null });
}

describe("fetchAllPages", () => {
  it("1,000행을 넘으면 다음 페이지까지 모두 읽는다", async () => {
    const all = await fetchAllPages<{ n: number }>(fakeTable(2350));
    expect(all).toHaveLength(2350);
    expect(all[0].n).toBe(0);
    expect(all[2349].n).toBe(2349);
  });

  it("딱 1,000행이어도 빈 다음 페이지를 확인하고 끝낸다", async () => {
    const all = await fetchAllPages<{ n: number }>(fakeTable(PAGE_SIZE));
    expect(all).toHaveLength(PAGE_SIZE);
  });

  it("조회 오류는 조용히 넘기지 않고 던진다", async () => {
    await expect(
      fetchAllPages(() => Promise.resolve({ data: null, error: { message: "boom" } }))
    ).rejects.toThrow("boom");
  });
});
