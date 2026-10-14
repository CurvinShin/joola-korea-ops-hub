"use client";

import type { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";

/** 폼 안에서 누르면 먼저 확인 창을 띄우고, 취소하면 제출하지 않는 버튼. */
export function ConfirmButton({
  message,
  children,
  onClick,
  ...props
}: { message: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
    size?: "sm" | "md";
    variant?: "primary" | "secondary" | "ghost" | "danger";
  }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
        else onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
}
