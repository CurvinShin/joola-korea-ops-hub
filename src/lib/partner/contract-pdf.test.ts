import { describe, expect, it } from "vitest";
import { renderContract } from "./contract-template";
import { buildSignedContractPdf } from "./contract-pdf";

describe("buildSignedContractPdf", () => {
  it("한글 글꼴이 들어간 PDF를 만든다(서명 이미지가 없어도 만들어진다)", async () => {
    const content = renderContract({
      facilityName: "테스트시설",
      address: "테스트시 테스트로 1",
      businessNumber: "000-00-00000",
      representativeName: "홍길동",
      tier: "edge",
      courts: 2,
      pronetPurchaseQty: 0,
      symmetryPurchaseQty: 0,
    });
    const bytes = await buildSignedContractPdf({
      facilityName: "테스트시설",
      content,
      content_hash: "a".repeat(64),
      template_version: content.version,
      effective_date: "2026-10-21",
      partner_signed_at: "2026-10-21T01:00:00.000Z",
      partner_signer_name: "홍길동",
      partner_signature_png: null,
      partner_seal_png: null,
      joola_signed_at: "2026-10-21T02:00:00.000Z",
      joola_signer_name: "신종엽",
      joola_signature_png: null,
      joola_seal_png: null,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(10_000);
  });
});
