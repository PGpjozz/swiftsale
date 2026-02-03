import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireActiveBillingOrRedirect, requireStoreAppUser } from "@/lib/pageAuth";

function formatCents(cents: number) {
  const v = Number.isFinite(cents) ? cents : 0;
  return `${(v / 100).toFixed(2)}`;
}

export default async function SalesPage() {
  const user = await requireStoreAppUser("/app/sales");
  requireActiveBillingOrRedirect(user, "/app/sales");
  const storeId = user.storeId;

  const sales = storeId
    ? await prisma.sale.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        items: {
          take: 3,
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })
    : [];

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Recent transactions for your store."
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        {sales.length === 0 ? (
          <div className="text-sm text-zinc-600">No sales yet.</div>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {sales.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/app/sales/${s.id}`}
                      className="truncate text-sm font-medium text-zinc-900 hover:underline"
                    >
                      Sale #{s.id.slice(0, 8)}
                    </Link>
                    <span className="text-xs text-zinc-600">
                      {new Date(s.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    {s.items.length === 0
                      ? "No items"
                      : s.items
                        .map((i) => i.product.name)
                        .join(", ")}
                    {s.items.length >= 3 ? "…" : ""}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <div className="text-sm font-semibold">{formatCents(s.totalCents)}</div>
                  <Link
                    href={`/app/sales/${s.id}`}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
