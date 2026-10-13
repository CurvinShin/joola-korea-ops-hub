import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 오더리스트 파일 다운로드. 로그인한 사용자가 이 파일을 볼 권한이 있는지(딜러는 자기 등급 +
 * 게시일 이후, 스태프는 전부)를 RLS가 걸러 준 행으로 확인하고, 그 경우에만 1분짜리
 * 임시 다운로드 링크를 만들어 이동시킨다. 버킷은 비공개라 링크를 아는 것만으로는 받을 수 없다.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: row } = await supabase
    .from("order_list_files")
    .select("storage_path, file_name")
    .eq("id", params.id)
    .maybeSingle();
  if (!row) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await createAdminClient()
    .storage.from("order-lists")
    .createSignedUrl(row.storage_path, 60, { download: row.file_name });
  if (error || !data?.signedUrl) return new NextResponse("다운로드 링크를 만들지 못했습니다.", { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
