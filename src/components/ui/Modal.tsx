"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Simple modal driven by the URL (e.g. ?new=1 or ?edit=<id>).
 * The page itself decides whether to render <Modal> based on searchParams,
 * so opening/closing works via plain links and survives a page refresh —
 * no client-side state management needed for something this small.
 */
export function Modal({
  title,
  closeHref,
  children,
}: {
  title: string;
  closeHref: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <Link
            href={closeHref}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </Link>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
