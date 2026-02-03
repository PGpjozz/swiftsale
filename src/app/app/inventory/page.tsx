"use client";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

type Movement = {
  id: string;
  type: "RECEIVE" | "ADJUST" | "SALE";
  quantityDelta: number;
  note: string | null;
  reference: string | null;
  createdAt: string;
  product: { id: string; name: string };
  sale: { id: string } | null;
};

export default function InventoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState<string>("");
  const [type, setType] = useState<"RECEIVE" | "ADJUST">("RECEIVE");
  const [quantity, setQuantity] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [summaryRes, movementRes] = await Promise.all([
        fetch("/api/inventory/summary", { cache: "no-store" }),
        fetch("/api/inventory/movements", { cache: "no-store" }),
      ]);

      if (summaryRes.status === 402 || movementRes.status === 402) {
        router.push("/app/billing");
        return;
      }

      const summaryData = (await summaryRes.json()) as
        | { ok: true; items: InventoryItem[] }
        | { ok: false; error: string };
      const movementData = (await movementRes.json()) as
        | { ok: true; movements: Movement[] }
        | { ok: false; error: string };

      if (!summaryRes.ok || summaryData.ok === false) {
        throw new Error("error" in summaryData ? summaryData.error : "Failed to load inventory");
      }
      if (!movementRes.ok || movementData.ok === false) {
        throw new Error("error" in movementData ? movementData.error : "Failed to load movements");
      }

      setItems(summaryData.items);
      setMovements(movementData.movements);

      if (!productId && summaryData.items.length > 0) {
        setProductId(summaryData.items[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory");
      setItems([]);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [productId, router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const lowStockCount = useMemo(() => items.filter((i) => i.lowStock).length, [items]);

  const visibleItems = useMemo(
    () => (showLowStockOnly ? items.filter((i) => i.lowStock) : items),
    [items, showLowStockOnly],
  );

  async function submitMovement() {
    if (!productId) return;

    const parsedQty = quantity.trim().length ? Number(quantity) : NaN;
    if (!Number.isInteger(parsedQty) || parsedQty === 0) {
      setError("Quantity must be a non-zero integer");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          type,
          quantity: parsedQty,
          note: note.trim().length ? note.trim() : null,
          reference: reference.trim().length ? reference.trim() : null,
        }),
      });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to save movement");
      }

      setQuantity("");
      setNote("");
      setReference("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save movement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Inventory"
          subtitle="Stock on hand, receiving, adjustments, and audit trail."
        />
        <div className="mt-1 flex items-center gap-2">
          <Link
            href="/app/inventory/low-stock"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Low stock
          </Link>
          <Link
            href="/app/inventory/counts"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Stock counts
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 md:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">New movement</div>
              <div className="mt-1 text-xs text-zinc-600">Update stock for one product.</div>
            </div>
            <Badge variant={lowStockCount > 0 ? "danger" : "default"}>
              Low stock: {lowStockCount}
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium text-zinc-800">Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                {items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value === "ADJUST" ? "ADJUST" : "RECEIVE")}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="RECEIVE">Receive (+)</option>
                <option value="ADJUST">Adjust (+/-)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">Quantity</label>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder={type === "RECEIVE" ? "10" : "-2"}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Supplier delivery / Damaged / Counted"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">Reference (optional)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="GRN-0001 / INV-123"
              />
            </div>

            <button
              type="button"
              onClick={submitMovement}
              disabled={saving || items.length === 0}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save movement"}
            </button>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Stock on hand</div>
              <div className="mt-1 text-xs text-zinc-600">Calculated from stock movements.</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLowStockOnly((v) => !v)}
                className={
                  showLowStockOnly
                    ? "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    : "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                }
              >
                {showLowStockOnly ? "Showing low stock" : "Filter low stock"}
              </button>

              <button
                type="button"
                onClick={refresh}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-zinc-600">Loading…</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-zinc-600">No products yet. Create products first.</div>
            ) : showLowStockOnly && visibleItems.length === 0 ? (
              <div className="text-sm text-zinc-600">No low stock items right now.</div>
            ) : (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {visibleItems.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-900">{p.name}</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        {p.barcode
                          ? `Barcode: ${p.barcode}`
                          : p.sku
                            ? `SKU: ${p.sku}`
                            : `ID: ${p.id}`}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600">Reorder level: {p.reorderLevel ?? 0}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <div className="flex items-center gap-2">
                        <Badge variant={p.lowStock ? "danger" : "default"}>
                          On hand: {p.onHand}
                        </Badge>
                        {p.lowStock ? <Badge variant="danger">Low</Badge> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setProductId(p.id)}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                      >
                        Move
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-sm font-medium">Recent movements</div>
            <div className="mt-1 text-xs text-zinc-600">Latest 50 movements.</div>

            <div className="mt-3">
              {movements.length === 0 ? (
                <div className="text-sm text-zinc-600">No movements yet.</div>
              ) : (
                <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                  {movements.map((m) => (
                    <div key={m.id} className="flex flex-col gap-1 p-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-900">{m.product.name}</div>
                        <div className="mt-1 text-xs text-zinc-600">
                          {new Date(m.createdAt).toLocaleString()}
                          {m.reference ? ` • Ref: ${m.reference}` : ""}
                          {m.note ? ` • ${m.note}` : ""}
                          {m.sale ? ` • Sale #${m.sale.id.slice(0, 8)}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <Badge
                          variant={
                            m.type === "RECEIVE"
                              ? "success"
                              : m.type === "SALE"
                                ? "danger"
                                : "default"
                          }
                        >
                          {m.type}
                        </Badge>
                        <div className={m.quantityDelta < 0 ? "font-semibold text-red-700" : "font-semibold text-emerald-700"}>
                          {m.quantityDelta}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
