"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { NAV_SECTIONS } from "@/lib/nav";

// md 미만(모바일) 화면에서만 보이는 햄버거 버튼 + 슬라이드 메뉴. 데스크톱
// Sidebar는 md 미만에서 완전히 숨겨지므로(`hidden md:flex`), 모바일에서는
// 메뉴 자체가 아예 없어서 로그인 직후 어느 페이지로 이동하든(예: 이전에 보려던
// /inventory) 다른 페이지로 갈 수 있는 방법이 없고, 화면도 훨씬 휑해 보여
// "관리자 페이지가 다른 것 같다"는 인상을 줬다. 같은 NAV_SECTIONS를 데스크톱
// Sidebar와 공유해서 메뉴 구성이 절대 서로 달라지지 않게 한다.
export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 페이지 이동 시 메뉴 자동으로 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* 배경 딤 처리 — 탭하면 닫힘 */}
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative flex h-full w-72 max-w-[80%] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
              <a href="/dashboard" className="flex items-center">
                <span className="text-sm font-semibold text-slate-900">JOOLA Korea</span>
                <span className="ml-1.5 text-sm text-slate-400">운영 허브</span>
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

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
          </div>
        </div>
      )}
    </div>
  );
}
