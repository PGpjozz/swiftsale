"use client";

import { PageHeader } from "@/components/PageHeader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  priceCents: number;
  reorderLevel: number;
  createdAt: string;
};

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [priceCents, setPriceCents] = useState<string>("");
  const [reorderLevel, setReorderLevel] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingSku, setEditingSku] = useState("");
  const [editingBarcode, setEditingBarcode] = useState("");
  const [editingPriceCents, setEditingPriceCents] = useState<string>("");
  const [editingReorderLevel, setEditingReorderLevel] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true; storeId?: string; products: Product[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load");
      }

      setProducts(data.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cancelEdit();
      }
    }

    if (editingId) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [editingId]);

  const canCreate = useMemo(() => name.trim().length > 0 && !creating, [name, creating]);

  const canSaveEdit = useMemo(
    () =>
      editingId !== null &&
      editingName.trim().length > 0 &&
      !savingEdit &&
      deletingId === null,
    [editingId, editingName, savingEdit, deletingId],
  );

  async function onCreate() {
    if (!canCreate) return;

    setCreating(true);
    setError(null);
    try {
      const parsedPrice = priceCents.trim().length ? Number(priceCents) : 0;
      const parsedReorder = reorderLevel.trim().length ? Number(reorderLevel) : 0;
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim().length ? sku.trim() : null,
          barcode: barcode.trim().length ? barcode.trim() : null,
          priceCents: Number.isFinite(parsedPrice) ? parsedPrice : 0,
          reorderLevel: Number.isFinite(parsedReorder) ? parsedReorder : 0,
        }),
      });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true; product: Product }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to create product");
      }

      setName("");
      setSku("");
      setBarcode("");
      setPriceCents("");
      setReorderLevel("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create product");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(p: Product) {
    setEditingId(p.id);
    setEditingName(p.name);
    setEditingSku(p.sku ?? "");
    setEditingBarcode(p.barcode ?? "");
    setEditingPriceCents(String(p.priceCents ?? 0));
    setEditingReorderLevel(String(p.reorderLevel ?? 0));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
    setEditingSku("");
    setEditingBarcode("");
    setEditingPriceCents("");
    setEditingReorderLevel("");
  }

  async function onSaveEdit() {
    if (!canSaveEdit || !editingId) return;

    setSavingEdit(true);
    setError(null);
    try {
      const parsedPrice = editingPriceCents.trim().length ? Number(editingPriceCents) : 0;
      const parsedReorder = editingReorderLevel.trim().length ? Number(editingReorderLevel) : 0;
      const res = await fetch(`/api/products/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingName.trim(),
            sku: editingSku.trim().length ? editingSku.trim() : null,
            barcode: editingBarcode.trim().length ? editingBarcode.trim() : null,
            priceCents: Number.isFinite(parsedPrice) ? parsedPrice : 0,
            reorderLevel: Number.isFinite(parsedReorder) ? parsedReorder : 0,
          }),
        },
      );

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true; product: Product }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to update product");
      }

      cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update product");
    } finally {
      setSavingEdit(false);
    }
  }

  async function onDelete(id: string) {
    if (deletingId) return;

    const p = products.find((x) => x.id === id);
    const ok = window.confirm(`Delete ${p?.name ?? "this product"}? This cannot be undone.`);
    if (!ok) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }
      const data = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to delete product");
      }

      if (editingId === id) cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Create and manage items, barcodes, pricing, and categories."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 md:col-span-1">
          <div className="text-sm font-medium">Create product</div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium text-zinc-800">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Mineral Water 500ml"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">SKU (optional)</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="SKU-001"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">Barcode (optional)</label>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="1234567890123"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">Price (cents)</label>
              <input
                value={priceCents}
                onChange={(e) => setPriceCents(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="1999"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">Reorder level</label>
              <input
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            <button
              type="button"
              onClick={onCreate}
              disabled={!canCreate}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
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
              <div className="text-sm font-medium">Products</div>
              <div className="mt-1 text-xs text-zinc-600">Showing up to 100 items.</div>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-zinc-600">Loading…</div>
            ) : products.length === 0 ? (
              <div className="text-sm text-zinc-600">No products yet. Create your first one.</div>
            ) : (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div>
                      <div className="font-medium text-zinc-900">{p.name}</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        {p.barcode ? `Barcode: ${p.barcode}` : p.sku ? `SKU: ${p.sku}` : `ID: ${p.id}`}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600">Reorder level: {p.reorderLevel ?? 0}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-zinc-900">{p.priceCents}¢</div>
                      <button
                        type="button"
                        onClick={() => beginEdit(p)}
                        disabled={deletingId !== null || savingEdit}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(p.id)}
                        disabled={deletingId === p.id || savingEdit}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === p.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancelEdit();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Edit product</div>
                <div className="mt-1 text-xs text-zinc-600">Update name, codes, price, and reorder level.</div>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={savingEdit}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-800">Name</label>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-800">SKU (optional)</label>
                <input
                  value={editingSku}
                  onChange={(e) => setEditingSku(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-800">Barcode (optional)</label>
                <input
                  value={editingBarcode}
                  onChange={(e) => setEditingBarcode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-800">Price (cents)</label>
                <input
                  value={editingPriceCents}
                  onChange={(e) => setEditingPriceCents(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-800">Reorder level</label>
                <input
                  value={editingReorderLevel}
                  onChange={(e) => setEditingReorderLevel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                  inputMode="numeric"
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onSaveEdit}
                  disabled={!canSaveEdit}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEdit ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={savingEdit}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
