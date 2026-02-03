"use client";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { useCallback, useEffect, useMemo, useState } from "react";

type BillingStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

type StoreRow = {
  id: string;
  name: string;
  billingStatus: BillingStatus;
  createdAt: string;
  tenant: { id: string; name: string; slug: string };
  users: Array<{ id: string; email: string }>;
};

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStoreId, setSavingStoreId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stores", { cache: "no-store" });
      const data = (await res.json()) as
        | { ok: true; stores: StoreRow[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load stores");
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

  const pendingCount = useMemo(
    () => stores.filter((s) => s.billingStatus === "PENDING").length,
    [stores],
  );

  async function setStatus(storeId: string, billingStatus: BillingStatus) {
    setSavingStoreId(storeId);
    setError(null);
    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, billingStatus }),
      });

      const data = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to update store");
      }

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update store");
    } finally {
      setSavingStoreId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Stores"
        subtitle={`Manage store activation (manual verification). Pending: ${pendingCount}`}
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">All stores</div>
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
                <div key={s.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">{s.name}</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Tenant: {s.tenant.name} ({s.tenant.slug}) • Owner: {s.users[0]?.email ?? "—"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Created: {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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
                      onClick={() => void setStatus(s.id, "ACTIVE")}
                      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Activate
                    </button>
                    <button
                      type="button"
                      disabled={savingStoreId === s.id}
                      onClick={() => void setStatus(s.id, "SUSPENDED")}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Suspend
                    </button>
                    <button
                      type="button"
                      disabled={savingStoreId === s.id}
                      onClick={() => void setStatus(s.id, "PENDING")}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Set pending
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
