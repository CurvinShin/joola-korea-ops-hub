// 딜러 견적서(dealer_quote_items) 품목을 "제품군" 단위로 묶어, 스마트스토어에 새로 올릴 제품의 우선순위를 계산한다.
// 순수 함수만 들어 있다(DB·네트워크 없음). 매주 월요일 자동 분석(서버)과 화면이 같은 계산을 쓴다.
//
// 기준(2026-10-21 사용자와 확정):
// - 데모 판매((demo) 표시)와 0원 무상 제공은 수요로 보지 않는다.
// - 딜러 1곳만 산 제품(독점 판매 패들 등 대량 단발 구매)은 소비자 수요 신호가 약해서 제외한다.
// - 이미 스마트스토어에 올라간 제품군은 후보에서 뺀다(smartstore_listed_families).
// - 점수 = 구매한 딜러 수(35%) + 주문 건수(25%) + 최근 10주 수량(25%) + 매출(15%)의 백분위 합.

export interface QuoteItemRow {
  kr_code: string | null;
  order_no: string | null;
  quote_date: string; // YYYY-MM-DD
  product_name: string;
  category: string;
  subcategory: string | null;
  quantity: number;
  unit_price: number | null;
  amount: number;
}

export interface FamilyInfo {
  key: string;
  label: string;
}

export interface PriorityRow {
  rank: number;
  key: string;
  label: string;
  category: string;
  score: number;
  dealers: number;
  orders: number;
  quantity: number;
  recentQuantity: number;
  amount: number; // 공급가액 합계(부가세 별도)
  medianUnitPrice: number; // 딜러 공급가 중앙값
  skuCount: number;
  sampleNames: string[];
  monthly: Record<string, number>; // YYYY-MM -> 수량
  rankChange?: number | null; // 지난 분석 대비(+면 상승, null이면 새로 등장)
}

export interface ExcludedRow {
  key: string;
  label: string;
  category: string;
  dealers: number;
  quantity: number;
  reason: "exclusive" | "listed";
}

export interface ListingPriorityResult {
  dataThrough: string | null; // 반영된 가장 최근 견적서 날짜
  windowDays: number;
  recentFrom: string | null;
  itemCount: number;
  candidates: PriorityRow[]; // 아직 스마트스토어에 없는 제품군, 점수 높은 순
  excluded: ExcludedRow[];
}

export const RECENT_WINDOW_DAYS = 70; // 최근 10주
export const MIN_DEALERS = 2; // 이보다 적은 딜러가 산 제품은 독점·단발 대량 구매로 보고 제외

