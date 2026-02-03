"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SeedResult =
  | {
      ok: true;
      productsUpserted: number;
      receiveMovementsCreated: number;
      salesCreated: number;
      saleItemsCreated: number;
      saleMovementsCreated: number;
    }
  | { ok: false; error: string };

export default function DemoSeedButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SeedResult | null>(null);

  const canRun = useMemo(() => !loading, [loading]);

  async function onRun() {
    if (!canRun) return;

    const ok = window.confirm(
      "Seed demo data into the currently selected store? This will create products, inventory, and sample sales for reports.",
    );
    if (!ok) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = (await res.json()) as SeedResult;

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to seed demo data");
      }

      setResult(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to seed demo data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-medium">Demo data</div>
      <div className="mt-1 text-xs text-zinc-600">
        Populate this store with realistic products, inventory, and sample sales.
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={!canRun}
        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Seeding…" : "Seed demo data"}
      </button>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {result && result.ok ? (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          <div>Products upserted: {result.productsUpserted}</div>
          <div>Receiving movements created: {result.receiveMovementsCreated}</div>
          <div>Sales created: {result.salesCreated}</div>
        </div>
      ) : null}
    </div>
  );
}
