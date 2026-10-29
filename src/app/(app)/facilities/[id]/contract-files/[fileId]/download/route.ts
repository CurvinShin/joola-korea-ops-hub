import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTRACT_BUCKET } from "@/lib/partner/contract-files";

export const dynamic = "force-dynamic";

/**
 * 시설 계약서 PDF 다운로드. 목록 행은 관리자만 볼 수 있으므로(RLS) 행이 조회되면 관리자다.
 * 그 경우에만 60초짜리 임시 다운로드 링크를 만들어 이동시킨다. 버킷은 비공개다.
 */
export async function GET(_req: Request, { params }: { params: { id: string; fileId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: row } = await supabase
    .from("facility_contract_files")
    .select("storage_path, file_name")
    .eq("id", params.fileId)
    .eq("facility_id", params.id)
    .maybeSingle();
  if (!row) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await createAdminClient()
    .storage.from(CONTRACT_BUCKET)
    .createSignedUrl(row.storage_path, 60, { download: row.file_name });
  if (error || !data?.signedUrl) return new NextResponse("다운로드 링크를 만들지 못했습니다.", { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
