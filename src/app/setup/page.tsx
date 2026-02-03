"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length >= 8 && !loading,
    [email, password, loading],
  );

  async function onSubmit() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
      });

      const data = (await res.json()) as { ok: true } | { ok: false; error: string };
      if (!res.ok || data.ok === false) {
        throw new Error("error" in data ? data.error : "Setup failed");
      }

      router.push("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="text-xl font-semibold tracking-tight">Initial setup</div>
          <p className="mt-1 text-sm text-zinc-600">
            Create the first provider admin account.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-800">Name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Admin"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-800">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="admin@swiftsale.com"
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
              onClick={onSubmit}
              disabled={!canSubmit}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create provider admin"}
            </button>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
