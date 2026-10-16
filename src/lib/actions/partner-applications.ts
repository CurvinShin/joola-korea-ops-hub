"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computePotentialTier, computeTier, type TierInput } from "@/lib/partner/tier";
import { encryptSecret, hashIp, hashStatusToken, isValidInviteToken, newStatusToken } from "@/lib/partner/crypto";
import type { FacilityTier, PartnerApplicationAttachment } from "@/lib/types/database.types";

// 브랜드 파트너(시설) 신청서. 신청 쪽 액션(requestUploadTargets, submitPartnerApplication)은
// 로그인 없이 초대 링크로 호출되므로 service-role 클라이언트를 쓰고, 매번 초대 코드를 다시 확인한다.
// 직원 쪽 액션(approve/reject)은 쿠키 클라이언트를 써서 RLS(관리자만)가 권한을 판단한다.

const BUCKET = "partner-applications";
const MAX_FILES = 6;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const SUBMISSIONS_PER_HOUR = 5;
const ATTACHMENT_KINDS = ["court_photo", "business_license", "sns_capture"] as const;

const KR_REGIONS = [
  "seoul", "incheon", "gyeonggi", "gangwon", "chungbuk", "chungnam",
  "daejeon", "sejong", "jeonbuk", "jeonnam", "gwangju", "gyeongbuk",
  "daegu", "gyeongnam", "busan", "ulsan", "jeju",
] as const;

const ANSWER_KEYS = [
  "ops_regularLessons", "ops_hostedEvents", "ops_monthlyUsers800", "ops_salesStaff",
  "access_carOnly", "access_subway10min", "access_bus5min", "access_residential", "access_parking",
  "coach_dupr4", "coach_nationalPodium", "coach_snsReach", "coach_certifiedOr3Years",
] as const;

function clientIp(): string {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

async function tooManySubmissions(ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await createAdminClient()
    .from("partner_applications")
    .select("id", { count: "exact", head: true })
    .eq("submitter_ip_hash", ipHash)
    .gte("created_at", since);
  return (count ?? 0) >= SUBMISSIONS_PER_HOUR;
}

// ---------------------------------------------------------------------------
// 1) 첨부 업로드 링크 발급 — 파일은 서버를 거치지 않고 브라우저가 저장소로 바로 올린다
//    (Vercel 요청 크기 제한 때문). 경로는 pending/<batchId>/ 아래로 고정한다.
// ---------------------------------------------------------------------------
const uploadRequestSchema = z.object({
  invite: z.string().min(1),
  files: z
    .array(
      z.object({
        kind: z.enum(ATTACHMENT_KINDS),
        type: z.string(),
        size: z.number().int().positive(),
      })
    )
    .max(MAX_FILES),
});

export type UploadTargets =
  | { ok: true; batchId: string; uploads: { path: string; token: string }[] }
  | { ok: false; error: string };

export async function requestUploadTargets(input: z.infer<typeof uploadRequestSchema>): Promise<UploadTargets> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: `첨부 파일은 최대 ${MAX_FILES}개까지 올릴 수 있습니다.` };
  if (!isValidInviteToken(parsed.data.invite)) return { ok: false, error: "유효하지 않은 신청 링크입니다." };
  if (await tooManySubmissions(hashIp(clientIp()))) {
    return { ok: false, error: "잠시 후 다시 시도해주세요." };
  }
  for (const f of parsed.data.files) {
    if (!ALLOWED_TYPES.includes(f.type)) return { ok: false, error: "사진(JPG·PNG·WEBP·HEIC) 또는 PDF만 올릴 수 있습니다." };
    if (f.size > MAX_FILE_BYTES) return { ok: false, error: "파일 하나는 10MB 이하여야 합니다." };
  }

  const batchId = randomUUID();
  const storage = createAdminClient().storage.from(BUCKET);
  const uploads: { path: string; token: string }[] = [];
  for (const [i, f] of parsed.data.files.entries()) {
    const ext = f.type === "application/pdf" ? "pdf" : f.type.split("/")[1];
    const path = `pending/${batchId}/${f.kind}-${i + 1}.${ext}`;
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: "업로드 준비에 실패했습니다. 다시 시도해주세요." };
    uploads.push({ path, token: data.token });
  }
  return { ok: true, batchId, uploads };
}

// ---------------------------------------------------------------------------
// 2) 신청서 접수
// ---------------------------------------------------------------------------
const optionalText = z.string().trim().max(200).optional().or(z.literal(""));

