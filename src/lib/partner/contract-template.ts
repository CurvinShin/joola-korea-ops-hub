import type { FacilityTier } from "@/lib/types/database.types";
import { PRONET_PRICE, SYMMETRY_NET_PRICE, additionalNetsNeeded, freeProNets, netTotal, won } from "./onboarding";

// 브랜드 파트너십 계약서 문구. 원본은 "JOOLA 브랜드 파트너십 계약서 개정 초안"(2026-10-21 확정 문구)이다.
// 문구를 바꾸면 CONTRACT_TEMPLATE_VERSION을 올려야 한다(이미 서명된 계약서에는 영향이 없다:
// 계약서는 만들어질 때의 문구를 그대로 DB에 저장한다).

export const CONTRACT_TEMPLATE_VERSION = "2026-10-21";

// JOOLA(계약 당사자) 정보. 서명 전에 사실과 같은지 꼭 확인할 것.
export const JOOLA_COMPANY = {
  nameKo: "스포츠스쿼드 주식회사",
  nameEn: "SPORT SQUAD, INC.",
  address: "서울특별시 마포구 서교동 395-98, 3층",
  businessNumber: "613-84-00219",
  contactEmail: "cshin@joola.com",
} as const;

export interface ContractInput {
  facilityName: string;
  address: string;
  businessNumber: string;
  representativeName: string;
  tier: FacilityTier;
  courts: number;
  pronetPurchaseQty: number;
  symmetryPurchaseQty: number;
}

export interface ContractClause {
  text: string;
  subs?: string[];
}

export interface ContractArticle {
  title: string;
  clauses: ContractClause[];
}

export interface RenderedContract {
  version: string;
  title: string;
  preamble: string;
  articles: ContractArticle[];
}

const TIER_NAME: Record<FacilityTier, string> = {
  pro: "Pro Court",
  edge: "Edge Court",
  champion: "Champion Court",
};

// 등급마다 달라지는 문구 — 계약서에는 신청자 등급의 문구 하나만 들어간다.
const PRONET_FREE_TEXT: Record<FacilityTier, (free: number) => string> = {
  pro: (free) => `코트 수만큼, 최대 5개의 프로네트를 무상으로 지급한다. 브랜드 파트너의 무상 수량은 ${free}개이다.`,
  edge: () => "프로네트 1개를 무상으로 지급한다.",
  champion: () => "프로네트 무상 지급은 없으며, 제4조에 따라 구매할 수 있다.",
};

const OPENING_PADDLE_TEXT: Record<FacilityTier, string> = {
  pro: "데모 패들을 포함한 8종 16개를 무상으로 지급한다.",
  edge: "4종 8개를 무상으로 지급한다.",
  champion: "개점 패들 지급은 없다.",
};

const NEW_PRODUCT_MODELS: Record<FacilityTier, number> = { pro: 4, edge: 2, champion: 1 };

const UPGRADE_TEXT: Record<FacilityTier, string> = {
  pro: "계약 기간 중 1년간 JOOLA 제품 판매 수익이 소비자가격 기준 1억원 이상이면 추가 혜택을 요청할 수 있다. 추가 혜택의 내용과 기준은 JOOLA가 별도로 정한다.",
  edge: "계약 기간 중 1년간 JOOLA 제품 판매 수익이 소비자가격 기준 5,000만원 이상이면 Pro Court로의 등급 상향을 요청할 수 있다.",
  champion: "계약 기간 중 1년간 JOOLA 제품 판매 수익이 소비자가격 기준 3,000만원 이상이면 Edge Court로의 등급 상향을 요청할 수 있다.",
};

function netPurchaseText(pronet: number, symmetry: number): string {
  if (pronet === 0 && symmetry === 0) return "브랜드 파트너가 추가로 구매하기로 한 네트는 없다.";
  return `브랜드 파트너가 구매하기로 한 수량은 프로네트 ${pronet}개, 시미트리 네트 ${symmetry}개이며 합계는 ${won(netTotal(pronet, symmetry))}(부가세 포함)이다.`;
}

