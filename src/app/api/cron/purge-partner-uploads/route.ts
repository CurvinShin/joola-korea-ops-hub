import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { batchIdOfPath, selectExpiredBatches, type UploadBatch } from "@/lib/partner/upload-cleanup";
import type { PartnerApplicationAttachment } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const BUCKET = "partner-applications";
const MAX_BATCHES_PER_RUN = 500;

// 제출하지 않은 신청서의 첨부 파일을 7일 뒤 자동으로 지운다(Vercel Cron이 하루 한 번 호출).
// 로그인 세션이 없는 호출이라, Vercel이 CRON_SECRET 환경 변수 값을 Authorization 헤더로 보내 주는 것을
// 확인해서만 동작한다. 환경 변수가 없으면 아무도 호출할 수 없게 막는다.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const storage = admin.storage.from(BUCKET);

  // 1) 신청서가 가리키는 폴더(= 제출된 첨부)는 건드리지 않는다.
  const { data: apps, error: appsError } = await admin.from("partner_applications").select("attachments");
  if (appsError) return NextResponse.json({ error: "query failed" }, { status: 500 });
  const referenced = new Set<string>();
  for (const a of apps ?? []) {
    for (const att of (a.attachments ?? []) as PartnerApplicationAttachment[]) {
      const id = batchIdOfPath(att.path);
      if (id) referenced.add(id);
    }
  }

  // 2) pending/ 아래 폴더별로 가장 늦게 올라온 파일의 시각을 구한다.
  const { data: folders, error: listError } = await storage.list("pending", { limit: MAX_BATCHES_PER_RUN });
  if (listError) return NextResponse.json({ error: "list failed" }, { status: 500 });

  const batches: UploadBatch[] = [];
  const filesByBatch = new Map<string, string[]>();
  for (const folder of folders ?? []) {
    const { data: files } = await storage.list(`pending/${folder.name}`, { limit: 100 });
    if (!files || files.length === 0) continue;
    const newest = Math.max(...files.map((f) => new Date(f.created_at ?? f.updated_at ?? 0).getTime()));
    if (!Number.isFinite(newest) || newest <= 0) continue;
    batches.push({ batchId: folder.name, newestAt: new Date(newest) });
    filesByBatch.set(folder.name, files.map((f) => `pending/${folder.name}/${f.name}`));
  }

  // 3) 7일이 지났고 제출되지 않은 폴더만 지운다.
  const expired = selectExpiredBatches(batches, referenced, new Date());
  const paths = expired.flatMap((id) => filesByBatch.get(id) ?? []);
  if (paths.length > 0) {
    const { error: removeError } = await storage.remove(paths);
    if (removeError) return NextResponse.json({ error: "remove failed" }, { status: 500 });
  }

  return NextResponse.json({ checkedBatches: batches.length, deletedBatches: expired.length, deletedFiles: paths.length });
}
