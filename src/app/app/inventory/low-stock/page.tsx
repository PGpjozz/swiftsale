"use client";

import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  reorderLevel: number;
  priceCents: number;
  onHand: number;
  lowStock: boolean;
};

export default function LowStockPage() {
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/low-stock", { cache: "no-store" });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true; items: InventoryItem[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load low stock");
      }

      setItems(data.items);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Failed to load low stock");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const count = useMemo(() => items.length, [items]);

  return (
    <div>
      <PageHeader title="Low stock" subtitle="Items at or below reorder level." />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={count > 0 ? "danger" : "default"}>Items: {count}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/inventory"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        {loading ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-zinc-600">No low stock items right now.</div>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {items.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">{p.name}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {p.barcode ? `Barcode: ${p.barcode}` : p.sku ? `SKU: ${p.sku}` : `ID: ${p.id}`}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">Reorder level: {p.reorderLevel ?? 0}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="danger">On hand: {p.onHand}</Badge>
                  <Badge variant="danger">Low</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
