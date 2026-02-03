import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

export async function requireStoreAppUser(next: string = "/app"): Promise<AuthUser & { storeId: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "PROVIDER_ADMIN") redirect("/admin");

  if (user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") {
    redirect(`/denied?reason=forbidden&next=${encodeURIComponent(next)}`);
  }

  const storeId = user.storeId;
  if (!storeId) {
    if (user.role === "STORE_OWNER") redirect("/app/select-store");
    redirect(`/denied?reason=no_store&next=${encodeURIComponent(next)}`);
  }

  return user as AuthUser & { storeId: string };
}

export function requireActiveBillingOrRedirect(user: { storeBillingStatus: string | null }, next: string) {
  if (user.storeBillingStatus !== "ACTIVE") {
    redirect(`/app/billing?next=${encodeURIComponent(next)}`);
  }
}
