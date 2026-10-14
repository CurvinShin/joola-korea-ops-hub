"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { parseOverseasFolder, type ParseResult } from "@/lib/utils/overseas-po-parse";
import { syncOverseasPurchaseOrders, type SyncResult } from "@/lib/actions/overseas-sync";

const nf = new Intl.NumberFormat("ko-KR");

/**
 * 해외 발주 폴더 최신화: 동기화된 "2026 해외발주" 폴더를 고르면 브라우저에서 엑셀을 읽어
 * 미리보기를 보여주고, "저장"을 눌러야 반영된다. (큰 PDF는 서버로 보내지 않는다.)
 */
export function OverseasSyncPanel({ existing }: { existing: { po_number: string; item_count: number | null }[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SyncResult | null>(null);
  const [pending, startTransition] = useTransition();
  const known = new Map(existing.map((e) => [e.po_number, e.item_count ?? 0]));

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setResult(null);
    setSaved(null);
    setError(null);
    if (files.length === 0) return;
    setParsing(true);
    try {
      const r = await parseOverseasFolder(files);
      if (r.pos.length === 0) setError("읽을 수 있는 발주 폴더를 찾지 못했습니다. '2026 해외발주' 폴더(또는 그 안의 발주 폴더)를 선택했는지 확인해 주세요.");
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function save() {
    if (!result) return;
    startTransition(async () => {
      const r = await syncOverseasPurchaseOrders(JSON.stringify(result.pos));
      setSaved(r);
      if (r.ok) setResult(null);
    });
  }

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-800">📁 발주 폴더 최신화 (새 발주서가 생기면)</summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-slate-500">
          컴퓨터에 동기화된 <b>2026 해외발주</b> 폴더를 선택하면 발주서·포장명세서를 읽어 새 발주와 바뀐 내용을 보여드려요.
          미리보기를 확인하고 <b>저장</b>을 눌러야 반영됩니다. 이미 있는 발주의 상태(종료 등)는 바뀌지 않아요.
        </p>
        <input
          ref={inputRef}
          type="file"
          // @ts-expect-error webkitdirectory는 표준 타입에 없지만 주요 브라우저가 지원한다
          webkitdirectory=""
          multiple
          onChange={onPick}
          className="block text-sm"
        />
        {parsing && <p className="text-slate-500">폴더를 읽는 중입니다… (파일이 많으면 잠시 걸려요)</p>}
        {error && <p className="text-red-600">{error}</p>}
        {saved && (saved.ok ? (
          <p className="text-emerald-700">
            저장했어요. 신규 {saved.created}건, 갱신 {saved.updated}건, 품목 {nf.format(saved.items)}줄, 선적 {saved.shipments}건. 새로고침하면 목록에 보입니다.
          </p>
        ) : (
          <p className="text-red-600">{saved.error}</p>
        ))}

        {result && result.pos.length > 0 && (
          <div className="space-y-2">
            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-100">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">발주번호</th>
                    <th className="px-3 py-2">품목 / 수량</th>
                    <th className="px-3 py-2">선적</th>
                    <th className="px-3 py-2">구분</th>
                  </tr>
                </thead>
                <tbody>
                  {result.pos.map((p) => {
                    const before = known.get(p.poNumber);
                    const qty = p.items.reduce((s, i) => s + i.qty, 0);
                    const label =
                      before === undefined ? "신규" : before !== p.items.length && p.items.length > 0 ? `갱신 (품목 ${before}→${p.items.length})` : "변경 없음";
                    return (
                      <tr key={p.poNumber} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2 font-mono">
                          {p.poNumber}
                          {p.warnings.map((w) => (
                            <div key={w} className="font-sans text-amber-700">⚠ {w}</div>
                          ))}
                        </td>
                        <td className="px-3 py-2">
                          {p.items.length}종 · {nf.format(qty)}개
                        </td>
                        <td className="px-3 py-2">
                          {p.shipments.length === 0
                            ? "—"
                            : p.shipments.map((s, i) => (
                                <div key={i}>
                                  {s.date ?? "선적일 미상"} {s.tracking ?? ""}
                                </div>
                              ))}
                        </td>
                        <td className={`px-3 py-2 ${before === undefined ? "font-semibold text-emerald-700" : "text-slate-500"}`}>{label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "저장 중…" : `저장 (${result.pos.length}건)`}
              </Button>
              <button type="button" onClick={() => setResult(null)} className="text-slate-500 hover:underline">
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
