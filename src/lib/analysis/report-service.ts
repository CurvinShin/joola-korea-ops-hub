import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildListingPriority,
  type ListingPriorityResult,
  type QuoteItemRow,
} from "./listing-priority";

// SERVER-ONLY. 크론(월요일 자동 분석)과 화면의 "지금 다시 분석"이 같은 코드를 쓴다.
// service-role 클라이언트나 로그인한 관리자 클라이언트 둘 다 받을 수 있다(읽기만 하므로).

const PAGE = 1000; // Supabase는 한 번에 최대 1,000행만 돌려준다 — 견적서 품목은 그보다 많아서 나눠 읽는다.
const STALE_AFTER_DAYS = 7;

export function seoulToday(now: Date = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export async function fetchAllQuoteItems(db: SupabaseClient): Promise<QuoteItemRow[]> {
  const rows: QuoteItemRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("dealer_quote_items")
      .select("kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount")
      .order("quote_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`견적서 품목을 읽지 못했습니다: ${error.message}`);
    const batch = (data ?? []) as QuoteItemRow[];
    rows.push(
      ...batch.map((r) => ({
        ...r,
        quantity: Number(r.quantity),
        amount: Number(r.amount),
        unit_price: r.unit_price === null ? null : Number(r.unit_price),
      }))
    );
    if (batch.length < PAGE) break;
  }
  return rows;
}

export async function fetchListedKeys(db: SupabaseClient): Promise<Set<string>> {
  const { data } = await db.from("smartstore_listed_families").select("family_key");
  return new Set(((data ?? []) as { family_key: string }[]).map((r) => r.family_key));
}

export interface ReportSummary {
  itemCount: number;
  candidateCount: number;
  top: Array<{
    rank: number;
    label: string;
    category: string;
    score: number;
    dealers: number;
    quantity: number;
    recentQuantity: number;
  }>;
  ranks: Record<string, number>; // 제품군 키 -> 순위(다음 분석에서 순위 변동을 보여 주는 데 쓴다)
}

export function summarize(result: ListingPriorityResult): ReportSummary {
  return {
    itemCount: result.itemCount,
    candidateCount: result.candidates.length,
    top: result.candidates.slice(0, 10).map((c) => ({
      rank: c.rank,
      label: c.label,
      category: c.category,
      score: c.score,
      dealers: c.dealers,
      quantity: c.quantity,
      recentQuantity: c.recentQuantity,
    })),
    ranks: Object.fromEntries(result.candidates.map((c) => [c.key, c.rank])),
  };
}

export async function latestReportRanks(db: SupabaseClient): Promise<Map<string, number>> {
  const { data } = await db
    .from("quote_analysis_reports")
    .select("summary")
    .order("generated_at", { ascending: false })
    .limit(1);
  const ranks = (data?.[0]?.summary as ReportSummary | undefined)?.ranks;
  return new Map(Object.entries(ranks ?? {}));
}

export type GenerateResult =
  | { ok: true; id: string; dataThrough: string | null; isStale: boolean; candidates: number }
  | { ok: false; error: string };

// 분석을 돌리고 결과 요약을 quote_analysis_reports에 한 줄 남긴다(알림 배너가 이 줄을 본다).
// db: 읽기용 클라이언트, writer: 기록용(service-role) 클라이언트.
export async function generateQuoteAnalysisReport(db: SupabaseClient, writer: SupabaseClient): Promise<GenerateResult> {
  try {
    const [rows, listedKeys, previousRanks] = await Promise.all([
      fetchAllQuoteItems(db),
      fetchListedKeys(db),
      latestReportRanks(db),
    ]);
    const result = buildListingPriority(rows, { listedKeys, previousRanks });
    const today = seoulToday();
    const isStale = result.dataThrough === null || daysBetween(result.dataThrough, today) > STALE_AFTER_DAYS;
    const { data, error } = await writer
      .from("quote_analysis_reports")
      .insert({ data_through: result.dataThrough, is_stale: isStale, summary: summarize(result) })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "분석 기록을 저장하지 못했습니다." };
    return { ok: true, id: data.id as string, dataThrough: result.dataThrough, isStale, candidates: result.candidates.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "분석 중 오류가 났습니다." };
  }
}
