import { describe, expect, it } from "vitest";
import { buildDispatchRows, dealersMissingShipInfo, type DispatchOrderInput } from "./dispatch-sheet";
import { buildShippingListRowsByOrder } from "./shipping-list";

// 쿠팡 로켓그로스 입고 센터를 "딜러"처럼 등록해서 쓰는 경우(KR 코드 없음)에도
// 발주서 엑셀과 택배 양식이 딜러 주문과 똑같이 만들어지는지 확인한다.
const coupang = {
  name: "쿠팡로켓",
  address: "인천 검단구 갑문4로 25 쿠팡인천4센터",
  ship_recipient: "인천4",
  contact_phone: "070-4754-8741",
};

const order: DispatchOrderInput = {
  id: "o1",
  dealers: coupang,
  dealer_order_items: [
    { quantity: 10, products: { name: "JOOLA Primo Indoor Plus (3 Pack)", sku: "600001" } },
    { quantity: 3, products: { name: "JOOLA Primo Indoor Plus (3 Pack)", sku: "600001" } }, // 같은 SKU는 합쳐진다
    { quantity: 5, products: { name: "Ben Johns Hyperion CAS 16", sku: "18500" } },
  ],
};

describe("쿠팡로켓을 딜러처럼 등록한 경우", () => {
  it("발주서 엑셀: 수취인·연락처·주소·품목·수량이 들어가고 주문번호는 날짜-순번이다", () => {
    const rows = buildDispatchRows([order], "2026-10-28", 1);
    expect(rows).toEqual([
      ["20261028-01", "인천4", "", "070-4754-8741", coupang.address, "600001 JOOLA Primo Indoor Plus (3 Pack)", "", "13", "", ""],
      ["20261028-02", "인천4", "", "070-4754-8741", coupang.address, "18500 Ben Johns Hyperion CAS 16", "", "5", "", ""],
    ]);
  });

  it("수취인·주소·연락처가 모두 있으면 '정보 없음' 경고 대상이 아니다", () => {
    expect(dealersMissingShipInfo([order])).toEqual([]);
  });

  it("택배 양식 복사도 같은 값으로 만들어진다 (KR 코드는 쓰지 않는다)", () => {
    const result = buildShippingListRowsByOrder([
      {
        id: "o1",
        order_date: "2026-10-28",
        dealers: coupang,
        dealer_order_items: order.dealer_order_items,
      } as never,
    ]);
    expect(result[0].rows).toHaveLength(2);
    expect(result[0].rows[0].slice(0, 5)).toEqual(["20261028-1", "인천4", "", "070-4754-8741", coupang.address]);
    expect(result[0].rows[0][7]).toBe("13");
  });
});
