"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// 현재 화면에 보이는 딜러 주문들을 택배 발송용 엑셀 양식(주문번호·수취인·
// 운송장번호·연락처·수취인주소·품목명·옵션명·수량·배송메세지·비고)에 맞춰
// 탭으로 구분된 텍스트로 클립보드에 복사한다. 붙여넣기만 하면 바로 기존
// 엑셀 양식의 빈 줄에 들어간다.
export function ShippingListCopyButton({ tsv, rowCount }: { tsv: string; rowCount: number }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — fail silently
    }
  }

  if (rowCount === 0) return null;

  return (
    <Button type="button" variant="secondary" size="sm" onClick={copy}>
      {copied ? `✓ 복사됨 (${rowCount}줄)` : `택배 양식 복사 (${rowCount}줄)`}
    </Button>
  );
}
