import { Modal } from "@/components/ui/Modal";
import { AnnounceForm } from "@/components/notices/AnnounceForm";
import { announcePromotion } from "@/lib/actions/notices";
import { calcHardgoodsPrice } from "@/lib/utils/pricing";

const won = (n: number) => `${new Intl.NumberFormat("ko-KR").format(n)}원`;

type PromoRow = {
  id: string;
  name: string;
  promo_price: number | string;
  discount_rate_percent: number | string;
  max_qty_per_dealer: number | null;
  starts_on: string;
  ends_on: string;
};

type DealerOption = { id: string; name: string; classification: string; status: string };

/**
 * 프로모션 정보로 제목/내용/기간을 미리 채운 "딜러에게 알리기" 모달.
 * 프로모션 탭과 공지사항 탭이 같은 모달을 쓴다(returnTo/closeHref만 다름).
 */
export function PromotionAnnounceModal({
  promo,
  dealers,
  today,
  alreadyAnnouncedCount,
  returnTo,
}: {
  promo: PromoRow;
  dealers: DealerOption[];
  today: string;
  alreadyAnnouncedCount: number;
  returnTo: "/promotions" | "/notices";
}) {
  const promoPrice = Number(promo.promo_price);
  const rate = Number(promo.discount_rate_percent);
  const dealerPrice = calcHardgoodsPrice(promoPrice, rate);

  const lines = [
    `${promo.name} 프로모션이 시작됩니다.`,
    "",
    `기간: ${promo.starts_on} ~ ${promo.ends_on}`,
    `소비자가: ${won(promoPrice)} (VAT 포함)`,
    `딜러 할인: ${rate}% → 공급가 ${won(dealerPrice)} (VAT 별도)`,
    promo.max_qty_per_dealer ? `딜러당 구매 한도: ${promo.max_qty_per_dealer}개` : "딜러당 구매 한도: 제한 없음",
    "",
    "주문 화면에서 기간 중 자동으로 할인가가 적용됩니다.",
  ];

  // 게시일 기본값은 "오늘" — 프로모션 시작 전에 미리 알리는 경우가 많고,
  // 날짜는 폼에서 바꿀 수 있다.
  return (
    <Modal title={`${promo.name} — 딜러에게 알리기`} closeHref={returnTo}>
      <AnnounceForm
        action={announcePromotion.bind(null, promo.id)}
        returnTo={returnTo}
        dealers={dealers}
        defaultTitle={`[프로모션] ${promo.name}`}
        defaultBody={lines.join("\n")}
        defaultPublishOn={today}
        defaultExpiresOn={promo.ends_on}
        alreadyAnnouncedCount={alreadyAnnouncedCount}
      />
    </Modal>
  );
}