export function renderContract(input: ContractInput): RenderedContract {
  const { tier, courts } = input;
  const tierName = TIER_NAME[tier];
  const free = freeProNets(tier, courts);
  const models = NEW_PRODUCT_MODELS[tier];
  const balls = Math.max(0, courts) * 100;
  const caddies = Math.ceil(Math.max(0, courts) / 2);
  const barriers = Math.max(0, courts) * 3;
  const needed = additionalNetsNeeded(tier, courts);

  const articles: ContractArticle[] = [
    {
      title: "제1조 (목적과 계약 기간)",
      clauses: [
        { text: `본 계약은 JOOLA가 브랜드 파트너에게 ${tierName} 등급의 지원을 제공하고, 브랜드 파트너가 시설에서 JOOLA 브랜드를 노출·홍보하는 조건을 정한다.` },
        { text: "계약 기간은 양 당사자가 모두 서명한 날(이하 \"계약일\")부터 1년으로 한다." },
        { text: "브랜드 파트너는 계약 기간 동안 해당 시설을 운영하며, 최소 운영 기간은 1년으로 한다." },
      ],
    },
    {
      title: "제2조 (갱신)",
      clauses: [
        { text: "본 계약은 자동으로 갱신되지 않는다." },
        { text: "갱신을 원하는 브랜드 파트너는 계약 만료 30일 전까지 갱신 신청서를 제출하고, JOOLA는 그 내용을 평가해 등급을 다시 정한다. 계약 기간 중 연속 1개월 이상 JOOLA 제품 판매가 한 건도 없었던 경우(액세서리 한 개라도 판매는 판매로 본다)는 갱신 평가에 불리하게 반영될 수 있다." },
        { text: "갱신 신청이 없거나 JOOLA가 갱신하지 않기로 한 경우 계약은 기간 만료로 종료된다." },
      ],
    },
    {
      title: "제3조 (JOOLA의 지원)",
      clauses: [
        { text: `기본 지급품: JOOLA는 시설의 코트 ${courts}면을 기준으로 공 ${balls}개, 볼캐디 ${caddies}개, 배리어 ${barriers}개를 무상으로 지급한다. (코트 1개당 공 100개, 코트 2개당 볼캐디 1개로 올림, 코트 1개당 배리어 3개) 지급품의 소유권은 브랜드 파트너에게 있다. 추가분은 도소매 할인가로 구매한다.` },
        { text: `프로네트 지급: ${PRONET_FREE_TEXT[tier](free)}` },
        { text: `개점 패들 지급: ${OPENING_PADDLE_TEXT[tier]}` },
        { text: `신제품 후원: JOOLA의 신제품이 출시될 때마다 브랜드 파트너는 JOOLA가 안내하는 방법으로 모델(쉐입)을 골라 요청할 수 있으며, JOOLA는 ${models}모델(디스플레이 ${models}개, 시타 ${models}개)의 패들을 지원한다.` },
        { text: `공 추가 지급: 브랜드 파트너가 반기 판매 실적을 증명하는 견적서를 이메일(${JOOLA_COMPANY.contactEmail})로 제출하여 요청하고, 판매수익이 코트당 300만원 이상이면 JOOLA는 코트당 공 100개를 추가로 지급한다. 판매수익은 JOOLA 또는 공식 파트너로부터 받은 구매 견적서를 소비자가로 환산해 확인하며, 소비자에게 판매할 목적으로 구매한 제품만 인정한다. 시설 운영용 제품, 대관료, 레슨비는 계산에서 뺀다.` },
        { text: "지급품의 분실·파손에 대한 추가 지급, 보증, 교환은 하지 않는다. 더 필요한 패들은 구매한다." },
      ],
    },
    {
      title: "제4조 (네트 구매와 인도)",
      clauses: [
        { text: `무상 지급분을 넘는 코트에는 JOOLA 네트를 구매한다. 프로네트는 1개당 ${won(PRONET_PRICE)}, 시미트리 네트는 1개당 ${won(SYMMETRY_NET_PRICE)}이며 모두 부가세를 포함한 금액이다.` },
        { text: `시설에서 무상 지급분을 넘어 필요한 네트는 ${needed}개이다. ${netPurchaseText(input.pronetPurchaseQty, input.symmetryPurchaseQty)}` },
        { text: "프로네트는 주문 후 도착까지 최대 2개월이 걸릴 수 있다." },
        { text: "프로네트 도착 전에는 JOOLA 시미트리·엘리멘탈 네트를 무상으로 빌려 쓸 수 있다. 대여 네트의 왕복 운반비와 구매한 프로네트의 운반비는 브랜드 파트너가 부담한다." },
        { text: "브랜드 파트너가 JOOLA 네트를 빌리지 않는 경우, 프로네트(무상 지급분과 구매분 모두)를 받을 때까지 다른 브랜드 네트를 사용할 수 있다. 다만 다른 브랜드 네트가 보이는 사진·영상 등 미디어 노출은 하지 않는다." },
        { text: "프로네트가 도착하면 브랜드 파트너는 영업일 3일 이내에 교체한다." },
      ],
    },
    {
      title: "제5조 (거래 조건)",
      clauses: [
        { text: "브랜드 파트너는 JOOLA와 별도의 딜러십 계약을 맺어 도매로 구매하거나, JOOLA 공식 파트너로서 도소매로 구매할 수 있다. 도매로 구매하려면 별도의 딜러십 계약이 필요하다." },
        { text: "판매 목적으로 진열하는 패들 외의 용품은 브랜드 파트너가 구매한다." },
        { text: "딜러십·도소매 거래의 가격과 조건은 해당 거래 계약이 정한다." },
        { text: "브랜드 파트너가 시설에서 패들을 비치하거나 판매하는 경우, JOOLA 패들 70%, 다른 브랜드 패들 30%의 비율을 지켜야 한다. 비치하는 경우에는 패들의 종류(모델) 수를 기준으로 하여, JOOLA 패들을 7종 비치하면 다른 브랜드 패들은 3종까지만 비치할 수 있다. 판매하는 경우에는 판매 수량(개수)을 기준으로 하여, JOOLA 패들을 70개 판매하면 다른 브랜드 패들은 30개까지만 판매할 수 있다." },
        { text: "시설의 대표와 코치는 다른 브랜드 제품(패들 등)을 사용하지 않는다. 다만 다른 피클볼 브랜드의 앰버서더인 대표나 코치가 그 브랜드의 제품을 사용하는 것은 허용한다. 다른 브랜드 패들의 판매는 제4항의 비율 안에서 허용한다. 또한 제4조 제5항의 임시 네트 사용은 예외로 한다." },
      ],
    },
    {
      title: "제6조 (브랜드 파트너의 의무)",
      clauses: [
        { text: "브랜드 파트너십의 주된 목적은 JOOLA 브랜드 홍보이지만, JOOLA는 제품 판매도 매우 중요하게 본다. 브랜드 파트너는 JOOLA 제품(액세서리 포함)의 판매를 지속적으로 연결하기 위해 노력한다." },
        { text: "브랜드 파트너는 시설 안에 JOOLA 배너를 설치하고, JOOLA의 제품과 브랜드를 SNS에 노출한다." },
        { text: "브랜드 파트너는 데모 패들 체험을 이용자에게 제공하고, JOOLA에서 받은 지급품을 잘 관리한다." },
        { text: `브랜드 파트너는 등급 상향 또는 갱신을 위해 시설의 수익(패들 판매, 대관료, 이벤트 수익 등, 순수익이 아님)을 증명할 수 있는 자료를 준비하고, JOOLA가 요청하거나 브랜드 파트너가 등급 상향·갱신을 신청할 때 이메일(${JOOLA_COMPANY.contactEmail})로 제출한다.` },
        { text: `등급 상향 요청: ${UPGRADE_TEXT[tier]} JOOLA는 제출된 증빙을 확인한 뒤 등급 조정(또는 추가 혜택) 여부를 정한다. 판매 수익은 제3조 제5항의 방식(JOOLA 또는 공식 파트너로부터 받은 구매 견적서를 소비자가로 환산)으로 계산한다.` },
        { text: "브랜드 파트너는 판매업이 사업자등록에 없는 경우에는 제품을 판매할 수 없으며, 공식 딜러를 통한 도소매는 권장 사항이고 의무가 아니다." },
      ],
    },
    {
      title: "제7조 (브랜딩)",
      clauses: [
        { text: "JOOLA는 브랜딩 시안을 브랜드 파트너에게 전달하고, 브랜드 파트너는 이를 바탕으로 페인트, 고급 현수막, 시트지 등으로 코트를 브랜딩한다. 재질은 브랜드 파트너가 자유롭게 정한다." },
        { text: "영상이나 사진을 어느 위치에서 촬영하더라도 코트와 함께 JOOLA 브랜딩이 보여야 한다." },
        { text: "브랜딩 위치는 브랜드 파트너가 정하며, JOOLA는 그 위치에 대해 책임을 지지 않는다. 다만 브랜딩이 너무 작거나 어디서도 잘 보이지 않는 상황이 없도록 한다." },
        { text: "브랜딩 시공 비용은 브랜드 파트너가 부담한다." },
        { text: "브랜드 파트너는 다른 브랜드의 브랜딩을 하지 않는다. 브랜딩은 JOOLA만 독점으로 한다." },
        { text: "JOOLA는 브랜드 파트너의 시설 이름과 로고를 자사 웹사이트와 SNS에 홍보 목적으로 사용할 수 있다. 브랜드 파트너도 JOOLA의 사전 승인을 받아 JOOLA의 이름과 로고를 홍보 목적으로 사용할 수 있다." },
      ],
    },
    {
      title: "제8조 (비밀유지)",
      clauses: [
        { text: "양 당사자는 본 계약과 관련해 알게 된 상대방의 대외비(사업 계획, 제품, 가격, 고객 정보 등)를 제3자에게 공개하지 않으며, 계약이 끝난 뒤에도 사용하지 않는다." },
        { text: "비밀을 유출한 경우 상대방은 법적 구제를 받을 수 있다." },
      ],
    },
    {
      title: "제9조 (해지와 환수)",
      clauses: [
        {
          text: "어느 한쪽이 본 계약의 의무를 이행하지 않으면 상대방은 30일의 시정 기간을 주고 계약을 해지할 수 있다. 다음의 경우는 의무 미이행으로 본다.",
          subs: ["브랜드 파트너의 활동 미이행", "JOOLA 브랜드 이미지를 해치는 행위", "다른 패들 브랜드와의 중복 계약"],
        },
        { text: "계약이 해지되면 신제품 후원과 딜러십 계약이 종료되고, 브랜딩 의무도 사라진다." },
        { text: "지급품은 폐업이나 해지 때에도 회수하지 않는다. 다만 지급품만 받고 개업하지 않은 경우에는 JOOLA가 지급품을 환수하는 것을 원칙으로 한다. JOOLA가 지급한 데모 패들을 판매한 경우에는 JOOLA가 환수를 요구할 수 있다." },
        { text: "브랜드 파트너가 신청서에 허위로 적은 것이 확인되면 JOOLA는 승인을 취소하고 계약을 해지할 수 있다." },
        { text: "해지 시 지적 재산권을 포함한 모든 권리와 의무는 종료된다. 다만 제8조와 제9조 제3항은 계약이 끝난 뒤에도 유지된다." },
      ],
    },
    {
      title: "제10조 (책임 면제와 준거법·분쟁 해결)",
      clauses: [
        { text: "브랜드 파트너의 과실이나 위반으로 생긴 문제와 손해는 브랜드 파트너가 책임지며, JOOLA와 그 관계자는 책임을 지지 않는다." },
        { text: "본 계약은 대한민국 법률에 따라 해석한다." },
        { text: "분쟁이 생기면 양측은 먼저 협의로 해결하도록 노력하고, 협의가 안 되면 조정 또는 중재 절차를 진행할 수 있다." },
        { text: "최종적으로는 서울서부지방법원을 전속 관할 법원으로 한다." },
      ],
    },
    {
      title: "제11조 (일반 조항)",
      clauses: [
        { text: "본 계약 조항 중 일부가 무효이거나 집행할 수 없더라도 나머지 조항은 영향을 받지 않는다." },
        { text: "본 계약은 양 당사자의 서면 합의(전자문서 포함)로만 수정할 수 있다." },
        { text: "양 당사자는 본 계약을 전자 문서로 작성하고 전자서명으로 체결하며, 서명된 전자 문서를 원본으로 각자 보관한다." },
        { text: "본 계약은 양 당사자가 모두 서명한 날부터 효력이 생긴다." },
      ],
    },
  ];

  return {
    version: CONTRACT_TEMPLATE_VERSION,
    title: "JOOLA 브랜드 파트너십 계약서",
    preamble:
      `본 계약서("계약")는 ${JOOLA_COMPANY.nameKo}(${JOOLA_COMPANY.nameEn})(사업자등록번호 ${JOOLA_COMPANY.businessNumber}, 소재지 ${JOOLA_COMPANY.address})(이하 "JOOLA")와 ` +
      `${input.facilityName}(사업자등록번호 ${input.businessNumber}, 소재지 ${input.address}, 대표자 ${input.representativeName})(이하 "브랜드 파트너") 간에 다음과 같이 체결한다.`,
    articles,
  };
}

