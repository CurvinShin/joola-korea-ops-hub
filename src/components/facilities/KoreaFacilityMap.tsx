"use client";

import { useMemo, useState } from "react";
import { krRegionLabel } from "@/lib/utils/labels";
import type { KrRegion } from "@/lib/types/database.types";

// Approximate position of each 시/도 as a percentage within the map's
// bounding box (lat 32.8–38.7, lon 125.0–129.7), so the layout is a rough
// but real reflection of each region's location — not a precise polygon
// boundary, just enough to show "where" at a glance. Jeju sits below a
// divider since it's an island well south of the mainland.
const REGION_POSITIONS: Record<KrRegion, { x: number; y: number }> = {
  seoul: { x: 42.1, y: 19.2 },
  incheon: { x: 36.2, y: 21.0 },
  gyeonggi: { x: 48.9, y: 22.0 },
  gangwon: { x: 68.1, y: 15.3 },
  chungbuk: { x: 58.5, y: 32.2 },
  chungnam: { x: 36.2, y: 36.4 },
  daejeon: { x: 50.6, y: 39.8 },
  sejong: { x: 48.5, y: 36.4 },
  jeonbuk: { x: 44.7, y: 48.3 },
  jeonnam: { x: 41.5, y: 65.3 },
  gwangju: { x: 39.4, y: 60.0 },
  gyeongbuk: { x: 81.9, y: 38.1 },
  daegu: { x: 76.6, y: 48.0 },
  gyeongnam: { x: 67.0, y: 57.6 },
  busan: { x: 86.8, y: 59.7 },
  ulsan: { x: 91.7, y: 53.6 },
  jeju: { x: 32.6, y: 90.2 },
};

const REGION_ORDER = Object.keys(REGION_POSITIONS) as KrRegion[];

interface MapFacility {
  id: string;
  name: string;
  region: KrRegion | null;
}

function bucket(count: number): { className: string; textClassName: string } {
  if (count === 0) return { className: "bg-slate-100 border-slate-200", textClassName: "text-slate-400" };
  if (count === 1) return { className: "bg-brand-100 border-brand-100", textClassName: "text-brand-700" };
  if (count <= 3) return { className: "bg-brand-500 border-brand-500", textClassName: "text-white" };
  return { className: "bg-brand-700 border-brand-700", textClassName: "text-white" };
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

  const unassigned = facilities.filter((f) => !f.region);

  return (
    <div>
      <div className="relative mx-auto aspect-[5/6] w-full max-w-md">
        {REGION_ORDER.map((region) => {
          const pos = REGION_POSITIONS[region];
          const list = byRegion.get(region) ?? [];
          const { className, textClassName } = bucket(list.length);
          const isHovered = hovered === region;
          return (
            <button
              key={region}
              type="button"
              onMouseEnter={() => setHovered(region)}
              onMouseLeave={() => setHovered((r) => (r === region ? null : r))}
              onFocus={() => setHovered(region)}
              onBlur={() => setHovered((r) => (r === region ? null : r))}
              className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border text-[11px] font-semibold leading-none transition-transform ${className} ${textClassName} ${isHovered ? "z-20 scale-110 shadow-md" : "z-10"}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <span>{krRegionLabel[region]}</span>
              {list.length > 0 && <span className="mt-0.5 text-[10px] font-normal opacity-90">{list.length}</span>}

              {isHovered && (
                <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-lg">
                  <p className="text-xs font-semibold text-slate-900">{krRegionLabel[region]}</p>
                  {list.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {list.map((f) => (
                        <li key={f.id} className="truncate text-[11px] font-normal normal-case text-slate-600">
                          {f.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[11px] font-normal normal-case text-slate-400">등록된 시설 없음</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-slate-200 bg-slate-100" /> 없음
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-brand-100 bg-brand-100" /> 1곳
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-brand-500 bg-brand-500" /> 2~3곳
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-brand-700 bg-brand-700" /> 4곳 이상
        </div>
      </div>

      {unassigned.length > 0 && (
        <p className="mt-3 text-center text-xs text-slate-400">
          지역 미지정 시설 {unassigned.length}곳은 지도에 표시되지 않습니다.
        </p>
      )}
    </div>
  );
}
