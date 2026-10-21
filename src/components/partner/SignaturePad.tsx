"use client";

import { useEffect, useRef, useState } from "react";
import { imageFileToPng } from "@/components/partner/signature-image";

// 서명 입력: 직접 그리기 또는 서명·도장 이미지 올리기. 결과는 PNG data URL로 onChange에 전달한다.
// 신청자 서명과 JOOLA 대표 서명 화면에서 함께 쓴다.
type Mode = "draw" | "upload";

export function SignaturePad({ onChange }: { onChange: (png: string) => void }) {
  const [mode, setMode] = useState<Mode>("draw");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, [mode]);

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
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    onChange("");
  }

  function switchMode(next: Mode) {
    setMode(next);
    setUploadPreview("");
    setUploadError("");
    onChange("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setUploadError("");
    if (!file) return;
    try {
      const png = await imageFileToPng(file);
      setUploadPreview(png);
      onChange(png);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "이미지를 처리하지 못했습니다.");
    }
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => switchMode(m)}
      className={`rounded-md px-3 py-1 text-xs font-medium ${mode === m ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {tab("draw", "직접 서명하기")}
        {tab("upload", "서명·도장 이미지 올리기")}
      </div>
      {mode === "draw" ? (
        <div>
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
      ) : (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={onFile}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          <p className="text-xs text-slate-400">흰 종이에 서명하거나 도장을 찍은 사진 또는 이미지(PNG·JPG)를 올려 주세요.</p>
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          {uploadPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={uploadPreview} alt="올린 서명 미리보기" className="max-h-36 rounded-lg border border-slate-200 bg-white p-2" />
          )}
        </div>
      )}
    </div>
  );
}
