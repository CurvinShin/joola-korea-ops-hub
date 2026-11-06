"use server";

import { createClient } from "@/lib/supabase/server";

export interface ReceivingProduct {
  sku: string;
  name: string;
  ezadmin_code: string | null;
}

export type LookupResult = { ok: true; products: ReceivingProduct[] } | { ok: false; error: string };

/**
 * 입고전표 만들기: 패킹리스트의 SKU로 Hub 제품(이름·이지어드민 상품코드)을 찾는다.
 * 읽기만 하며 아무것도 저장하지 않는다.
 */
export async function lookupReceivingProducts(skus: string[]): Promise<LookupResult> {
  const clean = Array.from(new Set(skus.filter((s) => /^\d{1,10}$/.test(s)))).slice(0, 500);
  if (clean.length === 0) return { ok: true, products: [] };

  const supabase = createClient();
  const { data, error } = await supabase.from("products").select("sku, name, ezadmin_code").in("sku", clean);
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    products: (data ?? []).map((p) => ({
      sku: String(p.sku),
      name: String(p.name ?? ""),
      ezadmin_code: p.ezadmin_code ? String(p.ezadmin_code) : null,
    })),
  };
}
