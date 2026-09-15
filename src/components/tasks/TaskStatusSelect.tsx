"use client";

import { useTransition } from "react";
import { setTaskStatus } from "@/lib/actions/tasks";
import { Select } from "@/components/ui/Input";

export function TaskStatusSelect({ taskId, status }: { taskId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={isPending}
      className="!w-auto py-1"
      onChange={(e) => startTransition(() => setTaskStatus(taskId, e.target.value))}
    >
      <option value="open">오픈</option>
      <option value="in_progress">진행중</option>
      <option value="blocked">보류</option>
      <option value="done">완료</option>
    </Select>
  );
}
