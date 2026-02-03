import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "PROVIDER_ADMIN") redirect("/admin");

  const next = typeof searchParams?.next === "string" ? searchParams.next : "/app";

  const active = user.storeBillingStatus === "ACTIVE";

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Manual verification: activation is enabled by the provider admin after payment."
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-medium">Store status</div>
            <div className="mt-1 text-sm text-zinc-600">
              {active
                ? "Your store is active."
                : "Your store is pending activation. Please contact the provider to verify payment."}
            </div>
          </div>

          <Badge
            variant={
              user.storeBillingStatus === "ACTIVE"
                ? "success"
                : user.storeBillingStatus === "SUSPENDED"
                  ? "danger"
                  : "default"
            }
          >
            {user.storeBillingStatus ?? "PENDING"}
          </Badge>
        </div>

        <div className="mt-4">
          <Link
            href={next}
            className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Back
          </Link>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-sm font-medium">Next steps</div>
          <div className="mt-1 text-sm text-zinc-600">
            If you have paid, contact the provider admin to activate your store. Once activated,
            Products, Inventory, POS, and Sales will be available.
          </div>
        </div>

        <button
          type="button"
          disabled
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white opacity-50"
        >
          Activation is handled manually
        </button>
      </div>
    </div>
  );
}
