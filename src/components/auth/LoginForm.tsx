"use client";

import { useRef } from "react";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={signIn} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <div>
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
      </div>
      <Button type="submit" className="w-full">
        로그인
      </Button>
    </form>
  );
}
