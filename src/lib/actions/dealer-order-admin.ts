"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Admin-only actions for reviewing orders dealers place through /order.
// The actual 견적서/발주서 document is created by the admin in 경리나라
// (an external accounting tool) — this app just tracks status and whether
// that hand-off has happened yet (synced_to_accounting).

export async function setDealerOrderStatus(id: string, status: string) {
  const supabase = createClient();
  const { error } = await supabase.from("dealer_orders").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dealer-orders");
}

export async function setDealerOrderSynced(id: string, synced: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("dealer_orders").update({ synced_to_accounting: synced }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dealer-orders");
}
