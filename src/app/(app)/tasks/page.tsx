import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTask, updateTask, deleteTask } from "@/lib/actions/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskStatusSelect } from "@/components/tasks/TaskStatusSelect";
import type { TaskPriority, TaskStatus } from "@/lib/types/database.types";
import { taskPriorityLabel, taskStatusLabel, taskCategoryLabel } from "@/lib/utils/labels";

export const dynamic = "force-dynamic";

const priorityTone: Record<TaskPriority, "slate" | "blue" | "amber" | "red"> = {
  low: "slate",
  medium: "blue",
  high: "amber",
  urgent: "red",
};

const statusTone: Record<TaskStatus, "slate" | "blue" | "amber" | "green"> = {
  open: "slate",
  in_progress: "blue",
  blocked: "amber",
  done: "green",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string; new?: string; edit?: string };
}) {
  const supabase = createClient();

  let query = supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.priority) query = query.eq("priority", searchParams.priority);

  const [{ data: tasks, error }, { data: dealers }, { data: events }] = await Promise.all([
    query,
    supabase.from("dealers").select("id, name").order("name"),
    supabase.from("events").select("id, name").order("event_date", { ascending: false }),
  ]);

  const dealerOptions = dealers ?? [];
  const eventOptions = events ?? [];
  const editRow = searchParams.edit ? tasks?.find((t) => t.id === searchParams.edit) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">작업</h1>
          <p className="text-sm text-slate-500">해야 할 모든 일을 한 목록에서 관리합니다.</p>
        </div>
        <Link href="/tasks?new=1">
          <Button>작업 추가</Button>
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <Select name="status" defaultValue={searchParams.status ?? ""} className="max-w-[160px]">
          <option value="">전체 상태</option>
          <option value="open">오픈</option>
          <option value="in_progress">진행중</option>
          <option value="blocked">보류</option>
          <option value="done">완료</option>
        </Select>
        <Select name="priority" defaultValue={searchParams.priority ?? ""} className="max-w-[160px]">
          <option value="">전체 우선순위</option>
          <option value="urgent">긴급</option>
          <option value="high">높음</option>
          <option value="medium">보통</option>
          <option value="low">낮음</option>
        </Select>
        <Button type="submit" variant="secondary">
          필터
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>작업 {tasks?.length ?? 0}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {tasks && tasks.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>작업</Th>
                  <Th>분류</Th>
                  <Th>우선순위</Th>
                  <Th>마감일</Th>
                  <Th>상태</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {tasks.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-medium text-slate-900">{t.title}</Td>
                    <Td>{taskCategoryLabel[t.category] ?? t.category}</Td>
                    <Td>
                      <Badge tone={priorityTone[t.priority as TaskPriority]}>
                        {taskPriorityLabel[t.priority] ?? t.priority}
                      </Badge>
                    </Td>
                    <Td>{t.due_date ?? "—"}</Td>
                    <Td>
                      <TaskStatusSelect taskId={t.id} status={t.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/tasks?edit=${t.id}`} className="text-brand-600 hover:underline">
                          수정
                        </Link>
                        <form action={deleteTask.bind(null, t.id)}>
                          <button className="text-red-600 hover:underline">삭제</button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">조건에 맞는 작업이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="작업 추가" closeHref="/tasks">
          <TaskForm action={createTask} dealerOptions={dealerOptions} eventOptions={eventOptions} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.title} 수정`} closeHref="/tasks">
          <TaskForm
            action={updateTask.bind(null, editRow.id)}
            defaultValues={editRow}
            dealerOptions={dealerOptions}
            eventOptions={eventOptions}
          />
        </Modal>
      )}
    </div>
  );
}