const applicationSchema = z.object({
  invite: z.string().min(1),
  facility_name: z.string().trim().min(1, "시설명을 입력해주세요").max(100),
  region: z.enum(KR_REGIONS, { errorMap: () => ({ message: "지역을 선택해주세요" }) }),
  address: z.string().trim().min(1, "주소를 입력해주세요").max(200),
  business_number: optionalText,
  business_type: optionalText,
  representative_name: z.string().trim().min(1, "대표자 이름을 입력해주세요").max(50),
  representative_phone: z.string().trim().min(1, "대표자 연락처를 입력해주세요").max(30),
  applicant_name: optionalText,
  applicant_phone: optionalText,
  email: z.string().trim().email("이메일 주소를 확인해주세요"),
  bank_name: z.string().trim().min(1, "은행명을 입력해주세요").max(50),
  account_holder: z.string().trim().min(1, "예금주를 입력해주세요").max(50),
  account_number: z.string().trim().regex(/^[0-9-]{6,30}$/, "계좌번호는 숫자와 -만 입력해주세요"),
  courts_count: z.coerce.number().int().min(0).max(100),
  venue_suitable: z.literal("on").optional(),
  sales_capability: z.enum(["wholesale", "retail", "none"], {
    errorMap: () => ({ message: "제품 판매 가능 여부를 선택해주세요" }),
  }),
  demo_package_intent: z.literal("on").optional(),
  sns_id: optionalText,
  dupr_id: optionalText,
  consent: z.literal("on", { errorMap: () => ({ message: "개인정보 수집·이용에 동의해주세요" }) }),
  attachment_batch: z.string().uuid().optional().or(z.literal("")),
  attachments: z.string().optional(),
  // 사람에게는 보이지 않는 칸. 값이 있으면 자동 제출로 보고 버린다.
  website: z.string().optional(),
});

const attachmentsSchema = z.array(
  z.object({ kind: z.enum(ATTACHMENT_KINDS), path: z.string(), name: z.string().max(200) })
);

export type SubmitResult =
  | {
      ok: true;
      statusPath: string;
      score: number;
      expectedTier: FacilityTier | null;
      potentialTier: FacilityTier | null;
      reviewReasons: string[];
    }
  | { ok: false; error: string };

