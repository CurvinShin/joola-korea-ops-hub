import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold",
          tone === "warning" && "text-amber-600",
          tone === "danger" && "text-red-600",
          tone === "default" && "text-slate-900"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}
