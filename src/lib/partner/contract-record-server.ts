import { createAdminClient } from "@/lib/supabase/admin";
import type { PartnerContractStatus } from "@/lib/partner/contract-template";

// SERVER-ONLY. service-role 클라이언트를 쓰므로 클라이언트 컴포넌트에서 가져오지 말 것.
// 시설 화면은 관리자가 아닌 직원도 보지만, 계약서 테이블은 관리자만 읽을 수 있다.
// 그래서 여기서는 "어느 신청서가 어느 시설과 이어져 있는지"와 "계약 상태" 두 가지(개인정보 아님)만 읽어 돌려준다.

export interface HubContractInfo {
  status: PartnerContractStatus;
  applicationId: string;
}

const rank: Record<PartnerContractStatus, number> = { signed: 3, pending_joola: 2, pending_partner: 1, void: 0 };

export async function loadHubContracts(facilityIds: string[]): Promise<Map<string, HubContractInfo>> {
  const result = new Map<string, HubContractInfo>();
  if (facilityIds.length === 0) return result;

  const admin = createAdminClient();
  const { data: apps } = await admin.from("partner_applications").select("id, facility_id").in("facility_id", facilityIds);
  const appRows = (apps ?? []) as { id: string; facility_id: string | null }[];
  if (appRows.length === 0) return result;

  const { data: contracts } = await admin
    .from("partner_contracts")
    .select("application_id, status")
    .in("application_id", appRows.map((a) => a.id));
  const statusByApp = new Map<string, PartnerContractStatus>();
  for (const c of (contracts ?? []) as { application_id: string; status: PartnerContractStatus }[]) {
    statusByApp.set(c.application_id, c.status);
  }

  for (const app of appRows) {
    const status = statusByApp.get(app.id);
    if (!status || !app.facility_id) continue;
    const current = result.get(app.facility_id);
    // 한 시설에 신청서가 여러 개면 가장 앞선 상태(체결 > JOOLA 대기 > 신청자 대기 > 무효)를 쓴다.
    if (!current || rank[status] > rank[current.status]) {
      result.set(app.facility_id, { status, applicationId: app.id });
    }
  }
  return result;
}

/**
 * 시설별로 허브에 올려 둔 계약서 PDF 개수(파일 이름·내용은 읽지 않는다). 목록 테이블은 관리자만 읽을 수 있어서
 * 여기서도 service-role로 개수만 센다. 1개 이상이면 "서명본 PDF 보관 중"으로 본다.
 */
export async function loadContractFileCounts(facilityIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (facilityIds.length === 0) return counts;
  const { data } = await createAdminClient().from("facility_contract_files").select("facility_id").in("facility_id", facilityIds);
  for (const r of (data ?? []) as { facility_id: string }[]) {
    counts.set(r.facility_id, (counts.get(r.facility_id) ?? 0) + 1);
  }
  return counts;
}
