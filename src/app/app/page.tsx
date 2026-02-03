import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveBillingOrRedirect, requireStoreAppUser } from "@/lib/pageAuth";
import DemoSeedButton from "@/app/app/DemoSeedButton";

export default async function DashboardPage() {
  const user = await requireStoreAppUser("/app");
  requireActiveBillingOrRedirect(user, "/app");

  const storeId = user?.storeId;

  const store = storeId
    ? await prisma.store.findFirst({
      where: {
        id: storeId,
        tenantId: user.tenantId,
      },
    })
    : null;

  const [productCount, recentProducts] = storeId
    ? await Promise.all([
      prisma.product.count({ where: { storeId } }),
      prisma.product.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          priceCents: true,
          createdAt: true,
        },
      }),
    ])
    : [0, []];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          store
            ? `Store: ${store.name}`
            : "Your store overview."
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-600">Products</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{productCount}</div>
          <div className="mt-3">
            <Link
              href="/app/products"
              className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Manage products
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-600">POS</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">Ready</div>
          <div className="mt-3">
            <Link
              href="/app/pos"
              className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Open POS
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-600">Inventory</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">Coming next</div>
          <div className="mt-3">
            <Link
              href="/app/inventory"
              className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              View inventory
            </Link>
          </div>
        </div>

        {user.role === "STORE_OWNER" ? <DemoSeedButton /> : null}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Recent products</div>
            <div className="mt-1 text-xs text-zinc-600">
              Latest items created in this store.
            </div>
          </div>
          <Link
            href="/app/products"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            View all
          </Link>
        </div>

        <div className="mt-4">
          {!store ? (
            <div className="text-sm text-zinc-600">
              No store found for your account.
            </div>
          ) : recentProducts.length === 0 ? (
            <div className="text-sm text-zinc-600">
              No products yet. Create your first product to get started.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
              {recentProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900">{p.name}</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="shrink-0 font-medium text-zinc-900">{p.priceCents}¢</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-medium">Signed in</div>
        <div className="mt-2 text-sm text-zinc-600">
          {user ? `${user.email} (${user.role})` : "—"}
        </div>
      </div>
    </div>
  );
}
