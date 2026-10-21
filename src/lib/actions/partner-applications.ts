"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computePotentialTier, computeTier, type TierInput } from "@/lib/partner/tier";
import { validateNetQuantities } from "@/lib/partner/onboarding";
import { upsertContractForApplication } from "@/lib/partner/contract-service";
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

// 신청자가 동의한 혜택·의무 안내문의 버전(= 확정일). 나중에 어떤 안내문에 동의했는지 구분하는 용도.
const BENEFIT_NOTICE_VERSION = "2026-10-19";

const ANSWER_KEYS = [
  "ops_regularLessons", "ops_hostedEvents", "ops_monthlyUsers800", "ops_salesStaff",
  "access_carOnly", "access_subway10min", "access_bus5min", "access_residential", "access_parking",
  "coach_dupr4", "coach_nationalPodium", "coach_snsReach", "coach_certifiedOr3Years",
  "prior_partner_claim",
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
  sns_id: optionalText,
  dupr_id: optionalText,
  consent: z.literal("on", { errorMap: () => ({ message: "개인정보 수집·이용에 동의해주세요" }) }),
  // 혜택·의무 안내(정식 계약서는 별도 체결) 확인 동의. 안내문을 바꾸면 BENEFIT_NOTICE_VERSION도 같이 올린다.
  benefit_notice: z.literal("on", { errorMap: () => ({ message: "혜택·의무 안내를 확인하고 동의해주세요" }) }),
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
    proNetInstalled: false,
    // 자가 응답만으로는 가산하지 않는다. 담당자가 승인할 때 이력을 확인해야 점수에 들어간다.
    priorPartnerClaimed: answers.prior_partner_claim,
    priorPartnerVerified: false,
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
      answers: { ...answers, benefit_notice_agreed: true, benefit_notice_version: BENEFIT_NOTICE_VERSION },
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
  prior_partner_verified: z.literal("on").optional(),
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
      // 기존 파트너 이력(문제 없음)을 담당자가 확인했는지 기록한다.
      answers: { ...(app.answers ?? {}), prior_partner_verified: parsed.data.prior_partner_verified === "on" },
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

// ---------------------------------------------------------------------------
// 4) 직원: 계약 종료 후 개인정보 삭제 (승인된 신청서)
// ---------------------------------------------------------------------------
// 안내문의 "계약이 끝나면 개인정보를 삭제한다"를 지키기 위한 기능이다.
// 시설 상태가 '종료'일 때만 가능하고, 되돌릴 수 없다. 거절 때와 같은 항목을 지우며,
// 승인 때 시설 정보(facilities)로 복사된 대표자·담당자 연락처·인스타그램도 함께 비운다.
// 시설명·지역·주소·코트 수·티어·점수·처리 기록은 남긴다.
const purgeSchema = z.object({
  confirm_name: z.string().trim().min(1, "시설명을 입력해주세요"),
});

export async function purgeApprovedPartnerData(id: string, formData: FormData) {
  const supabase = createClient();
  const parsed = purgeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));

  const { data: app } = await supabase
    .from("partner_applications")
    .select("id, facility_name, facility_id, attachments, pii_purged_at")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (!app) throw new Error("승인된 신청서를 찾을 수 없습니다.");
  if (app.pii_purged_at) throw new Error("이미 개인정보가 삭제된 신청서입니다.");
  if (parsed.data.confirm_name !== app.facility_name) throw new Error("시설명이 일치하지 않습니다. 삭제하지 않았습니다.");

  // 계약이 끝난 시설만 허용한다.
  if (!app.facility_id) throw new Error("연결된 시설이 없어 삭제할 수 없습니다.");
  const { data: facility } = await supabase
    .from("facilities")
    .select("partnership_status")
    .eq("id", app.facility_id)
    .maybeSingle();
  if (facility?.partnership_status !== "ended") {
    throw new Error("시설의 파트너십 상태가 '종료'일 때만 개인정보를 삭제할 수 있습니다.");
  }

  // 시설 정보 쪽을 먼저 비운다. 여기서 실패하면 신청서는 그대로라서 다시 시도할 수 있다.
  const { error: facilityError } = await supabase
    .from("facilities")
    .update({
      representative_name: null,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      instagram_handle: null,
    })
    .eq("id", app.facility_id);
  if (facilityError) throw new Error(facilityError.message);

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("partner_applications")
    .update({
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

  const paths = ((app.attachments ?? []) as PartnerApplicationAttachment[]).map((a) => a.path);
  if (paths.length > 0) await createAdminClient().storage.from(BUCKET).remove(paths);

  revalidatePath("/partner-applications");
  revalidatePath("/facilities");
  redirect(`/partner-applications/${id}`);
}

// ---------------------------------------------------------------------------
// 5) 직원: 승인 취소 (실수 승인 되돌리기)
// ---------------------------------------------------------------------------
// 승인하면 만들어진 "협의중" 시설을 지우고 신청서를 다시 '검토 중'으로 돌린다.
// 시설이 이미 활성/종료로 바뀌었거나, 개인정보를 이미 삭제한 신청서는 되돌리지 않는다.
export async function undoPartnerApproval(id: string) {
  const supabase = createClient();
  const { data: app } = await supabase
    .from("partner_applications")
    .select("id, answers, facility_id, pii_purged_at")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (!app) throw new Error("승인된 신청서를 찾을 수 없습니다.");
  if (app.pii_purged_at) throw new Error("개인정보가 이미 삭제되어 승인을 취소할 수 없습니다.");

  // 신청자가 계약서에 서명했다면 승인을 취소할 수 없다. 서명 전의 계약서는 함께 지운다.
  const { data: contract } = await supabase
    .from("partner_contracts")
    .select("id, partner_signed_at")
    .eq("application_id", id)
    .maybeSingle();
  if (contract?.partner_signed_at) {
    throw new Error("신청자가 계약서에 서명해서 승인을 취소할 수 없습니다.");
  }
  if (contract) {
    const { error: contractDelError } = await supabase.from("partner_contracts").delete().eq("id", contract.id);
    if (contractDelError) throw new Error(`계약서를 지우지 못했습니다: ${contractDelError.message}`);
  }

  if (app.facility_id) {
    const { data: facility } = await supabase
      .from("facilities")
      .select("partnership_status")
      .eq("id", app.facility_id)
      .maybeSingle();
    if (facility && facility.partnership_status !== "in_discussion") {
      throw new Error("시설의 상태가 '협의중'이 아니라서 승인을 취소할 수 없습니다. 시설 화면에서 직접 정리해 주세요.");
    }
    if (facility) {
      const { error: delError } = await supabase.from("facilities").delete().eq("id", app.facility_id);
      if (delError) {
        throw new Error(`시설을 지우지 못했습니다. 다른 기록과 연결되어 있을 수 있습니다: ${delError.message}`);
      }
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("partner_applications")
    .update({
      status: "pending",
      final_tier: null,
      decision_message: null,
      decided_by: null,
      decided_at: null,
      facility_id: null,
      branding_ack_at: null,
      pronet_purchase_qty: null,
      symmetry_purchase_qty: null,
      net_inquiry_at: null,
      answers: { ...(app.answers ?? {}), prior_partner_verified: false },
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/partner-applications");
  revalidatePath("/facilities");
  redirect(`/partner-applications/${id}`);
}

// ---------------------------------------------------------------------------
// 승인 후 진행: 신청자가 상태 확인 페이지에서 브랜딩 안내 확인 + 네트 구매 수량을 남긴다.
// 로그인이 없으므로 상태 확인 토큰(해시 비교)이 곧 인증이다. 승인된 신청서만 받는다.
// ---------------------------------------------------------------------------
export type NetInquiryResult = { ok: true } | { ok: false; error: string };

const netInquirySchema = z.object({
  token: z.string().min(1),
  pronet_qty: z.coerce.number().int().min(0).max(100),
  symmetry_qty: z.coerce.number().int().min(0).max(100),
});

export async function submitNetInquiry(_prev: NetInquiryResult | null, formData: FormData): Promise<NetInquiryResult> {
  const parsed = netInquirySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "수량을 0 이상의 숫자로 입력해 주세요." };
  if (!flag(formData, "branding_ack")) return { ok: false, error: "브랜딩 안내를 확인하셨다면 체크해 주세요." };

  const admin = createAdminClient();
  const { data: app } = await admin
    .from("partner_applications")
    .select("id, status, final_tier, courts_count, pii_purged_at")
    .eq("status_token_hash", hashStatusToken(parsed.data.token))
    .maybeSingle();
  if (!app || app.status !== "approved" || !app.final_tier || app.pii_purged_at) {
    return { ok: false, error: "승인된 신청서를 찾을 수 없습니다." };
  }

  const { data: signedContract } = await admin
    .from("partner_contracts")
    .select("id")
    .eq("application_id", app.id)
    .not("partner_signed_at", "is", null)
    .maybeSingle();
  if (signedContract) {
    return { ok: false, error: "계약서에 서명하신 뒤에는 수량을 고칠 수 없습니다. 담당자에게 문의해 주세요." };
  }

  const check = validateNetQuantities(
    app.final_tier as FacilityTier,
    app.courts_count,
    parsed.data.pronet_qty,
    parsed.data.symmetry_qty,
  );
  if (!check.ok) return check;

  const now = new Date().toISOString();
  const { error } = await admin
    .from("partner_applications")
    .update({
      branding_ack_at: now,
      pronet_purchase_qty: parsed.data.pronet_qty,
      symmetry_purchase_qty: parsed.data.symmetry_qty,
      net_inquiry_at: now,
      updated_at: now,
    })
    .eq("id", app.id);
  if (error) return { ok: false, error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };

  // 네트 문의가 저장되면 계약서를 만든다(필요한 정보가 비어 있으면 만들지 않고, 화면에 '준비 중'으로 보인다).
  await upsertContractForApplication(app.id);

  revalidatePath(`/partner-applications/${app.id}`);
  revalidatePath("/partner-applications");
  revalidatePath(`/partner-status/${parsed.data.token}`);
  return { ok: true };
}
