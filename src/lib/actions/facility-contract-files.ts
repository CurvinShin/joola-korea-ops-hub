"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTRACT_BUCKET, isContractPathFor, validateContractPdf } from "@/lib/partner/contract-files";

type Result = { ok: true } | { ok: false; message: string };

/**
 * 브라우저가 Storage 버킷('facility-contracts')에 PDF를 올린 뒤, 그 파일을 시설의 계약서 목록에 등록한다.
 * 관리자(admin)만 등록할 수 있다(RLS).
 */
export async function registerFacilityContractFile(input: {
  facilityId: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
}): Promise<Result> {
  const fileName = input.fileName.trim().slice(0, 200);
  const check = validateContractPdf({ name: fileName, size: input.fileSize, type: "application/pdf" });
  if (!check.ok) return check;
  if (!isContractPathFor(input.facilityId, input.storagePath)) {
    return { ok: false, message: "파일 경로가 올바르지 않습니다." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("facility_contract_files").insert({
    facility_id: input.facilityId,
    storage_path: input.storagePath,
    file_name: fileName,
    file_size: input.fileSize,
    uploaded_by: user?.id ?? null,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/facilities/${input.facilityId}`);
  return { ok: true };
}

/** 목록에서 지우고 Storage의 실제 파일도 같이 지운다(되돌릴 수 없다). */
export async function deleteFacilityContractFile(id: string): Promise<Result> {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("facility_contract_files")
    .select("storage_path, facility_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, message: "파일을 찾을 수 없습니다(관리자만 지울 수 있습니다)." };

  const { error } = await supabase.from("facility_contract_files").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  // 행이 지워진(=관리자 권한이 확인된) 뒤에만 실제 파일을 지운다.
  await createAdminClient().storage.from(CONTRACT_BUCKET).remove([row.storage_path]);

  revalidatePath(`/facilities/${row.facility_id}`);
  return { ok: true };
}
