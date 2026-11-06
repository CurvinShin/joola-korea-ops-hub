"use client";

import { useMemo, useState } from "react";
import { lookupReceivingProducts } from "@/lib/actions/receiving";
import {
  buildReceivingRows,
  buildRegistrationSheet,
  buildSlipSheet,
  isLikelyNonProduct,
  isValidEzadminCode,
  parseBarcodeRows,
  parsePackingRows,
  type BarcodeInfo,
  type PackingLine,
  type Row,
} from "@/lib/utils/receiving-slip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Th, Td, Tr } from "@/components/ui/Table";

type XLSXModule = typeof import("xlsx");

const FILE_INPUT_CLASS =
  "mt-1.5 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100";

async function readSheets(XLSX: XLSXModule, file: File) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", codepage: 65001 });
  return wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { header: 1, raw: true, defval: null }),
  }));
}

function download(data: ArrayBuffer | Uint8Array, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const n = (v: number) => v.toLocaleString("ko-KR");

export function ReceivingTool() {
  const [packingName, setPackingName] = useState("");
  const [lines, setLines] = useState<PackingLine[]>([]);
  const [declaredTotal, setDeclaredTotal] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hub, setHub] = useState<Map<string, { name: string; ezadmin_code: string | null }>>(new Map());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<Record<string, string>>({});
  const [barcodes, setBarcodes] = useState<Map<string, BarcodeInfo>>(new Map());
  const [barcodeName, setBarcodeName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPackingFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const sheets = await readSheets(XLSX, file);
      // "PACKING LIST" 시트를 먼저 보고, 없으면 표 머리글(SKU, Qty)이 있는 첫 시트를 쓴다.
      const ordered = [...sheets].sort((a, b) => Number(/packing/i.test(b.name)) - Number(/packing/i.test(a.name)));
      const found = ordered.map((s) => parsePackingRows(s.rows)).find((p) => p.lines.length > 0);
      if (!found) {
        throw new Error("패킹리스트에서 SKU·수량 표를 찾지 못했습니다. 'SKU'와 'Qty' 열이 있는 PL & CI 파일이 맞는지 확인해주세요.");
      }
      const res = await lookupReceivingProducts(found.lines.map((l) => l.sku));
      if (!res.ok) throw new Error(`Hub 제품 조회 실패: ${res.error}`);

      setPackingName(file.name);
      setLines(found.lines);
      setDeclaredTotal(found.declaredTotal);
      setWarnings(found.warnings);
      setHub(new Map(res.products.map((p) => [p.sku, { name: p.name, ezadmin_code: p.ezadmin_code }])));
      setExcluded(new Set(found.lines.filter((l) => isLikelyNonProduct(l.sku)).map((l) => l.sku)));
      setManual({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onBarcodeFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const sheets = await readSheets(XLSX, file);
      const map = sheets.map((s) => parseBarcodeRows(s.rows)).find((m) => m.size > 0);
      if (!map) throw new Error("바코드 파일에서 SKU·UPC 열을 찾지 못했습니다.");
      setBarcodes(map);
      setBarcodeName(`${file.name} (${n(map.size)}개 SKU)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const rows = useMemo(
    () => buildReceivingRows({ lines, hub, manualCodes: manual, excluded }),
    [lines, hub, manual, excluded]
  );

  const totalQty = lines.reduce((a, l) => a + l.qty, 0);
  const ready = rows.filter((r) => r.status === "ready");
  const pending = rows.filter((r) => r.status === "needsRegistration");
  const skipped = rows.filter((r) => r.status === "excluded");
  const readyQty = ready.reduce((a, r) => a + r.qty, 0);
  const skippedQty = skipped.reduce((a, r) => a + r.qty, 0);
  const pendingQty = pending.reduce((a, r) => a + r.qty, 0);
  const label = packingName.replace(/\.[^.]+$/, "") || "입고";

  const registration = useMemo(() => buildRegistrationSheet(rows, barcodes), [rows, barcodes]);

  function toggleExcluded(sku: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  async function downloadSlip() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet(buildSlipSheet(rows));
    ws["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    download(out, `이지어드민_입고전표_일괄업로드_${label}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  async function downloadRegistration() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet(registration.sheet);
    // 바코드 열은 숫자로 넣되 지수 표기가 되지 않게 형식을 지정한다.
    for (let r = 1; r < registration.sheet.length; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 15 })];
      if (cell && cell.t === "n") cell.z = "0";
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const out = XLSX.write(wb, { bookType: "biff8", type: "array" });
    download(out, `이지어드민_상품등록_${label}.xls`, "application/vnd.ms-excel");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. 파일 올리기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">수입 패킹리스트 (PL &amp; CI 엑셀)</label>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => onPackingFile(e.target.files?.[0])}
              className={FILE_INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              &ldquo;PACKING LIST&rdquo; 시트의 SKU · Qty(pcs)를 읽습니다. 같은 SKU가 여러 줄이면 합산합니다.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              바코드 파일 (SKU · UPC 열이 있는 CSV/엑셀) <span className="font-normal text-slate-400">— 신규 제품 상품등록에만 필요</span>
            </label>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={(e) => onBarcodeFile(e.target.files?.[0])}
              className={FILE_INPUT_CLASS}
            />
            {barcodeName && <p className="mt-1.5 text-xs text-emerald-700">불러옴: {barcodeName}</p>}
          </div>
          {busy && <p className="text-sm text-slate-500">읽는 중...</p>}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </CardContent>
      </Card>

      {lines.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>2. 매칭 결과 — {packingName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone="slate">
                  전체 {n(lines.length)}개 SKU · {n(totalQty)}개
                </Badge>
                <Badge tone="green">
                  상품코드 있음 {n(ready.length)}개 SKU · {n(readyQty)}개
                </Badge>
                {pending.length > 0 && (
                  <Badge tone="amber">
                    상품등록 필요 {n(pending.length)}개 SKU · {n(pendingQty)}개
                  </Badge>
                )}
                {skipped.length > 0 && (
                  <Badge tone="slate">
                    제외 {n(skipped.length)}개 SKU · {n(skippedQty)}개
                  </Badge>
                )}
              </div>
              {declaredTotal !== null && (
                <p className={declaredTotal === totalQty ? "text-xs text-emerald-700" : "text-xs text-red-600"}>
                  패킹리스트 TOTAL {n(declaredTotal)}개 · SKU별 합계 {n(totalQty)}개 {declaredTotal === totalQty ? "— 일치" : "— 불일치"}
                </p>
              )}
              {warnings.map((w) => (
                <p key={w} className="text-xs text-amber-700">
                  {w}
                </p>
              ))}

              <div className="overflow-x-auto">
                <Table>
                  <Thead>
                    <tr>
                      <Th>제외</Th>
                      <Th>SKU</Th>
                      <Th>품명 (패킹리스트)</Th>
                      <Th className="text-right">수량</Th>
                      <Th>상품코드</Th>
                      <Th>상태</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {rows.map((r) => {
                      const typed = manual[r.sku] ?? "";
                      const invalid = typed !== "" && !isValidEzadminCode(typed);
                      const inHub = r.hubName !== null;
                      return (
                        <Tr key={r.sku} className={r.excluded ? "opacity-50" : undefined}>
                          <Td>
                            <input
                              type="checkbox"
                              checked={r.excluded}
                              onChange={() => toggleExcluded(r.sku)}
                              aria-label={`${r.sku} 제외`}
                            />
                          </Td>
                          <Td className="font-mono text-xs">{r.sku}</Td>
                          <Td className="max-w-[28rem] truncate" title={r.name}>
                            {r.name}
                          </Td>
                          <Td className="text-right tabular-nums">{n(r.qty)}</Td>
                          <Td>
                            {r.status === "needsRegistration" ? (
                              <input
                                value={typed}
                                onChange={(e) => setManual((m) => ({ ...m, [r.sku]: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
                                inputMode="numeric"
                                placeholder="등록 후 입력"
                                className={`w-28 rounded border px-2 py-1 font-mono text-xs ${invalid ? "border-red-400" : "border-slate-300"}`}
                              />
                            ) : (
                              <span className="font-mono text-xs">{r.code ?? "-"}</span>
                            )}
                          </Td>
                          <Td>
                            {r.status === "ready" && <Badge tone="green">코드 있음</Badge>}
                            {r.status === "excluded" && <Badge tone="slate">제외</Badge>}
                            {r.status === "needsRegistration" && (
                              <span className="flex flex-wrap items-center gap-1">
                                <Badge tone="amber">상품코드 없음</Badge>
                                {!inHub && <Badge tone="red">Hub에도 없음</Badge>}
                                {!barcodes.has(r.sku) && <Badge tone="purple">바코드 없음</Badge>}
                              </span>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
              <p className="text-xs text-slate-400">
                자리수가 짧은 SKU(예: 1111 헤더카드)는 제품이 아닌 포장 부자재일 수 있어 기본으로 제외했습니다. 필요하면 체크를 바꾸세요.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. 파일 만들기</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              {pending.length > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="font-medium text-amber-900">상품등록이 필요한 제품 {pending.length}개</p>
                  <p className="text-amber-800">
                    ① 상품등록 양식을 받아 이지어드민에 올립니다 → ② 생성된 상품코드를 위 표에 입력합니다 → ③ 입고전표를 받습니다.
                  </p>
                  {registration.missingBarcode.length > 0 && (
                    <p className="text-red-700">
                      바코드를 못 찾은 SKU: {registration.missingBarcode.join(", ")} — 바코드 파일을 올리면 채워집니다.
                    </p>
                  )}
                  {registration.suspectBarcode.length > 0 && (
                    <p className="text-red-700">바코드 검산 숫자가 맞지 않는 SKU: {registration.suspectBarcode.join(", ")} — 확인해주세요.</p>
                  )}
                  <Button variant="secondary" onClick={downloadRegistration}>
                    상품등록 양식 받기 (.xls)
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-slate-700">
                  입고전표: <b>{n(ready.length)}개 SKU · {n(readyQty)}개</b>
                  {pending.length > 0 && (
                    <span className="text-amber-700"> — 상품코드가 없는 {n(pending.length)}개 SKU({n(pendingQty)}개)는 빠집니다</span>
                  )}
                </p>
                <Button onClick={downloadSlip} disabled={ready.length === 0}>
                  입고전표 받기 (.xlsx)
                </Button>
                <p className="text-xs text-slate-400">상품코드 · 요청수량 · 입고수량 3열이고, 요청수량과 입고수량은 같게 들어갑니다.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
