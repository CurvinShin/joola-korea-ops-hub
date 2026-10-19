import { describe, expect, it } from "vitest";
import { batchIdOfPath, selectExpiredBatches } from "./upload-cleanup";

const now = new Date("2026-10-30T00:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

describe("제출하지 않은 첨부 파일 정리 대상", () => {
  it("7일이 지났고 신청서가 가리키지 않는 폴더만 고른다", () => {
    const batches = [
      { batchId: "old-orphan", newestAt: daysAgo(8) },
      { batchId: "fresh-orphan", newestAt: daysAgo(6) },
      { batchId: "old-submitted", newestAt: daysAgo(30) },
    ];
    expect(selectExpiredBatches(batches, new Set(["old-submitted"]), now)).toEqual(["old-orphan"]);
  });
  it("정확히 7일 된 폴더는 아직 지우지 않는다", () => {
    expect(selectExpiredBatches([{ batchId: "x", newestAt: daysAgo(7) }], new Set(), now)).toEqual([]);
  });
  it("경로에서 batchId를 꺼낸다", () => {
    expect(batchIdOfPath("pending/abc-123/court_photo-1.heic")).toBe("abc-123");
    expect(batchIdOfPath("other/abc/file.png")).toBeNull();
  });
});
