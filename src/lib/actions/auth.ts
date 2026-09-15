"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Supabase Auth returns its error text in English. Map the common cases to
// Korean so a non-technical dealer never sees raw English on the login screen.
function translateAuthError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "Email not confirmed": "이메일 인증이 완료되지 않은 계정입니다. 관리자에게 문의해주세요.",
    "User not found": "등록되지 않은 계정입니다. 관리자에게 문의해주세요.",
    "Too many requests": "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
  };
  return known[message] ?? "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const explicitNext = String(formData.get("next") || "");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("이메일과 비밀번호를 모두 입력해주세요.")}`);
  }

  const supabase = createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(translateAuthError(error.message))}`);
  }

  // Dealer-portal accounts land on the order page; everyone else lands on
  // the internal dashboard — unless middleware bounced them from a specific
  // page (explicitNext), in which case honor that instead.
  let defaultNext = "/dashboard";
  const userId = data.user?.id;
  if (userId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    if (profile?.role === "dealer") defaultNext = "/order";
  }

  redirect(explicitNext || defaultNext);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
