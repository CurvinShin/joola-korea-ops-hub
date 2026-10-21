"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { signContractAsPartner, type SignResult } from "@/lib/actions/partner-contracts";

interface Props {
  token: string;
  contentHash: string;
}

// 신청자 전자서명 화면: 대표자 이름 입력 + 손서명(마우스·손가락) + 동의 체크.
export function PartnerContractSign({ token, contentHash }: Props) {
  const [state, formAction] = useFormState<SignResult | null, FormData>(signContractAsPartner, null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [png, setPng] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHasInk(true);
    setPng(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasInk(false);
    setPng("");
  }

  if (state?.ok) {
    return (
      <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        서명이 완료되었습니다. JOOLA KOREA 대표 서명이 끝나면 계약이 체결됩니다.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="content_hash" value={contentHash} />
      <input type="hidden" name="signature_png" value={png} />
      <h4 className="text-sm font-semibold text-slate-900">전자서명</h4>
      <div>
        <Label htmlFor="typed_name">대표자 이름 (신청서에 적은 이름과 같아야 합니다)</Label>
        <Input id="typed_name" name="typed_name" autoComplete="off" required />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">서명 (아래 칸에 직접 서명해 주세요)</p>
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-36 w-full touch-none rounded-lg border border-dashed border-slate-400 bg-white"
        />
        <button type="button" onClick={clear} className="mt-1 text-xs text-slate-500 underline">
          서명 지우기
        </button>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="agree" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <span>위 계약서의 모든 내용을 읽고 이해했으며, 이에 동의하여 전자서명합니다.</span>
      </label>
      {state && !state.ok && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={!hasInk}>
        서명하고 제출하기
      </Button>
    </form>
  );
}
