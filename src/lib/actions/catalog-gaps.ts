"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * "카탈로그 미매칭 재고" board — stock items from the 실사(physical count)
 * snapshot that couldn't be matched to a priced/typed catalog entry, so they
 * were never turned into a `products` row. Kept visible here so pricing can
 * be filled in over time instead of the gap silently disappearing.
 *
 * Dismissing a row is a plain delete: once the product has been added
 * properly via the 제품 추가 form, the gap entry has served its purpose.
 */
export async function dismissCatalogGap(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("catalog_gaps").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/inventory/unmatched");
  revalidatePath("/inventory");
}
