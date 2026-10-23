"use client";

import { useState } from "react";

// 제품명 옆 "복사" 버튼. 누르면 "SKU 제품명" 형태(견적서·주문서 품목명과 같은 형식,
// 예: "604672 JOOLA Perseus POWER FX ...")로 클립보드에 복사한다.
export function CopyNameButton({ sku, name }: { sku: string; name: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${sku} ${name}`);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`"${sku} ${name}" 복사`}
      aria-label={`${name} 복사`}
      className="ml-2 shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
    >
      {state === "copied" ? "복사됨 ✓" : state === "failed" ? "복사 실패" : "복사"}
    </button>
  );
}
