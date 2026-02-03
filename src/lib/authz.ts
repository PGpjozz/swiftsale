import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { Role } from "@/lib/auth";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true as const, user };
}

export async function requireRole(role: Role) {
  const r = await requireUser();
  if (!r.ok) return r;

  if (r.user.role !== role) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
  }

  return r;
}

export async function requireStoreRole(roles: Role[]) {
  const r = await requireUser();
  if (!r.ok) return r;

  if (!roles.includes(r.user.role)) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
  }

  if (!r.user.storeId) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
  }

  return r;
}

export function requireActiveBilling(user: { storeBillingStatus: string | null }) {
  if (user.storeBillingStatus !== "ACTIVE") {
    return {
      ok: false as const,
      res: NextResponse.json(
        { ok: false, error: "Billing inactive" },
        { status: 402 },
      ),
    };
  }
  return { ok: true as const };
}
