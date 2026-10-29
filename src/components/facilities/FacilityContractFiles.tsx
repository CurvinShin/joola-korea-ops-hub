"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerFacilityContractFile, deleteFacilityContractFile } from "@/lib/actions/facility-contract-files";
import { CONTRACT_BUCKET, contractStoragePath, formatFileSize, validateContractPdf } from "@/lib/partner/contract-files";
import { Button } from "@/components/ui/Button";

export type ContractFileRow = { id: string; file_name: string; file_size: number | null; created_at: string };

/** 시설 계약서 PDF 보관함: 올리기 · 다운로드 · 삭제. 파일은 서버를 거치지 않고 브라우저에서 저장소로 바로 올린다. */
export function FacilityContractFiles({ facilityId, files }: { facilityId: string; files: ContractFileRow[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    let done = 0;
    for (const file of picked) {
      const check = validateContractPdf(file);
      if (!check.ok) {
        setMessage({ ok: false, text: `${file.name}: ${check.message}` });
        break;
      }
      const path = contractStoragePath(facilityId, crypto.randomUUID());
      const { error: upErr } = await supabase.storage
        .from(CONTRACT_BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) {
        setMessage({ ok: false, text: `${file.name}: 업로드에 실패했습니다 (${upErr.message})` });
        break;
      }
      const res = await registerFacilityContractFile({
        facilityId,
        storagePath: path,
        fileName: file.name,
        fileSize: file.size,
      });
      if (!res.ok) {
        // 목록 등록이 실패하면 올라간 파일이 남지 않게 치운다.
        await supabase.storage.from(CONTRACT_BUCKET).remove([path]);
        setMessage({ ok: false, text: `${file.name}: ${res.message}` });
        break;
      }
      done += 1;
    }
    if (inputRef.current) inputRef.current.value = "";
    setBusy(false);
    if (done > 0) {
      setMessage((m) => m ?? { ok: true, text: `${done}개 올렸습니다.` });
      router.refresh();
    }
  }

  async function onDelete(f: ContractFileRow) {
    if (!window.confirm(`'${f.file_name}' 파일을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    setMessage(null);
    const res = await deleteFacilityContractFile(f.id);
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: res.message });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {files.length === 0 ? (
        <p className="text-sm text-slate-400">올려 둔 계약서 PDF가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate text-slate-800">{f.file_name}</p>
                <p className="text-xs text-slate-400">
                  {new Date(f.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} · {formatFileSize(f.file_size)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`/facilities/${facilityId}/contract-files/${f.id}/download`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  다운로드
                </a>
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onDelete(f)}>
                  삭제
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={onPick} />
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "처리 중…" : "PDF 올리기"}
        </Button>
        <span className="text-xs text-slate-400">PDF만, 파일당 20MB 이하 · 관리자만 열람</span>
      </div>
      {message && <p className={message.ok ? "text-sm text-green-700" : "text-sm text-red-600"}>{message.text}</p>}
    </div>
  );
}
