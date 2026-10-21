// 브랜드 파트너십 문의가 왔을 때 복사해서 보내는 답변 문구.
// 문구를 바꾸려면 이 파일만 고치면 된다. {LINK} 자리에는 신청서 초대 링크가 들어간다.

export const PARTNER_APPLY_BASE_URL = "https://joola-korea-ops-hub.vercel.app/partner-apply";

export const LINK_PLACEHOLDER = "{LINK}";

export interface PartnerReplyTemplate {
  key: string;
  title: string;
  body: string;
}

export const PARTNER_REPLY_TEMPLATES: PartnerReplyTemplate[] = [
  {
    key: "inquiry",
    title: "첫 문의 답변",
    body: `안녕하세요, 율라코리아 신종엽 과장입니다.

먼저 율라 브랜드 파트너십에 관심 가져주셔서 감사합니다.

아래 신청서 링크로 시설 정보를 작성해 주시면, 브랜드 파트너십 계약이 가능한지 먼저 확인해 드리겠습니다. 확인 후 혜택과 의무 사항을 안내드리오니, 내용을 충분히 확인하신 뒤 진행 여부를 확정해 주시면 됩니다.

신청서 링크: ${LINK_PLACEHOLDER}

궁금하신 점은 편하게 문의 주세요.
감사합니다.`,
  },
  {
    key: "received",
    title: "신청서 접수 확인",
    body: `안녕하세요, 율라코리아 신종엽 과장입니다.

신청서 잘 받았습니다. 내용을 확인한 뒤 파트너십 가능 여부와 안내 사항을 말씀드리겠습니다.

접수 후 안내된 상태 확인 링크에서 진행 상황도 확인하실 수 있습니다.
감사합니다.`,
  },
];

// 초대 코드가 있으면 운영 도메인 기준 신청서 링크를, 없으면 null을 돌려준다.
export function buildApplyLink(token: string | undefined | null): string | null {
  const t = token?.trim();
  return t ? `${PARTNER_APPLY_BASE_URL}/${t}` : null;
}

export function fillReplyTemplate(body: string, link: string | null): string {
  if (!body.includes(LINK_PLACEHOLDER)) return body;
  return body.split(LINK_PLACEHOLDER).join(link ?? "(신청서 링크를 여기에 붙여넣으세요)");
}
