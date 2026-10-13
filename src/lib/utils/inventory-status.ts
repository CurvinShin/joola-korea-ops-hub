// 재고 페이지 상태 탭 — 주소의 ?status= 값과 1:1로 대응한다(새로고침·링크 공유 시에도 유지).
// 서버 컴포넌트(page.tsx)와 클라이언트 컴포넌트(InventoryBrowser)가 함께 쓰므로,
// "use client" 파일이 아닌 이 일반 모듈에 둔다. ("use client" 파일에서 내보낸 값은
// 서버에서 호출하면 includes() 같은 함수를 쓸 수 없어 페이지 오류가 났다.)
export type InventoryStatus = "all" | "instock" | "outofstock" | "backorder" | "low" | "incoming" | "discontinued" | "gaps";

export const INVENTORY_STATUSES: InventoryStatus[] = ["all", "instock", "outofstock", "backorder", "low", "incoming", "discontinued", "gaps"];
