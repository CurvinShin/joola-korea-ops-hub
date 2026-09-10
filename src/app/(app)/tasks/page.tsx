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
          <h1 className="text-xl font-semibold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">Everything on your plate, in one list.</p>
        </div>
        <Link href="/tasks?new=1">
          <Button>Add task</Button>
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <Select name="status" defaultValue={searchParams.status ?? ""} className="max-w-[160px]">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </Select>
        <Select name="priority" defaultValue={searchParams.priority ?? ""} className="max-w-[160px]">
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{tasks?.length ?? 0} tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {tasks && tasks.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>Task</Th>
                  <Th>Category</Th>
                  <Th>Priority</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {tasks.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-medium text-slate-900">{t.title}</Td>
                    <Td className="capitalize">{t.category.replace("_", " ")}</Td>
                    <Td>
                      <Badge tone={priorityTone[t.priority as TaskPriority]}>{t.priority}</Badge>
                    </Td>
                    <Td>{t.due_date ?? "—"}</Td>
                    <Td>
                      <TaskStatusSelect taskId={t.id} status={t.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/tasks?edit=${t.id}`} className="text-brand-600 hover:underline">
                          Edit
                        </Link>
                        <form action={deleteTask.bind(null, t.id)}>
                          <button className="text-red-600 hover:underline">Delete</button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">No tasks match these filters.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="Add task" closeHref="/tasks">
          <TaskForm action={createTask} dealerOptions={dealerOptions} eventOptions={eventOptions} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`Edit ${editRow.title}`} closeHref="/tasks">
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
