"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Tenant = { id: string; slug: string; name: string };
type Store = { id: string; name: string; tenantId: string };
type User = { id: string; email: string; role: string; tenantId: string; storeId: string | null };

type TenantRow = Tenant & {
  billingStatus: "PENDING" | "ACTIVE" | "SUSPENDED";
  stores: Array<{ id: string }>;
};

export default function AdminClient() {
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [storeName, setStoreName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenantLoadError, setTenantLoadError] = useState<string | null>(null);

  const [addStoreTenantId, setAddStoreTenantId] = useState<string>("");
  const [addStoreName, setAddStoreName] = useState<string>("");
  const [addingStore, setAddingStore] = useState(false);
  const [addStoreError, setAddStoreError] = useState<string | null>(null);
  const [addStoreResult, setAddStoreResult] = useState<Store | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tenant: Tenant; store: Store; user: User } | null>(null);

  const canSubmit = useMemo(
    () =>
      tenantName.trim().length > 0 &&
      storeName.trim().length > 0 &&
      ownerEmail.trim().length > 0 &&
      ownerPassword.length >= 8 &&
      !loading,
    [tenantName, storeName, ownerEmail, ownerPassword, loading],
  );

  const canAddStore = useMemo(
    () => addStoreTenantId.length > 0 && addStoreName.trim().length > 0 && !addingStore,
    [addStoreTenantId, addStoreName, addingStore],
  );

  const refreshTenants = useCallback(async () => {
    setLoadingTenants(true);
    setTenantLoadError(null);
    try {
      const res = await fetch("/api/admin/tenants", { cache: "no-store" });
      const data = (await res.json()) as
        | { ok: true; tenants: TenantRow[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load tenants");
      }

      setTenants(data.tenants);
    } catch (e) {
      setTenants([]);
      setTenantLoadError(e instanceof Error ? e.message : "Failed to load tenants");
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  useEffect(() => {
    void refreshTenants();
  }, [refreshTenants]);

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: tenantName.trim(),
          tenantSlug: tenantSlug.trim() || undefined,
          storeName: storeName.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerPassword,
          ownerName: ownerName.trim() || undefined,
        }),
      });

      const data = (await res.json()) as
        | { ok: true; tenant: Tenant; store: Store; user: User }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Onboarding failed");
      }

      setResult({ tenant: data.tenant, store: data.store, user: data.user });
      setTenantName("");
      setTenantSlug("");
      setStoreName("");
      setOwnerEmail("");
      setOwnerPassword("");
      setOwnerName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onboarding failed");
    } finally {
      setLoading(false);
    }
  }, [canSubmit, ownerEmail, ownerName, ownerPassword, storeName, tenantName, tenantSlug]);

  const onAddStore = useCallback(async () => {
    if (!canAddStore) return;

    setAddingStore(true);
    setAddStoreError(null);
    setAddStoreResult(null);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: addStoreTenantId, name: addStoreName.trim() }),
      });

      const data = (await res.json()) as
        | { ok: true; store: Store }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to create store");
      }

      setAddStoreResult(data.store);
      setAddStoreName("");
      await refreshTenants();
    } catch (e) {
      setAddStoreError(e instanceof Error ? e.message : "Failed to create store");
    } finally {
      setAddingStore(false);
    }
  }, [addStoreName, addStoreTenantId, canAddStore, refreshTenants]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="text-xl font-semibold tracking-tight">Add store</div>
        <p className="mt-1 text-sm text-zinc-600">Add an additional store to an existing tenant.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-800">Tenant</label>
            <select
              value={addStoreTenantId}
              onChange={(e) => setAddStoreTenantId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="">Select tenant…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
            {loadingTenants ? (
              <div className="mt-2 text-xs text-zinc-600">Loading tenants…</div>
            ) : tenantLoadError ? (
              <div className="mt-2 text-xs text-red-700">{tenantLoadError}</div>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-800">Store name</label>
            <input
              value={addStoreName}
              onChange={(e) => setAddStoreName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Branch 2"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onAddStore}
          disabled={!canAddStore}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addingStore ? "Creating…" : "Create store"}
        </button>

        {addStoreError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {addStoreError}
          </div>
        ) : null}

        {addStoreResult ? (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <div className="font-medium">Store created</div>
            <div className="mt-2">{addStoreResult.name}</div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="text-xl font-semibold tracking-tight">Provider admin</div>
        <p className="mt-1 text-sm text-zinc-600">Create a tenant, its first store, and the store owner login.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-800">Tenant name</label>
            <input
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Swift Mart Group"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-800">Tenant slug (optional)</label>
            <input
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="swift-mart-group"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-800">Store name</label>
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Main Branch"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-800">Owner name (optional)</label>
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-800">Owner email</label>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="owner@store.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-800">Owner password</label>
            <input
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Minimum 8 characters"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating…" : "Onboard store"}
        </button>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <div className="font-medium">Created</div>
            <div className="mt-2">
              Tenant: {result.tenant.name} ({result.tenant.slug})
            </div>
            <div className="mt-1">Store: {result.store.name}</div>
            <div className="mt-1">Owner login: {result.user.email}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
