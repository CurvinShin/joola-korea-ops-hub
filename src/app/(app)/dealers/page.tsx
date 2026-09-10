import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createDealer } from "@/lib/actions/dealers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { DealerForm } from "@/components/dealers/DealerForm";
import type { DealerStatus } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const statusTone: Record<DealerStatus, "green" | "amber" | "slate" | "red"> = {
  active: "green",
  pending: "amber",
  inactive: "slate",
  terminated: "red",
};

export default async function DealersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; new?: string };
}) {
  const supabase = createClient();
  let query = supabase.from("dealers").select("*").order("name");

  if (searchParams.q) {
    query = query.ilike("name", `%${searchParams.q}%`);
  }
  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: dealers, error } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dealers</h1>
          <p className="text-sm text-slate-500">Contracts, discounts, and order activity by dealer.</p>
        </div>
        <Link href="/dealers?new=1">
          <Button>Add dealer</Button>
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <Input name="q" placeholder="Search by name..." defaultValue={searchParams.q} className="max-w-xs" />
        <Select name="status" defaultValue={searchParams.status ?? ""} className="max-w-[160px]">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{dealers?.length ?? 0} dealers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {dealers && dealers.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Classification</Th>
                  <Th>Status</Th>
                  <Th>Region</Th>
                  <Th>Discount</Th>
                  <Th>Contract ends</Th>
                </Tr>
              </Thead>
              <tbody>
                {dealers.map((d) => (
                  <Tr key={d.id}>
                    <Td>
                      <Link href={`/dealers/${d.id}`} className="font-medium text-brand-700 hover:underline">
                        {d.name}
                      </Link>
                    </Td>
                    <Td className="capitalize">{d.classification.replace("_", " ")}</Td>
                    <Td>
                      <Badge tone={statusTone[d.status as DealerStatus]}>{d.status}</Badge>
                    </Td>
                    <Td>{d.region ?? "—"}</Td>
                    <Td>{d.discount_rate}%</Td>
                    <Td>{d.contract_end ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">No dealers match these filters yet.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="Add dealer" closeHref="/dealers">
          <DealerForm action={createDealer} />
        </Modal>
      )}
    </div>
  );
}
