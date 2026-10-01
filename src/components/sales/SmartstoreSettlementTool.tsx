"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { extractEnglishKeywords } from "@/lib/reports/koreanProductKeywords";

export interface ProductCandidate {
  sku: string;
  name: string;
  discontinued: boolean;
}

function AddSubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "저장 중..." : editing ? "수정 저장" : "매핑 저장"}
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
export function SmartstoreSettlementTool({
  skuMapRows,
  products,
}: {
  skuMapRows: SkuMapRow[];
  products: ProductCandidate[];
}) {
  const [addState, addFormAction] = useFormState<UpsertSkuMapResult | null, FormData>(upsertSmartstoreSkuMap, null);
  const [genState, genFormAction] = useFormState<SettlementResult | null, FormData>(generateSmartstoreSettlement, null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);

  // 상품번호/옵션정보/네이버 상품명/SKU/영문명을 모두 제어 상태로 두는 이유:
  // "매핑 추가" 버튼으로 미매핑 상품 하나를 채워넣을 수도 있고, 후보 상품
  // 목록에서 클릭하면 SKU/영문명이 자동으로 채워져야 하기 때문.
  const [productNo, setProductNo] = useState("");
  const [optionInfo, setOptionInfo] = useState("");
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [englishName, setEnglishName] = useState("");

  // null이면 "새 매핑 추가" 모드, 값이 있으면(`${product_no}::${option_info}`)
  // 기존 매핑을 수정 중이라는 뜻. upsert가 (product_no, option_info)
  // 복합키로 덮어쓰기 때문에, 수정 모드에서는 이 두 필드를 잠가서(readOnly)
  // 실수로 다른 키의 새 행이 생기는 걸 막는다 — SKU/영문명/상품명만 바꿀 수
  // 있다. 키 자체를 바꾸고 싶으면 삭제 후 새로 추가하면 된다.
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    if (genState && genState.ok) {
      downloadBase64Xlsx(genState.filename, genState.fileBase64);
    }
  }, [genState]);

  useEffect(() => {
    if (addState?.ok) {
      addFormRef.current?.reset();
      setProductNo("");
      setOptionInfo("");
      setProductName("");
      setSku("");
      setEnglishName("");
      setEditingKey(null);
    }
  }, [addState]);

  // 네이버 상품명(한글)에서 알려진 선수/라인명 키워드를 뽑아 영문 키워드로
  // 바꾸고, 그 키워드가 들어간 상품을 후보로 보여준다. 예: "하이페리온"이
  // 들어간 상품명이면 "Hyperion"이 포함된 카탈로그 상품들을 모두 보여줘서
  // 고르기만 하면 되게 한다 — 기억이나 재입력이 필요 없다.
  const candidates = useMemo(() => {
    if (!productName.trim()) return [];
    const keywords = extractEnglishKeywords(productName);
    if (keywords.length === 0) return [];
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    return products
      .filter((p) => lowerKeywords.some((k) => p.name.toLowerCase().includes(k)))
      .sort((a, b) => Number(a.discontinued) - Number(b.discontinued) || a.name.localeCompare(b.name))
      .slice(0, 20);
  }, [productName, products]);

  function applyCandidate(c: ProductCandidate) {
    setSku(c.sku);
    setEnglishName(c.name);
  }

  function handleEditMapping(row: SkuMapRow) {
    setProductNo(row.product_no);
    setOptionInfo(row.option_info);
    setProductName(row.product_name === "(미입력)" ? "" : row.product_name);
    setSku(row.sku);
    setEnglishName(row.english_name);
    setEditingKey(`${row.product_no}::${row.option_info}`);
    addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function cancelEditMapping() {
    addFormRef.current?.reset();
    setProductNo("");
    setOptionInfo("");
    setProductName("");
    setSku("");
    setEnglishName("");
    setEditingKey(null);
  }

  // genState.unmapped은 "정산 파일 생성" 버튼을 눌렀던 시점의 스냅샷이라, 그
  // 뒤에 매핑을 추가해도 목록 자체는 그대로 남아 어디까지 했는지 알기 어렵다.
  // skuMapRows는 매핑 추가/삭제 때마다 서버에서 새로 내려오므로, 이걸로 각
  // 항목이 이미 매핑됐는지 다시 확인해 체크 표시를 해준다 — 재생성 전에도
  // 진행 상황을 바로 알 수 있게.
  const mappedKeySet = useMemo(
    () => new Set(skuMapRows.map((r) => `${r.product_no}::${r.option_info}`)),
    [skuMapRows]
  );
  const unmappedWithStatus = useMemo(() => {
    if (!genState || genState.ok || !genState.unmapped) return [];
    return genState.unmapped
      .map((u) => ({
        ...u,
        resolved: !!u.product_no && mappedKeySet.has(`${u.product_no}::${u.option_info}`),
      }))
      .sort((a, b) => Number(a.resolved) - Number(b.resolved));
  }, [genState, mappedKeySet]);
  const resolvedCount = unmappedWithStatus.filter((u) => u.resolved).length;

  async function handleDelete(productNoToDelete: string, optionInfoToDelete: string) {
    const key = `${productNoToDelete}::${optionInfoToDelete}`;
    if (
      !confirm(`매핑 삭제: ${productNoToDelete}${optionInfoToDelete ? ` (${optionInfoToDelete})` : ""}. 되돌릴 수 없습니다. 계속할까요?`)
    )
      return;
    setDeleting(key);
    await deleteSmartstoreSkuMap(productNoToDelete, optionInfoToDelete);
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
            정산 파일 생성 시 자동으로 채워집니다. 네이버 상품명을 입력하면 아래에 후보 상품이 뜨니, 맞는 것을
            클릭하면 SKU/영문명이 자동으로 채워집니다. &ldquo;[3 Colors]&rdquo;처럼 옵션(색상 등)이 여러 개인 상품은
            같은 상품번호라도 옵션마다 SKU가 다르므로, 옵션정보까지 함께 등록해주세요(예: &ldquo;컬러: Blaze
            Red&rdquo;) — 옵션이 없는 단일 상품은 비워두면 됩니다.
          </p>

          <form ref={addFormRef} action={addFormAction} className="space-y-2 border-b border-slate-100 pb-4">
            {editingKey && (
              <div className="flex items-center justify-between rounded-md bg-brand-50 px-3 py-1.5 text-xs text-brand-700">
                <span>✏️ 기존 매핑 수정 중 — 상품번호/옵션정보는 고정되고, 저장하면 SKU/영문명이 덮어써집니다</span>
                <button type="button" onClick={cancelEditMapping} className="font-medium underline">
                  취소
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs text-slate-500">상품번호</label>
                <Input
                  name="product_no"
                  value={productNo}
                  onChange={(e) => setProductNo(e.target.value)}
                  placeholder="예: 12345678901"
                  className="w-40"
                  readOnly={!!editingKey}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">옵션정보 (색상 등, 없으면 비워두기)</label>
                <Input
                  name="option_info"
                  value={optionInfo}
                  onChange={(e) => setOptionInfo(e.target.value)}
                  placeholder="예: 컬러: Blaze Red"
                  className="w-44"
                  readOnly={!!editingKey}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">네이버 상품명 (후보 검색용)</label>
                <Input
                  name="product_name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="예: 율라 JOOLA 프로5 애거시..."
                  className="w-64"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">SKU</label>
                <Input
                  name="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="예: 600592"
                  className="w-28"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">영문 제품명</label>
                <Input
                  name="english_name"
                  value={englishName}
                  onChange={(e) => setEnglishName(e.target.value)}
                  placeholder="예: JOOLA Agassi Pro V ... (Global)"
                  className="w-72"
                  required
                />
              </div>
              <AddSubmitButton editing={!!editingKey} />
            </div>

            {candidates.length > 0 && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <p className="mb-1.5 text-[11px] text-slate-500">
                  &ldquo;{productName}&rdquo;에서 찾은 후보 상품 — 클릭하면 SKU/영문명이 채워집니다
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {candidates.map((c) => (
                    <button
                      key={c.sku}
                      type="button"
                      onClick={() => applyCandidate(c)}
                      className={`rounded-md border px-2 py-1 text-left text-xs hover:bg-brand-50 ${
                        sku === c.sku ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <span className="font-mono">{c.sku}</span> — {c.name}
                      {c.discontinued && <span className="ml-1 text-slate-400">(단종)</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
          {addState && !addState.ok && <p className="text-xs text-red-600">{addState.error}</p>}

          {skuMapRows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>상품번호</Th>
                  <Th>옵션정보</Th>
                  <Th>네이버 상품명</Th>
                  <Th>SKU</Th>
                  <Th>영문 제품명</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {skuMapRows.map((row) => (
                  <Tr key={`${row.product_no}::${row.option_info}`}>
                    <Td className="font-mono text-xs">{row.product_no}</Td>
                    <Td className="text-xs text-slate-500">{row.option_info || "—"}</Td>
                    <Td className="text-xs text-slate-500">{row.product_name}</Td>
                    <Td className="font-mono">{row.sku}</Td>
                    <Td>{row.english_name}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="secondary" size="sm" onClick={() => handleEditMapping(row)}>
                          수정
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deleting === `${row.product_no}::${row.option_info}`}
                          onClick={() => handleDelete(row.product_no, row.option_info)}
                        >
                          삭제
                        </Button>
                      </div>
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

              {unmappedWithStatus.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 text-xs font-medium text-amber-700">
                    매핑 진행: {resolvedCount} / {unmappedWithStatus.length}건 완료
                    {resolvedCount > 0 && resolvedCount < unmappedWithStatus.length
                      ? " — 나머지도 매핑한 뒤 파일을 다시 올려 재생성해주세요"
                      : resolvedCount === unmappedWithStatus.length
                        ? " — 전부 매핑됐습니다. 파일을 다시 올려 재생성해주세요"
                        : ""}
                  </p>
                  <ul className="space-y-1">
                    {unmappedWithStatus.map((u) => (
                      <li
                        key={`${u.product_no ?? u.product_name}::${u.option_info}`}
                        className={`flex items-center justify-between gap-2 text-xs ${
                          u.resolved ? "text-emerald-700 line-through opacity-60" : ""
                        }`}
                      >
                        <span>
                          {u.resolved && "✓ "}
                          {u.product_name}
                          {u.option_info ? ` (${u.option_info})` : ""} ({u.count}건)
                          {u.product_no ? ` — 상품번호 ${u.product_no}` : " — 상품번호 없음"}
                        </span>
                        {u.product_no && !u.resolved && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setProductNo(u.product_no!);
                              setOptionInfo(u.option_info);
                              setProductName(u.product_name);
                              setSku("");
                              setEnglishName("");
                              setEditingKey(null);
                              addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                          >
                            매핑 추가
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {genState && genState.ok && (
            <p className="text-sm text-emerald-700">
              {genState.filename} 생성 완료 ({genState.summary.matchedRows}건
              {genState.summary.excludedRows > 0 && `, 배송비 등 ${genState.summary.excludedRows}건 제외`}) — 다운로드가
              바로 시작됩니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
