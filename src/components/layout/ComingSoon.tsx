import { Card, CardContent } from "@/components/ui/Card";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-slate-500">2단계(Phase 2)에서 제공 예정</p>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            이 모듈의 데이터베이스 스키마는 이미 준비되어 있어(ARCHITECTURE.md 참고), 나중에 화면을
            추가할 때 데이터 구조를 다시 설계할 필요가 없습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
