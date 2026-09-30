"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#2563eb", "#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#64748b"];
const numberFmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);

interface SmartstoreChartsProps {
  pieData: { name: string; value: number }[];
  paddleBarData: { name: string; qty: number }[];
  monthBarData: Record<string, string | number>[];
  categories: string[];
}

// 딜러 견적서 CategoryCharts와 구조는 같지만, 스마트스토어는 금액이 아니라
// 수량 기준이라 currency 포맷 대신 숫자 포맷을 쓴다.
export function SmartstoreCharts({ pieData, paddleBarData, monthBarData, categories }: SmartstoreChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>대분류별 판매 수량 비중</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${numberFmt(v)}개`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>패들 세부 라인별 판매 수량</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paddleBarData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${numberFmt(v)}개`} />
              <Bar dataKey="qty" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>월별 대분류 판매 수량 추이</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthBarData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${numberFmt(v)}개`} />
              <Legend />
              {categories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
