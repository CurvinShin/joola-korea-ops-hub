"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const BASE = "/import-requests";

function back(query: string): never {
  redirect(`${BASE}?${query}#needs`);
}

async function requireStaff() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  if (!user || !me || me.role === "dealer") back(`error=${encodeURIComponent("직원 계정으로 로그인해야 합니다.")}`);
  return { supabase, userId: user.id };
}

/** 상시 수입 필요 목록에 품목을 추가한다. 이름을 비우면 Hub 상품(SKU)에서 가져온다. */
export async function addImportNeed(formData: FormData) {
  const { supabase, userId } = await requireStaff();
  const sku = String(formData.get("sku") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  let name = String(formData.get("product_name") ?? "").trim().slice(0, 200);
  const category = String(formData.get("category") ?? "").trim().slice(0, 30) || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  if (!sku) back(`error=${encodeURIComponent("SKU를 입력해주세요.")}`);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) back(`error=${encodeURIComponent("수량은 1개 이상의 숫자로 입력해주세요.")}`);

  if (!name) {
    const { data: p } = await supabase.from("products").select("name").eq("sku", sku).maybeSingle();
    name = (p?.name as string | undefined) ?? "";
  }

  // 이 테이블은 아직 생성된 타입(database.types.ts)에 없어서 느슨하게 접근한다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("import_needs").insert({ sku, product_name: name, quantity, category, note, created_by: userId });
  if (error) back(`error=${encodeURIComponent(`저장에 실패했습니다: ${error.message}`)}`);
  revalidatePath(BASE);
  back("need_added=1");
}

/** 상시 수입 필요 목록 항목을 삭제한다. */
export async function deleteImportNeed(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) back("error=" + encodeURIComponent("삭제할 항목을 찾을 수 없습니다."));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("import_needs").delete().eq("id", id);
  if (error) back(`error=${encodeURIComponent(`삭제에 실패했습니다: ${error.message}`)}`);
  revalidatePath(BASE);
  back("need_deleted=1");
}

/** 수입요청서에 반영해 처리가 끝난 항목을 완료 처리한다(목록에서 숨김). 완료 표시는 다시 되돌릴 수 있다. */
export async function setImportNeedDone(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const done = String(formData.get("done") ?? "") === "1";
  if (!id) back("error=" + encodeURIComponent("항목을 찾을 수 없습니다."));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("import_needs")
    .update({ status: done ? "done" : "open", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) back(`error=${encodeURIComponent(`변경에 실패했습니다: ${error.message}`)}`);
  revalidatePath(BASE);
  back("need_updated=1");
}
