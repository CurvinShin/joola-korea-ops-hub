// 사업자등록번호 형식 검사. 숫자 10자리(3-2-5)이며, 하이픈 유무는 상관없다.
// 체크섬(마지막 자리 검증)은 일부러 보지 않는다 — 시험용 가짜 번호도 형식만 맞으면 넣을 수 있게.

// "1234567890", "123-45-67890" 모두 "123-45-67890"으로 맞춰 돌려준다. 형식이 틀리면 null.
export function normalizeBusinessNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\d{3}-?\d{2}-?\d{5}$/.test(trimmed)) return null;
  const digits = trimmed.replace(/-/g, "");
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
