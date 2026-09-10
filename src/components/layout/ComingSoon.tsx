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
          <p className="text-sm font-medium text-slate-500">Coming in Phase 2</p>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            The database schema for this module already exists (see ARCHITECTURE.md), so adding this
            screen later won&apos;t require restructuring any data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
