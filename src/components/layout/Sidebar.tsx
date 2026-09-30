"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { NAV_SECTIONS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      {/* Plain <a>, not next/link — clicking this should behave like a home
          button: always a full reload back to the main dashboard, even
          when already on it. */}
      <a
        href="/dashboard"
        className="flex h-16 items-center border-b border-slate-100 px-5 hover:bg-slate-50"
      >
        <span className="text-sm font-semibold text-slate-900">JOOLA Korea</span>
        <span className="ml-1.5 text-sm text-slate-400">운영 허브</span>
      </a>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {section.items.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {item.label}
                    {item.phase2 && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                        예정
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
