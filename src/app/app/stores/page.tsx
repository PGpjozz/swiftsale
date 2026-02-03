"use client";

import { PageHeader } from "@/components/PageHeader";
import { useCallback, useEffect, useMemo, useState } from "react";

type Store = {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
};

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stores", { cache: "no-store" });
      const data = (await res.json()) as
        | { ok: true; tenantId?: string; stores: Store[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load");
      }

      setStores(data.stores);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canCreate = useMemo(() => name.trim().length > 0 && !creating, [name, creating]);

  async function onCreate() {
    if (!canCreate) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = (await res.json()) as
        | { ok: true; store: Store }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to create store");
      }

      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create store");
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string) {
    if (deletingId) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${id}`, { method: "DELETE" });
      const data = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to delete store");
      }

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete store");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Stores" subtitle="Create and manage stores for your tenant." />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 md:col-span-1">
          <div className="text-sm font-medium">Create store</div>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-sm font-medium text-zinc-800">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Main Store"
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
              <div className="text-sm font-medium">Your stores</div>
              <div className="mt-1 text-xs text-zinc-600">Delete is permanent.</div>
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
            ) : stores.length === 0 ? (
              <div className="text-sm text-zinc-600">No stores yet. Create your first one.</div>
            ) : (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {stores.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div>
                      <div className="font-medium text-zinc-900">{s.name}</div>
                      <div className="mt-1 text-xs text-zinc-600">ID: {s.id}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === s.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
