"use client";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
  id: string;
  status: "OPEN" | "FINALIZED";
  note: string | null;
  reference: string | null;
  createdAt: string;
  finalizedAt: string | null;
  createdBy: { id: string; email: string; name: string | null };
  _count: { lines: number };
};

export default function StockCountsPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState<string>("");
  const [reference, setReference] = useState<string>("");

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/count-sessions", { cache: "no-store" });
      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true; sessions: Session[] }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to load stock counts");
      }

      setSessions(data.sessions);
    } catch (e) {
      setSessions([]);
      setError(e instanceof Error ? e.message : "Failed to load stock counts");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCount = useMemo(() => sessions.filter((s) => s.status === "OPEN").length, [sessions]);

  async function createSession() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/count-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note.trim().length ? note.trim() : null,
          reference: reference.trim().length ? reference.trim() : null,
        }),
      });

      if (res.status === 402) {
        router.push("/app/billing");
        return;
      }

      const data = (await res.json()) as
        | { ok: true; session: { id: string } }
        | { ok: false; error: string };

      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Failed to create session");
      }

      setNote("");
      setReference("");
      router.push(`/app/inventory/counts/${data.session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader title="Stock counts" subtitle="Count stock and post adjustments." />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 md:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">New stock count</div>
              <div className="mt-1 text-xs text-zinc-600">Create a new counting session.</div>
            </div>
            <Badge variant={openCount > 0 ? "warning" : "default"}>Open: {openCount}</Badge>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium text-zinc-800">Reference (optional)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="COUNT-0001"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="End of day count"
              />
            </div>

            <button
              type="button"
              onClick={createSession}
              disabled={creating}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create session"}
            </button>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>
            ) : null}

            <div className="pt-2">
              <Link
                href="/app/inventory"
                className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Back to inventory
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Recent sessions</div>
              <div className="mt-1 text-xs text-zinc-600">Latest 50 sessions.</div>
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
            ) : sessions.length === 0 ? (
              <div className="text-sm text-zinc-600">No stock counts yet.</div>
            ) : (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {sessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/app/inventory/counts/${s.id}`}
                    className="block p-3 hover:bg-zinc-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900">
                          {s.reference ? s.reference : `Session ${s.id.slice(0, 8)}`}
                        </div>
                        <div className="mt-1 text-xs text-zinc-600">
                          {new Date(s.createdAt).toLocaleString()} • Lines: {s._count.lines}
                          {s.note ? ` • ${s.note}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Badge variant={s.status === "FINALIZED" ? "success" : "warning"}>{s.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
