"use client";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { useCallback, useEffect, useState } from "react";

type Store = {
  id: string;
  name: string;
  billingStatus: "PENDING" | "ACTIVE" | "SUSPENDED";
  createdAt: string;
};

export default function SelectStorePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStoreId, setSavingStoreId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stores", { cache: "no-store" });
      const data = (await res.json()) as
        | { ok: true; stores: Store[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load stores");
      }

      setStores(data.stores);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stores");
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function selectStore(storeId: string) {
    setSavingStoreId(storeId);
    setError(null);
    try {
      const res = await fetch("/api/auth/active-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });

      const data = (await res.json()) as { ok: true } | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to select store");
      }

      window.location.assign("/app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to select store");
    } finally {
      setSavingStoreId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Select store" subtitle="Choose which store you want to manage." />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Stores</div>
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
          ) : stores.length === 0 ? (
            <div className="text-sm text-zinc-600">No stores yet.</div>
          ) : (
            <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
              {stores.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">{s.name}</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Created: {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <Badge
                    variant={
                      s.billingStatus === "ACTIVE"
                        ? "success"
                        : s.billingStatus === "SUSPENDED"
                          ? "danger"
                          : "default"
                    }
                  >
                    {s.billingStatus}
                  </Badge>

                  <button
                    type="button"
                    disabled={savingStoreId === s.id}
                    onClick={() => void selectStore(s.id)}
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingStoreId === s.id ? "Selecting…" : "Select"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
