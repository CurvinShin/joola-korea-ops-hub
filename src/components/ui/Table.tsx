import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Thead({ ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-slate-50" {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200",
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 border-b border-slate-100 text-slate-700", className)} {...props} />
  );
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-slate-50", className)} {...props} />;
}
