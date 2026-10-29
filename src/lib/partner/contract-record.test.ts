import { describe, expect, it } from "vitest";
import { facilityContractRecord } from "./contract-record";

describe("facilityContractRecord", () => {
  it("허브 계약도 없고 PDF도 없으면 서명본 없음", () => {
    expect(facilityContractRecord({ hubStatus: null, pdfKept: false }).key).toBe("none");
    expect(facilityContractRecord({ hubStatus: "void", pdfKept: false }).key).toBe("none");
  });

  it("활성 파트너인데 서명본이 없으면 빨간색으로 표시한다", () => {
    expect(facilityContractRecord({ hubStatus: null, pdfKept: false, partnershipStatus: "active" }).tone).toBe("red");
    expect(facilityContractRecord({ hubStatus: null, pdfKept: false, partnershipStatus: "prospect" }).tone).toBe("slate");
  });

  it("허브에서 서명 진행 중이면 대기 상태를 보여준다", () => {
    const pendingPartner = facilityContractRecord({ hubStatus: "pending_partner", pdfKept: false });
    expect(pendingPartner.key).toBe("hub_in_progress");
    expect(pendingPartner.hint).toBe("신청자 서명 대기");
    expect(facilityContractRecord({ hubStatus: "pending_joola", pdfKept: false }).hint).toBe("JOOLA 대표 서명 대기");
  });

  it("허브에서 체결됐지만 PDF 보관 체크 전이면 보관 전", () => {
    expect(facilityContractRecord({ hubStatus: "signed", pdfKept: false }).key).toBe("signed_pdf_pending");
  });

  it("PDF 보관을 체크하면 허브 상태와 상관없이 보관 완료", () => {
    expect(facilityContractRecord({ hubStatus: "signed", pdfKept: true }).key).toBe("signed_pdf_kept");
    expect(facilityContractRecord({ hubStatus: null, pdfKept: true }).key).toBe("signed_pdf_kept");
    expect(facilityContractRecord({ hubStatus: "pending_partner", pdfKept: true }).key).toBe("signed_pdf_kept");
  });
});
