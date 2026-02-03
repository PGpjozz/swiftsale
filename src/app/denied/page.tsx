import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";

export default async function DeniedPage({
  searchParams,
}: {
  searchParams: { reason?: string; next?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const reason = typeof searchParams.reason === "string" ? searchParams.reason : "forbidden";
  const next = typeof searchParams.next === "string" ? searchParams.next : "/app";

  const title = "Access denied";
  const message =
    reason === "no_store"
      ? "Your account is not assigned to a store."
      : reason === "forbidden"
        ? "You don’t have permission to access that page."
        : reason === "billing"
          ? "Billing is inactive for the selected store."
          : "You can’t access that page.";

  return (
    <div>
      <PageHeader title={title} subtitle={message} />

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-sm text-zinc-700">Signed in as: {user.email}</div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <Link
            href={next}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Go back
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Dashboard
          </Link>
          <Link
            href="/logout"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Logout
          </Link>
        </div>
      </div>
    </div>
  );
}