// 서명 지문(해시)과 PDF 본문에 쓰는 평문. 같은 계약서는 항상 같은 글이 나와야 한다.
export function contractPlainText(c: RenderedContract): string {
  const lines: string[] = [c.title, "", c.preamble, ""];
  for (const a of c.articles) {
    lines.push(a.title);
    a.clauses.forEach((cl, i) => {
      lines.push(`${i + 1}. ${cl.text}`);
      cl.subs?.forEach((s) => lines.push(`   - ${s}`));
    });
    lines.push("");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// DB(partner_contracts) 행 모양과 상태 이름
// ---------------------------------------------------------------------------
export type PartnerContractStatus = "pending_partner" | "pending_joola" | "signed" | "void";

export const contractStatusLabel: Record<PartnerContractStatus, string> = {
  pending_partner: "신청자 서명 대기",
  pending_joola: "JOOLA 대표 서명 대기",
  signed: "체결 완료",
  void: "무효",
};

export interface PartnerContractRow {
  id: string;
  application_id: string;
  status: PartnerContractStatus;
  template_version: string;
  content: RenderedContract;
  content_hash: string;
  generated_at: string;
  partner_signed_at: string | null;
  partner_signer_name: string | null;
  joola_signed_at: string | null;
  joola_signer_name: string | null;
  effective_date: string | null;
}
