// 제출하지 않은 신청서의 첨부 파일을 며칠 뒤 지울지 정하는 순수 함수.
// 업로드는 pending/<batchId>/ 폴더로 들어가고, 제출하면 신청서의 attachments가 그 경로를 가리킨다.
// 신청서가 가리키지 않는 폴더 중 마지막 업로드가 기준일보다 오래된 것만 지운다.

export const UNSUBMITTED_UPLOAD_RETENTION_DAYS = 7;

export interface UploadBatch {
  batchId: string;
  // 그 폴더 안 파일 중 가장 늦게 올라온 시각
  newestAt: Date;
}

export function selectExpiredBatches(
  batches: UploadBatch[],
  referencedBatchIds: Set<string>,
  now: Date,
  retentionDays: number = UNSUBMITTED_UPLOAD_RETENTION_DAYS
): string[] {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  return batches
    .filter((b) => !referencedBatchIds.has(b.batchId) && b.newestAt.getTime() < cutoff)
    .map((b) => b.batchId);
}

// 신청서의 첨부 경로(pending/<batchId>/파일명)에서 batchId를 꺼낸다.
export function batchIdOfPath(path: string): string | null {
  const m = /^pending\/([^/]+)\//.exec(path);
  return m ? m[1] : null;
}
