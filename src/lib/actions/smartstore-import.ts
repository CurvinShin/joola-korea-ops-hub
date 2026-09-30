"use server";

import { revalidatePath } from "next/cache";
import * as officeCrypto from "officecrypto-tool";
import { createClient } from "@/lib/supabase/server";
import { parseSmartstoreExport } from "@/lib/reports/parseSmartstoreExport";

export interface SmartstoreImportSummary {
  filename: string;
  totalRowsInFile: number;
  imported: number;
  invalidStatusCount: number;
  skipped: number;
  unclassifiedProductNames: string[];
  dateRange: { from: string; to: string } | null;
}

export type SmartstoreImportResult = { ok: true; summary: SmartstoreImportSummary } | { ok: false; error: string };

// 스마트스토어 "주문조회" 엑셀 업로드 → 복호화 → 파싱 → smartstore_order_items
// upsert. 개인정보(구매자명/구매자ID/수취인명 등)는 parseSmartstoreExport가
// 애초에 읽지 않으므로 이 액션도 그 값을 볼 일이 없다.
export async function importSmartstoreExport(
  _prevState: SmartstoreImportResult | null,
  formData: FormData
): Promise<SmartstoreImportResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "업로드할 엑셀 파일을 선택해주세요." };
    }
    const password = String(formData.get("password") || "");

    let buffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());

    let encrypted = false;
    try {
      encrypted = officeCrypto.isEncrypted(buffer);
    } catch {
      encrypted = false;
    }

    if (encrypted) {
      if (!password) {
        return { ok: false, error: "비밀번호로 보호된 파일입니다. 비밀번호를 입력해주세요." };
      }
      try {
        buffer = await officeCrypto.decrypt(buffer, { password });
      } catch {
        return { ok: false, error: "비밀번호가 올바르지 않거나 파일을 열 수 없습니다." };
      }
    }

    const parsed = parseSmartstoreExport(buffer, file.name);
    if (parsed.rows.length === 0) {
      return { ok: false, error: "엑셀에서 읽을 수 있는 주문 행이 없습니다. '주문조회' 시트 형식인지 확인해주세요." };
    }

    const supabase = createClient();

    // 한 번에 너무 많은 행을 upsert하지 않도록 배치 처리 (향후 기간이 긴
    // 내보내기 파일에도 안전하게 동작하도록).
    const BATCH = 500;
    for (let i = 0; i < parsed.rows.length; i += BATCH) {
      const chunk = parsed.rows.slice(i, i + BATCH).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from("smartstore_order_items").upsert(chunk, { onConflict: "product_order_no" });
      if (error) return { ok: false, error: `저장 실패: ${error.message}` };
    }

    const invalidStatusCount = parsed.rows.filter((r) => !r.is_valid_sale).length;
    const dates = parsed.rows.map((r) => r.order_date).sort();
    const dateRange = dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null;

    revalidatePath("/sales/product-categories");
    revalidatePath("/public-report/[token]");

    return {
      ok: true,
      summary: {
        filename: file.name,
        totalRowsInFile: parsed.totalRowsInFile,
        imported: parsed.rows.length,
        invalidStatusCount,
        skipped: parsed.skippedNoOrderNo,
        unclassifiedProductNames: parsed.unclassifiedProductNames,
        dateRange,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다." };
  }
}
