import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

type Body = {
  tenantId?: string;
  billingStatus?: "PENDING" | "ACTIVE" | "SUSPENDED";
};

export async function GET() {
  const auth = await requireRole("PROVIDER_ADMIN");
  if (!auth.ok) return auth.res;

  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        billingStatus: true,
        createdAt: true,
        stores: { select: { id: true } },
        users: { where: { role: "STORE_OWNER" }, select: { id: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, tenants });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER_ADMIN");
  if (!auth.ok) return auth.res;

  try {
    const body = (await req.json()) as Body;
    const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";
    const billingStatus = body.billingStatus;

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "tenantId is required" }, { status: 400 });
    }

    if (billingStatus !== "PENDING" && billingStatus !== "ACTIVE" && billingStatus !== "SUSPENDED") {
      return NextResponse.json(
        { ok: false, error: "billingStatus must be PENDING | ACTIVE | SUSPENDED" },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { billingStatus },
      select: { id: true, name: true, slug: true, billingStatus: true },
    });

    return NextResponse.json({ ok: true, tenant });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
