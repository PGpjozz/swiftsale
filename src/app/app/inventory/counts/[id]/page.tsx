"use client";

import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  reorderLevel: number;
  onHand: number;
  countedQty: number | null;
};

type Session = {
  id: string;
  status: "OPEN" | "FINALIZED";
  note: string | null;
  reference: string | null;
  createdAt: string;
  finalizedAt: string | null;
  createdBy: { id: string; email: string; name: string | null };
};

export default function StockCountDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";

  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/count-sessions/${sessionId}`, { cache: "no-store" });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true; session: Session; items: Item[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load session");
      }

      setSession(data.session);
      setItems(data.items);
    } catch (e) {
      setSession(null);
      setItems([]);
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [router, sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const countedLines = useMemo(() => items.filter((i) => i.countedQty !== null).length, [items]);

  async function setCount(productId: string, qty: number) {
    if (!sessionId) return;
    if (!Number.isInteger(qty) || qty < 0) return;
    setSaving(productId);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/count-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, countedQty: qty }),
      });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to save count");
      }

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save count");
    } finally {
      setSaving(null);
    }
  }

  async function finalize() {
    if (!sessionId) return;
    setFinalizing(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/count-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FINALIZE" }),
      });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to finalize");
      }

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finalize");
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div>
      <PageHeader title="Stock count" subtitle="Enter counted quantities and finalize to post adjustments." />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={session?.status === "FINALIZED" ? "success" : "warning"}>
            {session?.status ?? "—"}
          </Badge>
          <Badge variant="default">Counted: {countedLines}</Badge>
          {session?.reference ? <Badge variant="default">Ref: {session.reference}</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/inventory/counts"
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
          <button
            type="button"
            onClick={finalize}
            disabled={finalizing || session?.status === "FINALIZED"}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {finalizing ? "Finalizing…" : "Finalize"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        {loading ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : !session ? (
          <div className="text-sm text-zinc-600">Session not found.</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-zinc-600">No products in this store.</div>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {items.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">{p.name}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {p.barcode ? `Barcode: ${p.barcode}` : p.sku ? `SKU: ${p.sku}` : `ID: ${p.id}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">On hand: {p.onHand}</Badge>
                  <input
                    disabled={session.status === "FINALIZED" || saving === p.id}
                    defaultValue={p.countedQty ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim().length ? Number(e.target.value) : NaN;
                      if (!Number.isInteger(v) || v < 0) return;
                      void setCount(p.id, v);
                    }}
                    className="w-28 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Count"
                    inputMode="numeric"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
