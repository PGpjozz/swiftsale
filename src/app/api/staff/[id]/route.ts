import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireActiveBilling } from "@/lib/authz";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (!user.storeId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const billing = requireActiveBilling(user);
    if (!billing.ok) return billing.res;

    if (params.id === user.id) {
      return NextResponse.json(
        { ok: false, error: "You cannot delete your own account" },
        { status: 400 },
      );
    }

    const target = await prisma.user.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenantId,
        storeId: user.storeId,
      },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (target.role === "STORE_OWNER") {
      return NextResponse.json(
        { ok: false, error: "Cannot delete the store owner" },
        { status: 403 },
      );
    }

    if ((user.role === "MANAGER" || user.role === "CASHIER") && target.role !== "CASHIER") {
      return NextResponse.json(
        { ok: false, error: "Managers can only delete CASHIER accounts" },
        { status: 403 },
      );
    }

    await prisma.user.delete({ where: { id: target.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
