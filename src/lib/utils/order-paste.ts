// 관리자 "주문 직접 만들기"의 붙여넣기 입력을 해석한다.
// 한 줄에 "SKU 수량" — 구분은 공백/탭/쉼표/x/* 어느 것이든 되고(엑셀에서
// 두 열을 복사해 붙여넣어도 됨), 같은 SKU는 수량을 합친다.

export interface PasteCatalogItem {
  product_id: string;
  sku: string;
  name: string;
}

export interface PastedLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
}

export interface PasteResult {
  lines: PastedLine[];
  errors: string[];
}

export function parseOrderPaste(text: string, catalog: PasteCatalogItem[]): PasteResult {
  const bySku = new Map(catalog.map((c) => [c.sku.trim().toLowerCase(), c]));
  const merged = new Map<string, PastedLine>();
  const errors: string[] = [];

  const rows = text.split(/\r?\n/);
  rows.forEach((raw, i) => {
    const row = raw.trim();
    if (!row) return;
    const m = row.match(/^(\S+?)[\s,;:×xX*]+(\d+)\s*(?:개|ea|EA|pcs)?$/);
    if (!m) {
      errors.push(`${i + 1}번째 줄 "${row}": "SKU 수량" 형식이 아닙니다.`);
      return;
    }
    const sku = m[1].trim();
    const quantity = parseInt(m[2], 10);
    const product = bySku.get(sku.toLowerCase());
    if (!product) {
      errors.push(`${i + 1}번째 줄: SKU "${sku}" 상품을 찾을 수 없습니다.`);
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      errors.push(`${i + 1}번째 줄: 수량을 확인해주세요.`);
      return;
    }
    const prev = merged.get(product.product_id);
    if (prev) prev.quantity += quantity;
    else merged.set(product.product_id, { productId: product.product_id, sku: product.sku, name: product.name, quantity });
  });

  return { lines: [...merged.values()], errors };
}
