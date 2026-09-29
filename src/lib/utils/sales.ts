// 스마트스토어 정산 항목은 항상 이 source 문자열로 저장한다 — sales_transactions
// 테이블은 channel="ecommerce"를 다른 이커머스(예: 나중에 Cafe24 등)와도
// 공유할 수 있게 만들어져 있어서, 조회할 때 이 source로 한 번 더 걸러야
// "스마트스토어 매출"만 정확히 뽑힌다. 서버 액션(dealer-portal.ts 계열과
// 같은 이유로 "use server" 파일에는 async 함수만 export 가능)과 페이지
// 양쪽에서 값을 공유해야 해서 별도 유틸 파일로 뺐다.
export const SMARTSTORE_SOURCE = "네이버 스마트스토어(정산)";
