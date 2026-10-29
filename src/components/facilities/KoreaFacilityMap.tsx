"use client";

import { useMemo, useState } from "react";
import {
  KOREA_MAP_CREDIT,
  KOREA_MAP_VIEWBOX,
  KOREA_PROVINCES,
} from "@/components/facilities/korea-map-data";
import type { KrRegion } from "@/lib/types/database.types";

// 시/도 모양을 그린 지도 위에 시설 수를 표시한다.
// - 시설이 있는 시/도는 색이 진해지고(1곳 / 2~3곳 / 4곳 이상), 시설 수가 숫자로 표시된다.
// - 마우스를 올리거나 키보드로 포커스하면 그 지역의 시설 이름이 보인다.
// 지도 모양 데이터는 korea-map-data.ts(MapSVG, CC BY 4.0)에서 가져오며, 아래에 출처를 표시한다.

interface MapFacility {
  id: string;
  name: string;
  region: KrRegion | null;
}

const { width: MAP_W, height: MAP_H } = KOREA_MAP_VIEWBOX;

function fillClass(count: number, active: boolean): string {
  if (count === 0) return active ? "fill-slate-300" : "fill-slate-200";
  if (count === 1) return active ? "fill-blue-300" : "fill-blue-200";
  if (count <= 3) return active ? "fill-blue-500" : "fill-blue-400";
  return active ? "fill-brand-700" : "fill-brand-500";
}

export function KoreaFacilityMap({ facilities }: { facilities: MapFacility[] }) {
  const [hovered, setHovered] = useState<KrRegion | null>(null);

  const byRegion = useMemo(() => {
    const map = new Map<KrRegion, MapFacility[]>();
    for (const f of facilities) {
      if (!f.region) continue;
      const list = map.get(f.region) ?? [];
      list.push(f);
      map.set(f.region, list);
    }
    return map;
  }, [facilities]);

  const unassigned = facilities.filter((f) => !f.region).length;
  const placed = facilities.length - unassigned;

  const ranking = KOREA_PROVINCES.map((p) => ({ region: p.region, label: p.label, count: byRegion.get(p.region)?.length ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
  const maxCount = ranking[0]?.count ?? 1;

  // 마우스가 올라간 시/도를 맨 위에 그려서 테두리가 이웃에 가려지지 않게 한다.
  const drawOrder = hovered
    ? [...KOREA_PROVINCES.filter((p) => p.region !== hovered), ...KOREA_PROVINCES.filter((p) => p.region === hovered)]
    : KOREA_PROVINCES;

  const hoveredProvince = hovered ? KOREA_PROVINCES.find((p) => p.region === hovered) : null;
  const hoveredList = hovered ? byRegion.get(hovered) ?? [] : [];

  return (
    <div>
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
        <div className="relative w-full max-w-sm shrink-0">
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="h-auto w-full"
            role="group"
            aria-label="시/도별 시설 지도"
          >
            {drawOrder.map((p) => {
              const count = byRegion.get(p.region)?.length ?? 0;
              const active = hovered === p.region;
              return (
                <path
                  key={p.region}
                  d={p.path}
                  tabIndex={0}
                  aria-label={`${p.label} ${count}곳`}
                  strokeWidth={active ? 1.6 : 1.2}
                  className={`cursor-pointer outline-none transition-colors ${fillClass(count, active)} ${active ? "stroke-slate-700" : "stroke-white"}`}
                  onMouseEnter={() => setHovered(p.region)}
                  onMouseLeave={() => setHovered((r) => (r === p.region ? null : r))}
                  onFocus={() => setHovered(p.region)}
                  onBlur={() => setHovered((r) => (r === p.region ? null : r))}
                />
              );
            })}

            {KOREA_PROVINCES.map((p) => {
              const count = byRegion.get(p.region)?.length ?? 0;
              if (count === 0) return null;
              return (
                <g key={`badge-${p.region}`} pointerEvents="none">
                  <circle cx={p.anchor.x} cy={p.anchor.y} r={count >= 10 ? 13 : 11} className="fill-blue-900 stroke-white" strokeWidth={2} />
                  <text
                    x={p.anchor.x}
                    y={p.anchor.y + 4}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    className="fill-white"
                  >
                    {count}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredProvince && (
            <div
              className="pointer-events-none absolute z-20 w-44 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-lg"
              style={{
                left: `${Math.min(78, Math.max(22, (hoveredProvince.anchor.x / MAP_W) * 100))}%`,
                top: `${(hoveredProvince.anchor.y / MAP_H) * 100}%`,
                transform:
                  hoveredProvince.anchor.y > MAP_H * 0.7
                    ? "translate(-50%, calc(-100% - 18px))"
                    : "translate(-50%, 18px)",
              }}
            >
              <p className="text-xs font-semibold text-slate-900">
                {hoveredProvince.label} · {hoveredList.length}곳
              </p>
              {hoveredList.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {hoveredList.slice(0, 8).map((f) => (
                    <li key={f.id} className="truncate text-[11px] text-slate-600">
                      {f.name}
                    </li>
                  ))}
                  {hoveredList.length > 8 && (
                    <li className="text-[11px] text-slate-400">외 {hoveredList.length - 8}곳</li>
                  )}
                </ul>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">등록된 시설 없음</p>
              )}
            </div>
          )}
        </div>

        <div className="w-full max-w-sm md:w-56 md:max-w-none">
          <p className="text-xs font-semibold text-slate-500">시/도별 시설</p>
          {ranking.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {ranking.map((r) => (
                <li
                  key={r.region}
                  onMouseEnter={() => setHovered(r.region)}
                  onMouseLeave={() => setHovered((h) => (h === r.region ? null : h))}
                  className={`rounded-md px-2 py-1 ${hovered === r.region ? "bg-slate-100" : ""}`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{r.label}</span>
                    <span className="font-medium text-slate-900">{r.count}곳</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">지도에 표시할 시설이 없습니다.</p>
          )}
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            지도에 표시된 시설 {placed}곳
            {unassigned > 0 && <span className="text-slate-400"> · 지역 미지정 {unassigned}곳은 표시되지 않습니다</span>}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-slate-200" /> 없음
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-blue-200" /> 1곳
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-blue-400" /> 2~3곳
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-brand-500" /> 4곳 이상
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-slate-400">
        <a href={KOREA_MAP_CREDIT.href} target="_blank" rel="noreferrer" className="hover:underline">
          {KOREA_MAP_CREDIT.label}
        </a>{" "}
        ({KOREA_MAP_CREDIT.license})
      </p>
    </div>
  );
}