// ---------------------------------------------------------------------------
// 제품군 분류
// ---------------------------------------------------------------------------
export function compact(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

export function isDemoName(name: string): boolean {
  return /\(\s*demo\s*\)/i.test(name);
}

// 같은 제품군이 표기만 달라서(Men's / Mens, 공백) 둘로 갈라지지 않게 글자·숫자·한글만 남긴다.
export function keyOf(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

const PADDLE_MODELS = "perseus|kosmos|agassi|scorpeus|hyperion|graf|magnus";
const MODEL_LABEL: Record<string, string> = {
  perseus: "Perseus",
  kosmos: "Kosmos",
  agassi: "Agassi",
  scorpeus: "Scorpeus",
  hyperion: "Hyperion",
  graf: "Graf",
  magnus: "Magnus",
};

const RULES: Array<{ test: RegExp; label: (m: RegExpMatchArray) => string }> = [
  { test: /doublevision/, label: () => "Double Vision" },
  { test: /heatvision/, label: () => "Heat Vision" },
  { test: /hyperionvision|hypervision/, label: () => "Hyperion Vision" },
  { test: /3sdual/, label: () => "3S Dual" },
  { test: new RegExp(`(${PADDLE_MODELS})prov(?!ision)`), label: (m) => `${MODEL_LABEL[m[1]]} Pro V` },
  { test: new RegExp(`(${PADDLE_MODELS})(?:pro)?iv(?![a-z])`), label: (m) => `${MODEL_LABEL[m[1]]} Pro IV` },
  { test: /powerfx/, label: () => "POWER FX" },
  { test: /primoindoorplus/, label: () => "Primo Indoor Plus" },
  { test: /primo3star/, label: () => "Primo 3 Star" },
  { test: /hc-?40/, label: () => "HC-40" },
  { test: /neoprenecover/, label: () => "Neoprene 패들 커버" },
  { test: /drawstringbackpack/, label: () => "Drawstring Backpack" },
  { test: /drawstringslingbag/, label: () => "Drawstring Sling Bag" },
  { test: /tourelite/, label: () => "Tour Elite Bag" },
  { test: /probackpack/, label: () => "Pro Backpack" },
  { test: /wristband/, label: () => "Wristband" },
  { test: /elementalpickleballnet/, label: () => "Elemental Net" },
  { test: /symmetry.*net/, label: () => "Symmetry Net" },
  { test: /women'?s.*r4lly|r4lly.*women/, label: () => "Women's R4LLY Shoes" },
  { test: /men'?s.*r4lly/, label: () => "Men's R4LLY Shoes" },
  { test: /crewsocks/, label: () => "Team Crew Socks" },
  { test: /anklesocks/, label: () => "Team Ankle Socks" },
];

// 규칙에 없는 제품은 이름에서 코드·색상·사이즈를 걷어낸 앞부분을 제품군 이름으로 쓴다.
export function fallbackLabel(productName: string): string {
  let n = productName.replace(/\s+/g, " ").trim();
  n = n.replace(/^(?:\d{5,6}|[A-Za-z]{2}\d{5,6})[,\s]+/, "");
  n = n.replace(/^JA\d{5,6}\s+/i, "");
  n = n.split(",")[0];
  n = n.split(" - ")[0]; // "Dash Pickleball Paddle - Bolt Blue" 처럼 " - " 뒤는 색상·사이즈다
  n = n.replace(/\([^)]*\)?/g, " ");
  n = n.replace(/^JOOLA\s+/i, "");
  n = n.replace(/\s+/g, " ").trim();
  const words = n.split(" ").filter(Boolean).slice(0, 5);
  return words.join(" ") || productName.slice(0, 30);
}

export function familyOf(productName: string): FamilyInfo {
  const c = compact(productName);
  for (const r of RULES) {
    const m = c.match(r.test);
    if (m) {
      const label = r.label(m);
      return { key: keyOf(label), label };
    }
  }
  const label = fallbackLabel(productName);
  return { key: keyOf(label), label };
}

// ---------------------------------------------------------------------------
// 계산
// ---------------------------------------------------------------------------
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function skuOf(name: string): string {
  const m = name.match(/^\s*(\d{5,6})/);
  return m ? m[1] : compact(name).slice(0, 24);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// 백분위(같은 값은 같은 점수).
function percentileMap(values: number[]): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const out = new Map<number, number>();
  for (const v of Array.from(new Set(values))) {
    const le = sorted.filter((x) => x <= v).length;
    out.set(v, sorted.length === 0 ? 0 : le / sorted.length);
  }
  return out;
}

interface Acc {
  key: string;
  label: string;
  categories: Map<string, number>;
  names: Map<string, number>;
  skus: Set<string>;
  dealers: Set<string>;
  orders: Set<string>;
  quantity: number;
  recentQuantity: number;
  amount: number;
  units: number[];
  monthly: Record<string, number>;
}

export interface BuildOptions {
  listedKeys?: Set<string>;
  previousRanks?: Map<string, number>; // key -> 지난 분석의 순위
  windowDays?: number;
  minDealers?: number;
}

function topCategory(a: Acc): string {
  return Array.from(a.categories.entries()).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "기타";
}

export function buildListingPriority(rows: QuoteItemRow[], opts: BuildOptions = {}): ListingPriorityResult {
  const windowDays = opts.windowDays ?? RECENT_WINDOW_DAYS;
  const minDealers = opts.minDealers ?? MIN_DEALERS;
  const listed = opts.listedKeys ?? new Set<string>();

  const valid = rows.filter(
    (r) => !isDemoName(r.product_name) && Number(r.quantity) > 0 && Number(r.amount) > 0
  );
  const dataThrough = rows.reduce<string | null>((m, r) => (m === null || r.quote_date > m ? r.quote_date : m), null);
  const recentFrom = dataThrough ? addDays(dataThrough, -windowDays + 1) : null;

  const acc = new Map<string, Acc>();
  for (const r of valid) {
    const fam = familyOf(r.product_name);
    let a = acc.get(fam.key);
    if (!a) {
      a = {
        key: fam.key,
        label: fam.label,
        categories: new Map(),
        names: new Map(),
        skus: new Set(),
        dealers: new Set(),
        orders: new Set(),
        quantity: 0,
        recentQuantity: 0,
        amount: 0,
        units: [],
        monthly: {},
      };
      acc.set(fam.key, a);
    }
    const q = Number(r.quantity);
    const cleanName = r.product_name.replace(/\s+/g, " ").trim();
    a.categories.set(r.category, (a.categories.get(r.category) ?? 0) + 1);
    a.names.set(cleanName, (a.names.get(cleanName) ?? 0) + 1);
    a.skus.add(skuOf(r.product_name));
    if (r.kr_code) a.dealers.add(r.kr_code);
    a.orders.add(r.order_no ?? `${r.kr_code ?? "?"}|${r.quote_date}`);
    a.quantity += q;
    a.amount += Number(r.amount);
    if (r.unit_price && Number(r.unit_price) > 0) a.units.push(Number(r.unit_price));
    if (recentFrom && r.quote_date >= recentFrom) a.recentQuantity += q;
    const month = r.quote_date.slice(0, 7);
    a.monthly[month] = (a.monthly[month] ?? 0) + q;
  }

  const excluded: ExcludedRow[] = [];
  const eligible: Acc[] = [];
  for (const a of Array.from(acc.values())) {
    if (a.dealers.size < minDealers) {
      excluded.push({ key: a.key, label: a.label, category: topCategory(a), dealers: a.dealers.size, quantity: a.quantity, reason: "exclusive" });
      continue;
    }
    eligible.push(a);
  }

  const pDealers = percentileMap(eligible.map((a) => a.dealers.size));
  const pOrders = percentileMap(eligible.map((a) => a.orders.size));
  const pRecent = percentileMap(eligible.map((a) => a.recentQuantity));
  const pAmount = percentileMap(eligible.map((a) => a.amount));

  const scored = eligible.map((a) => {
    const score =
      100 *
      (0.35 * (pDealers.get(a.dealers.size) ?? 0) +
        0.25 * (pOrders.get(a.orders.size) ?? 0) +
        0.25 * (pRecent.get(a.recentQuantity) ?? 0) +
        0.15 * (pAmount.get(a.amount) ?? 0));
    return { a, score: Math.round(score * 10) / 10 };
  });
  scored.sort((x, y) => y.score - x.score || y.a.amount - x.a.amount);

  const candidates: PriorityRow[] = [];
  for (const { a, score } of scored) {
    if (listed.has(a.key)) {
      excluded.push({ key: a.key, label: a.label, category: topCategory(a), dealers: a.dealers.size, quantity: a.quantity, reason: "listed" });
      continue;
    }
    const prev = opts.previousRanks?.get(a.key);
    const rank = candidates.length + 1;
    candidates.push({
      rank,
      key: a.key,
      label: a.label,
      category: topCategory(a),
      score,
      dealers: a.dealers.size,
      orders: a.orders.size,
      quantity: a.quantity,
      recentQuantity: a.recentQuantity,
      amount: Math.round(a.amount),
      medianUnitPrice: median(a.units),
      skuCount: a.skus.size,
      sampleNames: Array.from(a.names.entries())
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([n]) => n),
      monthly: a.monthly,
      rankChange: opts.previousRanks ? (prev === undefined ? null : prev - rank) : undefined,
    });
  }

  return { dataThrough, windowDays, recentFrom, itemCount: valid.length, candidates, excluded };
}