function flag(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

export async function submitPartnerApplication(_prev: SubmitResult | null, formData: FormData): Promise<SubmitResult> {
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }
  const d = parsed.data;
  if (!isValidInviteToken(d.invite)) return { ok: false, error: "유효하지 않은 신청 링크입니다." };
  if (d.website) return { ok: false, error: "신청을 처리할 수 없습니다." };

  const ipHash = hashIp(clientIp());
  if (await tooManySubmissions(ipHash)) return { ok: false, error: "잠시 후 다시 시도해주세요." };

  let attachments: PartnerApplicationAttachment[] = [];
  if (d.attachments) {
    let raw: unknown;
    try {
      raw = JSON.parse(d.attachments);
    } catch {
      raw = null;
    }
    const att = attachmentsSchema.safeParse(raw);
    const prefix = `pending/${d.attachment_batch}/`;
    if (!att.success || !d.attachment_batch || att.data.length > MAX_FILES || att.data.some((a) => !a.path.startsWith(prefix))) {
      return { ok: false, error: "첨부 파일 정보가 올바르지 않습니다. 다시 시도해주세요." };
    }
    attachments = att.data;
  }

  const answers = Object.fromEntries(ANSWER_KEYS.map((k) => [k, flag(formData, k)])) as Record<
    (typeof ANSWER_KEYS)[number],
    boolean
  >;
  const tierInput: TierInput = {
    region: d.region,
    courtsCount: d.courts_count,
    venueSuitable: d.venue_suitable === "on",
    salesCapability: d.sales_capability,
    wholesaleVerified: false,
    demoPackagePurchase: d.demo_package_intent === "on",
    proNetInstalled: false,
    ops: {
      regularLessons: answers.ops_regularLessons,
      hostedEvents: answers.ops_hostedEvents,
      monthlyUsers800: answers.ops_monthlyUsers800,
      salesStaff: answers.ops_salesStaff,
    },
    access: {
      carOnly: answers.access_carOnly,
      subway10min: answers.access_subway10min,
      bus5min: answers.access_bus5min,
      residential: answers.access_residential,
      parking: answers.access_parking,
    },
    coach: {
      dupr4: answers.coach_dupr4,
      nationalPodium: answers.coach_nationalPodium,
      snsReach: answers.coach_snsReach,
      certifiedOr3Years: answers.coach_certifiedOr3Years,
    },
  };
  const result = computeTier(tierInput);
  const potential = computePotentialTier(tierInput);

  const token = newStatusToken();
  const { error } = await createAdminClient()
    .from("partner_applications")
    .insert({
      status_token_hash: hashStatusToken(token),
      facility_name: d.facility_name,
      region: d.region,
      courts_count: d.courts_count,
      venue_suitable: tierInput.venueSuitable,
      sales_capability: d.sales_capability,
      demo_package_intent: tierInput.demoPackagePurchase,
      answers,
      address: d.address,
      business_number: d.business_number || null,
      business_type: d.business_type || null,
      representative_name: d.representative_name,
      representative_phone: d.representative_phone,
      applicant_name: d.applicant_name || null,
      applicant_phone: d.applicant_phone || null,
      email: d.email,
      bank_name: d.bank_name,
      account_holder: d.account_holder,
      account_number_enc: encryptSecret(d.account_number),
      sns_id: d.sns_id || null,
      dupr_id: d.dupr_id || null,
      attachments,
      expected_score: result.score,
      expected_tier: result.tier,
      potential_tier: potential.tier,
      review_reasons: result.reviewReasons,
      consent_at: new Date().toISOString(),
      submitter_ip_hash: ipHash,
    });
  if (error) return { ok: false, error: "신청서를 저장하지 못했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath("/partner-applications");
  return {
    ok: true,
    statusPath: `/partner-status/${token}`,
    score: result.score,
    expectedTier: result.tier,
    potentialTier: potential.tier,
    reviewReasons: result.reviewReasons,
  };
}

// ---------------------------------------------------------------------------
// 3) 직원: 승인 / 거절
// ---------------------------------------------------------------------------
const approveSchema = z.object({
  final_tier: z.enum(["pro", "edge", "champion"], { errorMap: () => ({ message: "최종 티어를 선택해주세요" }) }),
  decision_message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function approvePartnerApplication(id: string, formData: FormData) {
  const supabase = createClient();
  const parsed = approveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: app } = await supabase
    .from("partner_applications")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (!app) throw new Error("검토 중인 신청서를 찾을 수 없습니다.");
  // 사업자등록번호는 신청 때 비워 둘 수 있지만 승인 전에는 필수다(가이드라인 부록).
  if (!app.business_number) throw new Error("사업자등록번호를 받은 뒤에 승인할 수 있습니다.");

  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .insert({
      name: app.facility_name,
      region: app.region,
      address: app.address,
      representative_name: app.representative_name,
      courts_count: app.courts_count,
      partnership_status: "in_discussion",
      tier: parsed.data.final_tier,
      contact_name: app.applicant_name ?? app.representative_name,
      contact_email: app.email,
      contact_phone: app.applicant_phone ?? app.representative_phone,
      instagram_handle: app.sns_id,
      notes: "브랜드 파트너 신청서로 등록",
    })
    .select("id")
    .single();
  if (facilityError || !facility) throw new Error(facilityError?.message ?? "시설을 등록하지 못했습니다.");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("partner_applications")
    .update({
      status: "approved",
      final_tier: parsed.data.final_tier,
      decision_message: parsed.data.decision_message || null,
      decided_by: user?.id ?? null,
      decided_at: now,
      facility_id: facility.id,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/partner-applications");
  revalidatePath("/facilities");
  redirect(`/partner-applications/${id}`);
}

const businessNumberSchema = z.object({
  business_number: z.string().trim().regex(/^[0-9-]{10,12}$/, "사업자등록번호는 숫자 10자리(- 포함 가능)로 입력해주세요"),
});

// 신청 때 비워 둔 사업자등록번호를 담당자가 받은 뒤 채워 넣는다(승인 전 필수).
export async function setPartnerBusinessNumber(id: string, formData: FormData) {
  const supabase = createClient();
  const parsed = businessNumberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  const { error } = await supabase
    .from("partner_applications")
    .update({ business_number: parsed.data.business_number, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  revalidatePath(`/partner-applications/${id}`);
  redirect(`/partner-applications/${id}`);
}

const rejectSchema = z.object({
  decision_message: z.string().trim().min(1, "거절 메시지를 입력해주세요").max(1000),
});

export async function rejectPartnerApplication(id: string, formData: FormData) {
  const supabase = createClient();
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: app } = await supabase
    .from("partner_applications")
    .select("id, attachments")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (!app) throw new Error("검토 중인 신청서를 찾을 수 없습니다.");

  const now = new Date().toISOString();
  // 거절하면 개인정보·계좌·첨부를 지우고 시설명·지역·점수·거절 사유만 남긴다(가이드라인 부록).
  const { error } = await supabase
    .from("partner_applications")
    .update({
      status: "rejected",
      decision_message: parsed.data.decision_message,
      decided_by: user?.id ?? null,
      decided_at: now,
      address: null,
      business_number: null,
      business_type: null,
      representative_name: null,
      representative_phone: null,
      applicant_name: null,
      applicant_phone: null,
      email: null,
      bank_name: null,
      account_holder: null,
      account_number_enc: null,
      sns_id: null,
      dupr_id: null,
      attachments: [],
      pii_purged_at: now,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // 위 update가 RLS(관리자만)를 통과했으니 저장소 파일도 지운다.
  const paths = ((app.attachments ?? []) as PartnerApplicationAttachment[]).map((a) => a.path);
  if (paths.length > 0) await createAdminClient().storage.from(BUCKET).remove(paths);

  revalidatePath("/partner-applications");
  redirect(`/partner-applications/${id}`);
}
