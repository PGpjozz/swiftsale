"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        const data = (await res.json()) as { ok: true } | { ok: false; error: string };

        if (!res.ok || data.ok === false) {
          throw new Error("error" in data ? data.error : "Logout failed");
        }

        if (!cancelled) router.replace("/login");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Logout failed");
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="text-xl font-semibold tracking-tight">Logging out…</div>
          <p className="mt-2 text-sm text-zinc-600">Clearing your session.</p>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
          >
            Go to login
          </button>
        </div>
      </div>
    </div>
  );
}
