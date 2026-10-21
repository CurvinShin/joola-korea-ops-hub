// 스마트스토어 "상품 목록" 파일(한글 상품명)을 견적서 제품군(영문)과 맞춰 본다.
// 순수 함수만 들어 있다. 맞는 제품군을 못 찾으면 null을 돌려주고, 화면에서 사람이 체크해서 처리한다.
//
// 제품군 이름은 listing-priority.ts의 familyOf()가 만드는 것과 같아야 키(keyOf)가 일치한다.

import { keyOf, type FamilyInfo } from "./listing-priority";

const MODELS: Array<[RegExp, string]> = [
  [/페르세우스/, "Perseus"],
  [/코스모스/, "Kosmos"],
  [/애거시|아가시/, "Agassi"],
  [/스콜피우스/, "Scorpeus"],
  [/하이페리온/, "Hyperion"],
  [/그라프/, "Graf"],
  [/매그너스|마그누스/, "Magnus"],
];

function fam(label: string): FamilyInfo {
  return { key: keyOf(label), label };
}

export function storeFamilyOf(rawName: string): FamilyInfo | null {
  const name = rawName.replace(/\s+/g, " ").trim();
  const n = name.replace(/\s+/g, "").toLowerCase();

  // 비전·파워FX·3S 듀얼처럼 라인 이름이 따로 있는 패들(모델 이름보다 먼저 본다).
  if (/더블비전|doublevision/.test(n)) return fam("Double Vision");
  if (/히트비전|heatvision/.test(n)) return fam("Heat Vision");
  if (/하이페리온비전|hyperionvision/.test(n)) return fam("Hyperion Vision");
  if (/3s듀얼|3sdual/.test(n)) return fam("3S Dual");
  if (/파워fx|powerfx/.test(n)) return fam("POWER FX");

  // 패들 커버는 "패들"이 들어 있어도 패들이 아니다.
  if (/네오프렌|패들커버/.test(n)) return fam("Neoprene 패들 커버");

  // 가방·악세사리·양말
  if (/드로스트링백팩/.test(n)) return fam("Drawstring Backpack");
  if (/드로스트링슬링/.test(n)) return fam("Drawstring Sling Bag");
  if (/투어엘리트/.test(n)) return fam("Tour Elite Bag");
  if (/프로백팩/.test(n)) return fam("Pro Backpack");
  if (/리스트밴드|손목밴드|트리니티|wristband/.test(n)) return fam("Wristband");
  if (/엘리멘탈|elemental/.test(n)) return fam("Elemental Net");
  if (/앵클삭스|앵클양말|anklesocks/.test(n)) return fam("Team Ankle Socks");
  if (/크루삭스|크루양말|crewsocks/.test(n)) return fam("Team Crew Socks");
  if (/워드마크.*타올|워드마크.*타월/.test(n)) {
    if (/(타올|타월)l(?![a-z])/.test(n)) return fam("Large Wordmark Towel");
    if (/(타올|타월)s(?![a-z])/.test(n)) return fam("Small Wordmark Towel");
    return null;
  }
  if (/트레이너.*패들.*세트|trainerpaddleset/.test(n)) return fam("Trainer Paddle Set");

  // 공
  if (/hc-?40/.test(n)) return fam("HC-40");
  if (/공세트.*실내|실내.*공세트/.test(n)) return fam("Primo Indoor Plus");

  // 의류·신발 중 이름이 분명한 것
  if (/스코트|skort/.test(n) && /여자|여성|women/.test(n)) return fam("Women's Pickleball Skort");
  if (/반바지/.test(n) && /남자|남성/.test(n)) {
    if (/5인치/.test(n)) return fam("Mens Woven Shorts 5");
    if (/7인치/.test(n)) return fam("Mens Woven Shorts 7");
  }
  if (/r4lly|랠리/.test(n) && /운동화|피클볼화/.test(n)) {
    if (/여자|여성/.test(n)) return fam("Women's R4LLY Shoes");
    if (/남자|남성/.test(n)) return fam("Men's R4LLY Shoes");
    return null;
  }

  // "애거시 시리즈"(2025) 패들은 이름에 세대가 없다: 애거시 프로 = Agassi Pro IV, 그라프 프로 = Graf Pro IV
  if (/애거시시리즈/.test(n)) {
    if (/그라프/.test(n)) return fam("Graf Pro IV");
    if (/애거시프로/.test(n)) return fam("Agassi Pro IV");
  }

  // 모델 이름 + 세대(프로5 = Pro V, 프로4 = Pro IV)가 모두 있는 패들
  const model = MODELS.find(([re]) => re.test(n));
  if (model) {
    if (/프로5|프로v(?![a-z])|prov(?!ision)/.test(n)) return fam(`${model[1]} Pro V`);
    if (/프로4|프로iv|proiv/.test(n)) return fam(`${model[1]} Pro IV`);
  }
  return null;
}

export interface StoreProduct {
  name: string;
  status: string;
}

// 스마트스토어센터 "상품 조회" 파일(.csv 또는 .xlsx)에서 상품명과 판매상태만 읽는다.
// 다른 열(가격·재고·이미지 등)은 읽지 않는다.
export type ParseStoreResult = { ok: true; products: StoreProduct[] } | { ok: false; error: string };

export function parseStoreProductRows(rows: Array<Record<string, unknown>>): ParseStoreResult {
  if (rows.length === 0) return { ok: false, error: "파일에서 읽을 수 있는 상품 행이 없습니다." };
  const first = rows[0];
  const nameKey = Object.keys(first).find((k) => k.trim() === "상품명");
  if (!nameKey) return { ok: false, error: "'상품명' 열이 없습니다. 스마트스토어센터의 상품 조회 파일이 맞는지 확인해주세요." };
  const statusKey = Object.keys(first).find((k) => k.trim() === "판매상태");
  const products: StoreProduct[] = [];
  for (const r of rows) {
    const name = String(r[nameKey] ?? "").replace(/\s+/g, " ").trim();
    if (!name) continue;
    products.push({ name, status: statusKey ? String(r[statusKey] ?? "").trim() : "" });
  }
  if (products.length === 0) return { ok: false, error: "상품명이 있는 행이 없습니다." };
  return { ok: true, products };
}

// 팔지 않는 상태(판매종료·삭제)는 "등록된 제품"으로 세지 않는다.
export function isActiveStatus(status: string): boolean {
  return !/종료|삭제/.test(status);
}

export interface StoreMatchResult {
  matched: Array<{ key: string; label: string; count: number }>;
  unmatched: string[];
  productCount: number;
  ignoredCount: number;
}

export function matchStoreProducts(products: StoreProduct[]): StoreMatchResult {
  const byKey = new Map<string, { key: string; label: string; count: number }>();
  const unmatched: string[] = [];
  let ignored = 0;
  for (const p of products) {
    if (!isActiveStatus(p.status)) {
      ignored += 1;
      continue;
    }
    const f = storeFamilyOf(p.name);
    if (!f) {
      unmatched.push(p.name);
      continue;
    }
    const cur = byKey.get(f.key);
    if (cur) cur.count += 1;
    else byKey.set(f.key, { key: f.key, label: f.label, count: 1 });
  }
  return {
    matched: Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label)),
    unmatched,
    productCount: products.length - ignored,
    ignoredCount: ignored,
  };
}
