"use client";

import { PageHeader } from "@/components/PageHeader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  priceCents: number;
};

type CartLine = {
  product: Product;
  quantity: number;
};

type Sale = {
  id: string;
  totalCents: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    product: { id: string; name: string };
  }>;
};

function formatCents(cents: number) {
  const v = Number.isFinite(cents) ? cents : 0;
  return `${(v / 100).toFixed(2)}`;
}

export default function PosPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  const subtotalCents = useMemo(
    () =>
      cart.reduce(
        (sum, line) => sum + (line.product.priceCents ?? 0) * line.quantity,
        0,
      ),
    [cart],
  );
  const taxCents = 0;
  const totalCents = subtotalCents + taxCents;

  const refreshSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const res = await fetch("/api/sales", { cache: "no-store" });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }
      const data = (await res.json()) as
        | { ok: true; sales: Sale[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load sales");
      }

      setRecentSales(data.sales);
    } catch (e) {
      setRecentSales([]);
    } finally {
      setLoadingSales(false);
    }
  }, [router]);

  useEffect(() => {
    void refreshSales();
  }, [refreshSales]);

  async function runLookup(q: string) {
    const trimmed = q.trim();
    setSearchError(null);
    setSearching(true);
    try {
      const url = new URL("/api/pos/lookup", window.location.origin);
      url.searchParams.set("q", trimmed);
      const res = await fetch(url.toString(), { cache: "no-store" });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }
      const data = (await res.json()) as
        | { ok: true; products: Product[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Lookup failed");
      }

      setResults(data.products);
    } catch (e) {
      setResults([]);
      setSearchError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setSearching(false);
    }
  }

  function addToCart(p: Product) {
    setCheckoutError(null);
    setLastSaleId(null);
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product.id === p.id);
      if (idx === -1) return [...prev, { product: p, quantity: 1 }];
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      return next;
    });
    setQuery("");
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function setQty(productId: string, quantity: number) {
    setCart((prev) => {
      const next = prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, quantity }
            : l,
        )
        .filter((l) => Number.isInteger(l.quantity) && l.quantity > 0);
      return next;
    });
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  async function checkout() {
    if (checkingOut) return;
    setCheckoutError(null);
    setLastSaleId(null);

    if (cart.length === 0) {
      setCheckoutError("Cart is empty");
      return;
    }

    setCheckingOut(true);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        }),
      });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }
      const data = (await res.json()) as
        | { ok: true; sale: { id: string } }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Checkout failed");
      }

      setCart([]);
      setLastSaleId(data.sale.id);
      await refreshSales();
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="POS"
        subtitle="Fast checkout UI optimized for keyboard and barcode scanning."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium">Cart</div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-zinc-800">Scan / search</label>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void runLookup(query);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Scan barcode or type product name"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void runLookup(query)}
                disabled={searching || query.trim().length === 0}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searching ? "Searching…" : "Find"}
              </button>
            </div>
          </div>

          {searchError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {searchError}
            </div>
          ) : null}

          {results.length ? (
            <div className="mt-4 rounded-lg border border-zinc-200">
              <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                Results (click to add)
              </div>
              <div className="divide-y divide-zinc-200">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm hover:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-zinc-900">{p.name}</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        {p.barcode ? `Barcode: ${p.barcode}` : p.sku ? `SKU: ${p.sku}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 font-medium text-zinc-900">{formatCents(p.priceCents)}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            {cart.length === 0 ? (
              <div className="text-sm text-zinc-600">Cart is empty. Scan or search to add items.</div>
            ) : (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {cart.map((line) => (
                  <div key={line.product.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-zinc-900">{line.product.name}</div>
                      <div className="mt-1 text-xs text-zinc-600">{formatCents(line.product.priceCents)} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={String(line.quantity)}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setQty(line.product.id, Number.isFinite(n) ? n : 1);
                        }}
                        className="h-10 w-20 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                        inputMode="numeric"
                      />
                      <div className="w-24 text-right font-medium text-zinc-900">
                        {formatCents(line.product.priceCents * line.quantity)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.product.id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium">Totals</div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-zinc-600">Subtotal</div>
              <div className="font-medium text-zinc-900">{formatCents(subtotalCents)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-zinc-600">Tax</div>
              <div className="font-medium text-zinc-900">{formatCents(taxCents)}</div>
            </div>
            <div className="h-px bg-zinc-200" />
            <div className="flex items-center justify-between">
              <div className="text-zinc-900 font-medium">Total</div>
              <div className="text-lg font-semibold tracking-tight text-zinc-900">
                {formatCents(totalCents)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void checkout()}
            disabled={checkingOut || cart.length === 0}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkingOut ? "Processing…" : "Pay / Checkout"}
          </button>

          {checkoutError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {checkoutError}
            </div>
          ) : null}

          {lastSaleId ? (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              Sale completed: {lastSaleId}
            </div>
          ) : null}

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Recent transactions</div>
              <button
                type="button"
                onClick={() => void refreshSales()}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Refresh
              </button>
            </div>

            <div className="mt-3">
              {loadingSales ? (
                <div className="text-sm text-zinc-600">Loading…</div>
              ) : recentSales.length === 0 ? (
                <div className="text-sm text-zinc-600">No sales yet.</div>
              ) : (
                <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                  {recentSales.map((s) => (
                    <div key={s.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-zinc-900">{s.id}</div>
                          <div className="mt-1 text-xs text-zinc-600">
                            {new Date(s.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="shrink-0 font-medium text-zinc-900">
                          {formatCents(s.totalCents)}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-600">
                        {s.items
                          .map((i) => `${i.quantity}x ${i.product.name}`)
                          .join(", ")}
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
