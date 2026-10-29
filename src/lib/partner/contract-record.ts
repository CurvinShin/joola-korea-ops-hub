import { contractStatusLabel, type PartnerContractStatus } from "@/lib/partner/contract-template";

// 시설(브랜드 파트너사)의 "계약서 서명 상태"를 한 줄로 보여주기 위한 계산.
// - 허브 전자서명(partner_contracts) 상태는 자동으로 따라온다.
// - "서명본 PDF 보관"은 사람이 직접 체크한다(허브에서 내려받아 보관했거나, 외부 전자서명 PDF를 갖고 있을 때).
// 클라이언트에서도 가져다 쓸 수 있도록 서버 전용 코드는 넣지 않는다(DB 조회는 contract-record-server.ts).

export type ContractRecordKey = "none" | "hub_in_progress" | "signed_pdf_pending" | "signed_pdf_kept";

export const contractRecordLabel: Record<ContractRecordKey, string> = {
  none: "서명본 없음",
  hub_in_progress: "허브 서명 진행 중",
  signed_pdf_pending: "서명 완료 · PDF 보관 전",
  signed_pdf_kept: "서명 완료 · PDF 보관 완료",
};

export type ContractRecordTone = "slate" | "red" | "amber" | "blue" | "green";

export interface ContractRecord {
  key: ContractRecordKey;
  label: string;
  tone: ContractRecordTone;
  // 짧은 보충 설명(툴팁·상세 화면용)
  hint: string;
}

export function facilityContractRecord({
  hubStatus,
  pdfKept,
  partnershipStatus,
}: {
  hubStatus: PartnerContractStatus | null | undefined;
  pdfKept: boolean | null | undefined;
  partnershipStatus?: string | null;
}): ContractRecord {
  // 직접 체크한 "PDF 보관"이 가장 우선한다(외부 서명이든 허브 서명이든 파일을 갖고 있다는 뜻).
  if (pdfKept) {
    return {
      key: "signed_pdf_kept",
      label: contractRecordLabel.signed_pdf_kept,
      tone: "green",
      hint: "계약서 서명본 PDF를 보관하고 있습니다.",
    };
  }
  if (hubStatus === "signed") {
    return {
      key: "signed_pdf_pending",
      label: contractRecordLabel.signed_pdf_pending,
      tone: "blue",
      hint: "허브에서 상호 서명이 끝났습니다. 서명본 PDF를 내려받아 보관한 뒤 체크해 주세요.",
    };
  }
  if (hubStatus === "pending_partner" || hubStatus === "pending_joola") {
    return {
      key: "hub_in_progress",
      label: contractRecordLabel.hub_in_progress,
      tone: "amber",
      hint: contractStatusLabel[hubStatus],
    };
  }
  return {
    key: "none",
    label: contractRecordLabel.none,
    // 이미 활성 파트너인데 서명본이 없으면 눈에 띄게 표시한다.
    tone: partnershipStatus === "active" ? "red" : "slate",
    hint: "아직 계약서 서명본이 없습니다.",
  };
}

export const contractRecordKeys = Object.keys(contractRecordLabel) as ContractRecordKey[];
