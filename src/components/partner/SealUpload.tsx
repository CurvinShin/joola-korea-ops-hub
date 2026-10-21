"use client";

import { useState } from "react";
import { imageFileToPng } from "@/components/partner/signature-image";

// 직인(도장) 이미지 올리기. 결과는 PNG data URL로 onChange에 전달한다.
export function SealUpload({ onChange, optional = true }: { onChange: (png: string) => void; optional?: boolean }) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setError("");
    if (!file) return;
    try {
      const png = await imageFileToPng(file, 300, 300);
      setPreview(png);
      onChange(png);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지를 처리하지 못했습니다.");
    }
  }

  function remove() {
    setPreview("");
    setError("");
    onChange("");
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">직인(도장) 이미지 {optional && <span className="font-normal text-slate-400">(선택)</span>}</p>
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={onFile}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
      />
      <p className="text-xs text-slate-400">법인 직인이 있으면 이미지(PNG·JPG)로 올려 주세요. 올리지 않아도 서명할 수 있습니다.</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {preview && (
        <div className="flex items-end gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="올린 직인 미리보기" className="max-h-28 rounded-lg border border-slate-200 bg-white p-2" />
          <button type="button" onClick={remove} className="text-xs text-slate-500 underline">
            직인 빼기
          </button>
        </div>
      )}
    </div>
  );
}
