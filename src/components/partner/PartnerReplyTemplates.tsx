"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface Template {
  key: string;
  title: string;
  body: string; // 서버에서 링크까지 채워 보낸 완성 문구
}

// 서버에서 링크가 채워진 문구만 받는다(초대 코드 환경변수는 클라이언트로 넘기지 않는다).
export function PartnerReplyTemplates({ templates, linkMissing }: { templates: Template[]; linkMissing: boolean }) {
  const [activeKey, setActiveKey] = useState(templates[0]?.key ?? "");
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(templates.map((t) => [t.key, t.body])),
  );
  const [copied, setCopied] = useState(false);

  const active = templates.find((t) => t.key === activeKey) ?? templates[0];
  if (!active) return null;
  const text = texts[active.key] ?? active.body;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      alert("복사하지 못했습니다. 글을 직접 선택해서 복사해 주세요.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>문의 답변 메시지</CardTitle>
        <span className="text-xs text-slate-500">내용을 고친 뒤 복사해도 됩니다. 고친 내용은 저장되지 않습니다.</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {linkMissing && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            초대 코드(PARTNER_APPLY_INVITE_TOKEN)가 설정되지 않아 링크가 비어 있습니다.
          </p>
        )}
        <div className="flex gap-2">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActiveKey(t.key);
                setCopied(false);
              }}
              className={`rounded-full px-3 py-1 text-sm ${
                active.key === t.key ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setTexts((prev) => ({ ...prev, [active.key]: e.target.value }))}
          rows={11}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-800 focus:border-brand-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <Button type="button" onClick={copy}>
            {copied ? "복사됨" : "복사"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setTexts((prev) => ({ ...prev, [active.key]: active.body }))}
          >
            원래대로
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
