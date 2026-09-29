"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { upsertSmartstoreSettlement, deleteSmartstoreSettlement } from "@/lib/actions/sales";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export interface SmartstoreEntry {
  id: string;
  month: string; // "YYYY-MM"
  amount: number;
}

// month는 "YYYY-MM" 문자열 — 한 달 저장하고 나면 바로 다음 달로 넘어가도록
// 계산해서, 26년 1월부터 쭉 소급 입력할 때 매번 월을 다시 고를 필요가 없게
// 한다.
function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function SmartstoreSettlementsPanel({ initialEntries }: { initialEntries: SmartstoreEntry[] }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const sortedEntries = [...initialEntries].sort((a, b) => (a.month < b.month ? 1 : -1));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!month || !Number.isFinite(parsed) || parsed < 0) {
      setResult({ ok: false, text: "월과 금액을 확인해주세요." });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await upsertSmartstoreSettlement(month, parsed);
      setResult({ ok: res.ok, text: res.message });
      if (res.ok) {
        setAmount("");
        setMonth((m) => nextMonth(m));
      }
    });
  }

  function handleEdit(entry: SmartstoreEntry) {
    setMonth(entry.month);
    setAmount(String(entry.amount));
    setResult(null);
  }

  function handleDelete(id: string) {
    if (!confirm("이 달의 정산 데이터를 삭제할까요?")) return;
    setResult(null);
    startTransition(async () => {
      const res = await deleteSmartstoreSettlement(id);
      setResult({ ok: res.ok, text: res.message });
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="settlement-month">정산 월</Label>
          <Input
            id="settlement-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={isPending}
            className="!w-40"
          />
        </div>
        <div>
          <Label htmlFor="settlement-amount">정산 금액 (원)</Label>
          <Input
            id="settlement-amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예: 12500000"
            disabled={isPending}
            className="!w-48"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
        <p className="text-xs text-slate-400">
          이미 입력된 달을 다시 저장하면 그 달 금액이 덮어써집니다(정정용).
        </p>
      </form>

      {result && <p className={`text-sm ${result.ok ? "text-emerald-600" : "text-red-600"}`}>{result.text}</p>}

      {sortedEntries.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th>월</Th>
              <Th className="text-right">정산 금액</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <tbody>
            {sortedEntries.map((entry) => (
              <Tr key={entry.id}>
                <Td>{entry.month}</Td>
                <Td className="text-right">{currency(entry.amount)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs text-brand-600 hover:underline"
                      disabled={isPending}
                      onClick={() => handleEdit(entry)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      disabled={isPending}
                      onClick={() => handleDelete(entry.id)}
                    >
                      삭제
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-slate-400">아직 입력된 정산 내역이 없습니다. 위에서 월과 금액을 입력해 저장하세요.</p>
      )}
    </div>
  );
}
