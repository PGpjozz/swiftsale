"use client";

import { PageHeader } from "@/components/PageHeader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StaffRole = "STORE_OWNER" | "MANAGER" | "CASHIER";

type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  role: StaffRole;
  createdAt: string;
};

export default function StaffPage() {
  const router = useRouter();

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"MANAGER" | "CASHIER">("CASHIER");
  const [creating, setCreating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = useMemo(
    () => email.trim().length > 0 && password.length >= 8 && !creating,
    [email, password, creating],
  );

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/staff", { cache: "no-store" });
      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true; staff: StaffUser[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load staff");
      }

      setStaff(data.staff);
    } catch (e) {
      setStaff([]);
      setError(e instanceof Error ? e.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onCreate() {
    if (!canCreate) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim().length ? name.trim() : undefined,
          password,
          role,
        }),
      });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true; user: StaffUser }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to create staff");
      }

      setEmail("");
      setName("");
      setPassword("");
      setRole("CASHIER");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create staff");
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to delete staff");
      }

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete staff");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Create and manage cashier/manager accounts for this store."
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium">Create staff</div>
          <div className="mt-4 grid gap-3">
            <div>
              <label className="text-sm font-medium text-zinc-800">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "MANAGER" | "CASHIER")}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="CASHIER">CASHIER</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-800">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="cashier@store.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-800">Name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-800">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Minimum 8 characters"
              />
            </div>

            <button
              type="button"
              onClick={() => void onCreate()}
              disabled={!canCreate}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Staff list</div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-zinc-600">Loading…</div>
            ) : staff.length === 0 ? (
              <div className="text-sm text-zinc-600">No staff yet.</div>
            ) : (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {staff.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-zinc-900">{u.email}</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        {u.name ?? "—"} • {u.role} • {new Date(u.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {u.role === "STORE_OWNER" ? null : (
                      <button
                        type="button"
                        onClick={() => void onDelete(u.id)}
                        disabled={deletingId === u.id}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === u.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
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
