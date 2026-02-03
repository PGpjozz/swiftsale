import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireActiveBillingOrRedirect, requireStoreAppUser } from "@/lib/pageAuth";
import Link from "next/link";

type Row = {
  day: Date;
  sale_count: bigint;
  total_cents: bigint;
};

type TopProductRow = {
  product_id: string;
  product_name: string;
  qty: bigint;
  total_cents: bigint;
};

type CashierRow = {
  user_id: string;
  email: string;
  name: string | null;
  sale_count: bigint;
  total_cents: bigint;
};

function formatCents(cents: number) {
  const v = Number.isFinite(cents) ? cents : 0;
  return `${(v / 100).toFixed(2)}`;
}

export default async function ReportsPage() {
  const user = await requireStoreAppUser("/app/reports");
  requireActiveBillingOrRedirect(user, "/app/reports");

  const storeId = user.storeId;

  const rows = (await prisma.$queryRaw<Row[]>`
    select
      date_trunc('day', "createdAt") as day,
      count(*) as sale_count,
      coalesce(sum("totalCents"), 0) as total_cents
    from "Sale"
    where "storeId" = ${storeId}
      and "createdAt" >= now() - interval '14 days'
    group by 1
    order by 1 desc
  `) ?? [];

  const normalized = rows.map((r) => ({
    day: new Date(r.day),
    saleCount: Number(r.sale_count),
    totalCents: Number(r.total_cents),
  }));

  const totalCents14d = normalized.reduce((s, r) => s + r.totalCents, 0);
  const totalSales14d = normalized.reduce((s, r) => s + r.saleCount, 0);

  const topProducts = (await prisma.$queryRaw<TopProductRow[]>`
    select
      p.id as product_id,
      p.name as product_name,
      coalesce(sum(si.quantity), 0) as qty,
      coalesce(sum(si."lineTotalCents"), 0) as total_cents
    from "SaleItem" si
    join "Sale" s on s.id = si."saleId"
    join "Product" p on p.id = si."productId"
    where s."storeId" = ${storeId}
      and s."createdAt" >= now() - interval '14 days'
    group by p.id, p.name
    order by qty desc
    limit 10
  `) ?? [];

  const cashiers = (await prisma.$queryRaw<CashierRow[]>`
    select
      u.id as user_id,
      u.email as email,
      u.name as name,
      coalesce(count(*), 0) as sale_count,
      coalesce(sum(s."totalCents"), 0) as total_cents
    from "Sale" s
    join "User" u on u.id = s."userId"
    where s."storeId" = ${storeId}
      and s."createdAt" >= now() - interval '14 days'
    group by u.id, u.email, u.name
    order by total_cents desc
    limit 20
  `) ?? [];

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Reports" subtitle="Daily sales totals (last 14 days)." />
        <div className="mt-1 flex items-center gap-2">
          <Link
            href="/api/reports/export?type=sales&days=14"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Export sales CSV
          </Link>
          <Link
            href="/api/reports/export?type=sale-items&days=14"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Export items CSV
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-600">Total sales (14d)</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{totalSales14d}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-600">Revenue (14d)</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{formatCents(totalCents14d)}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-600">Avg. sale (14d)</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {totalSales14d > 0 ? formatCents(Math.round(totalCents14d / totalSales14d)) : "0.00"}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-medium">Daily breakdown</div>
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Sales</th>
                <th className="px-3 py-2">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {normalized.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-zinc-600" colSpan={3}>
                    No sales in the last 14 days.
                  </td>
                </tr>
              ) : (
                normalized.map((r) => (
                  <tr key={r.day.toISOString()}>
                    <td className="px-3 py-2">{r.day.toLocaleDateString()}</td>
                    <td className="px-3 py-2">{r.saleCount}</td>
                    <td className="px-3 py-2">{formatCents(r.totalCents)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Top products (14d)</div>
              <div className="mt-1 text-xs text-zinc-600">By quantity sold.</div>
            </div>
            <Link
              href="/api/reports/export?type=top-products&days=14"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              CSV
            </Link>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {topProducts.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-zinc-600" colSpan={3}>
                      No sales data.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((r) => (
                    <tr key={r.product_id}>
                      <td className="px-3 py-2">{r.product_name}</td>
                      <td className="px-3 py-2">{Number(r.qty)}</td>
                      <td className="px-3 py-2">{formatCents(Number(r.total_cents))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Cashier performance (14d)</div>
              <div className="mt-1 text-xs text-zinc-600">By revenue.</div>
            </div>
            <Link
              href="/api/reports/export?type=cashiers&days=14"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              CSV
            </Link>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Cashier</th>
                  <th className="px-3 py-2">Sales</th>
                  <th className="px-3 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {cashiers.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-zinc-600" colSpan={3}>
                      No sales data.
                    </td>
                  </tr>
                ) : (
                  cashiers.map((r) => (
                    <tr key={r.user_id}>
                      <td className="px-3 py-2">{r.name ? `${r.name} (${r.email})` : r.email}</td>
                      <td className="px-3 py-2">{Number(r.sale_count)}</td>
                      <td className="px-3 py-2">{formatCents(Number(r.total_cents))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
