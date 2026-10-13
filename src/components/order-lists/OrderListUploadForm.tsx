"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerOrderListFile } from "@/lib/actions/order-lists";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

/**
 * 오더리스트 엑셀을 Supabase Storage에 직접 올리는 폼. 파일이 25MB 안팎으로 커서
 * 서버(Vercel) 함수를 거치지 않고 브라우저에서 바로 올린 뒤, 목록에만 서버 액션으로 등록한다.
 */
export function OrderListUploadForm({ today }: { today: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file") as File | null;
    const title = String(fd.get("title") ?? "").trim();
    const tier = Number(fd.get("tier"));
    if (!file || file.size === 0) return setMessage({ ok: false, text: "올릴 파일을 선택해주세요." });
    if (!title) return setMessage({ ok: false, text: "제목을 입력해주세요." });
    if (file.size > 50 * 1024 * 1024) return setMessage({ ok: false, text: "파일이 50MB를 넘습니다." });

    setBusy(true);
    setMessage(null);
    const ext = (file.name.split(".").pop() ?? "xlsx").toLowerCase().replace(/[^a-z0-9]/g, "") || "xlsx";
    // 저장 경로는 한글/공백 문제를 피하려고 영문 숫자로만 만든다(원래 파일 이름은 목록에 따로 저장).
    const storagePath = `${tier}/${crypto.randomUUID()}.${ext}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from("order-lists").upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) {
      setBusy(false);
      return setMessage({ ok: false, text: `업로드에 실패했습니다: ${uploadError.message}` });
    }

    const result = await registerOrderListFile({
      title,
      tier,
      visibleFrom: String(fd.get("visible_from") ?? today),
      effectiveOn: String(fd.get("effective_on") ?? "") || null,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
    });
    setBusy(false);
    if (!result.ok) {
      // 목록 등록이 실패하면 올라간 파일이 남지 않게 치운다(관리자가 아니면 이 삭제도 거부될 수 있음).
      await supabase.storage.from("order-lists").remove([storagePath]);
      return setMessage({ ok: false, text: result.message ?? "등록에 실패했습니다." });
    }
    formRef.current?.reset();
    setMessage({ ok: true, text: "올렸습니다. 게시일이 되면 해당 등급 딜러에게 보입니다." });
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" required placeholder="예: 딜러 오더리스트 2026.11.01 시행 (30%)" />
        </div>
        <div>
          <Label htmlFor="tier">딜러 등급 (할인율)</Label>
          <Select id="tier" name="tier" defaultValue="30">
            <option value="30">30% 딜러용</option>
            <option value="35">35% 딜러용</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="visible_from">딜러에게 보이는 날짜 (게시일)</Label>
          <Input id="visible_from" name="visible_from" type="date" defaultValue={today} required />
        </div>
        <div>
          <Label htmlFor="effective_on">가격 시행일 (선택)</Label>
          <Input id="effective_on" name="effective_on" type="date" />
        </div>
      </div>
      <div>
        <Label htmlFor="file">엑셀 파일 (최대 50MB)</Label>
        <Input id="file" name="file" type="file" accept=".xlsx,.xls,.xlsm,.pdf" required />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "올리는 중… (파일이 커서 1~2분 걸릴 수 있습니다)" : "올리기"}
        </Button>
        {message && <p className={message.ok ? "text-sm text-emerald-700" : "text-sm text-red-600"}>{message.text}</p>}
      </div>
    </form>
  );
}
