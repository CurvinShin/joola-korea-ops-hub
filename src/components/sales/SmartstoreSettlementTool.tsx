"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import {
  upsertSmartstoreSkuMap,
  deleteSmartstoreSkuMap,
  generateSmartstoreSettlement,
  type SkuMapRow,
  type UpsertSkuMapResult,
  type SettlementResult,
} from "@/lib/actions/smartstore-settlement";

function AddSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "저장 중..." : "매핑 저장"}
    </Button>
  );
}

function GenerateSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "생성 중..." : "정산 파일 생성"}
    </Button>
  );
}

function downloadBase64Xlsx(filename: string, base64: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 네이버 상품번호 <-> SKU/영문명 매핑 관리 + SettleCaseByCase 업로드로 월말
// 정산 파일(수량/SKU 자동 반영)을 생성하는 화면. 두 기능을 한 페이지에
// 묶은 이유: 정산 파일 생성이 실패하면(미매핑 상품 존재) 바로 아래에서
// 매핑을 추가하고 다시 시도할 수 있게 하기 위해서다.
export function SmartstoreSettlementTool({ skuMapRows }: { skuMapRows: SkuMapRow[] }) {
  const [addState, addFormAction] = useFormState<UpsertSkuMapResult | null, FormData>(upsertSmartstoreSkuMap, null);
  const [genState, genFormAction] = useFormState<SettlementResult | null, FormData>(generateSmartstoreSettlement, null);
  const [prefill, setPrefill] = useState<{ product_no: string; product_name: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (genState && genState.ok) {
      downloadBase64Xlsx(genState.filename, genState.fileBase64);
    }
  }, [genState]);

  useEffect(() => {
    if (addState?.ok) {
      addFormRef.current?.reset();
      setPrefill(null);
    }
  }, [addState]);

  async function handleDelete(productNo: string) {
    if (!confirm(`매핑 삭제: ${productNo}. 되돌릴 수 없습니다. 계속할까요?`)) return;
    setDeleting(productNo);
    await deleteSmartstoreSkuMap(productNo);
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SKU 매핑 ({skuMapRows.length}개)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            네이버에 등록된 한글 상품명(상품번호 기준)이 어떤 SKU/영문 제품명인지 한 번만 등록해두면, 그 다음부터는
            정산 파일 생성 시 자동으로 채워집니다. 신규 상품이 나올 때만 추가하면 됩니다.
          </p>

          <form ref={addFormRef} action={addFormAction} className="flex flex-wrap items-end gap-2 border-b border-slate-100 pb-4">
            <div>
              <label className="block text-xs text-slate-500">상품번호</label>
              <Input
                name="product_no"
                defaultValue={prefill?.product_no ?? ""}
                key={prefill?.product_no ?? "empty-no"}
                placeholder="예: 12345678901"
                className="w-40"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">네이버 상품명 (참고용)</label>
              <Input
                name="product_name"
                defaultValue={prefill?.product_name ?? ""}
                key={prefill?.product_name ?? "empty-name"}
                placeholder="예: 율라 JOOLA 프로5..."
                className="w-56"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">SKU</label>
              <Input name="sku" placeholder="예: 600592" className="w-28" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500">영문 제품명</label>
              <Input name="english_name" placeholder="예: JOOLA Agassi Pro V ... (Global)" className="w-72" required />
            </div>
            <AddSubmitButton />
          </form>
          {addState && !addState.ok && <p className="text-xs text-red-600">{addState.error}</p>}

          {skuMapRows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>상품번호</Th>
                  <Th>네이버 상품명</Th>
                  <Th>SKU</Th>
                  <Th>영문 제품명</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {skuMapRows.map((row) => (
                  <Tr key={row.product_no}>
                    <Td className="font-mono text-xs">{row.product_no}</Td>
                    <Td className="text-xs text-slate-500">{row.product_name}</Td>
                    <Td className="font-mono">{row.sku}</Td>
                    <Td>{row.english_name}</Td>
                    <Td className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deleting === row.product_no}
                        onClick={() => handleDelete(row.product_no)}
                      >
                        삭제
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">아직 등록된 매핑이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>월말 정산 파일 생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            네이버에서 받은 &ldquo;SettleCaseByCase&rdquo; 엑셀을 올리면, 이 달의 &ldquo;주문조회&rdquo; 데이터(제품군
            분석 페이지에서 먼저 업로드해둔 것)에서 수량을, 위 SKU 매핑에서 상품명(SKU 포함)을 자동으로 채운 엑셀을
            바로 다운로드해 드립니다.
          </p>
          <form action={genFormAction} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">SettleCaseByCase 엑셀 파일 (.xlsx)</label>
              <input
                type="file"
                name="file"
                accept=".xlsx"
                required
                className="mt-1.5 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">파일 비밀번호 (있는 경우)</label>
              <Input type="password" name="password" autoComplete="off" className="mt-1.5 max-w-xs" />
            </div>
            <GenerateSubmitButton />
          </form>

          {genState && !genState.ok && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">{genState.error}</p>

              {genState.missingOrderData && genState.missingOrderData.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs">
                  {genState.missingOrderData.map((m) => (
                    <li key={m.product_order_no}>
                      {m.product_order_no} — {m.product_name}
                    </li>
                  ))}
                </ul>
              )}

              {genState.unmapped && genState.unmapped.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {genState.unmapped.map((u) => (
                    <li key={u.product_no ?? u.product_name} className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {u.product_name} ({u.count}건){u.product_no ? ` — 상품번호 ${u.product_no}` : " — 상품번호 없음"}
                      </span>
                      {u.product_no && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setPrefill({ product_no: u.product_no!, product_name: u.product_name });
                            addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                        >
                          매핑 추가
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {genState && genState.ok && (
            <p className="text-sm text-emerald-700">
              {genState.filename} 생성 완료 ({genState.summary.matchedRows}건) — 다운로드가 바로 시작됩니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
