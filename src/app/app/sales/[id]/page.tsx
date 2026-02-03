import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireActiveBillingOrRedirect, requireStoreAppUser } from "@/lib/pageAuth";

function formatCents(cents: number) {
  const v = Number.isFinite(cents) ? cents : 0;
  return `${(v / 100).toFixed(2)}`;
}

export default async function SaleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStoreAppUser(`/app/sales/${params.id}`);
  requireActiveBillingOrRedirect(user, `/app/sales/${params.id}`);
  const storeId = user.storeId;

  if (!storeId) notFound();

  const sale = await prisma.sale.findFirst({
    where: { id: params.id, storeId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!sale) notFound();

  return (
    <div>
      <PageHeader
        title={`Sale #${sale.id.slice(0, 8)}`}
        subtitle={new Date(sale.createdAt).toLocaleString()}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 md:col-span-2">
          <div className="text-sm font-medium">Items</div>

          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2 text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {sale.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      {i.product.name}
                    </td>
                    <td className="px-3 py-2">{i.quantity}</td>
                    <td className="px-3 py-2">{formatCents(i.unitPriceCents)}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCents(i.lineTotalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium">Totals</div>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-zinc-600">Subtotal</div>
              <div className="font-medium">{formatCents(sale.subtotalCents)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-zinc-600">Tax</div>
              <div className="font-medium">{formatCents(sale.taxCents)}</div>
            </div>
            <div className="h-px bg-zinc-200" />
            <div className="flex items-center justify-between">
              <div className="font-medium">Total</div>
              <div className="text-lg font-semibold">{formatCents(sale.totalCents)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
