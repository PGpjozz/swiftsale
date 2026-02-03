import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

type Body = {
  storeId?: string;
  billingStatus?: "PENDING" | "ACTIVE" | "SUSPENDED";
};

export async function GET() {
  const auth = await requireRole("PROVIDER_ADMIN");
  if (!auth.ok) return auth.res;

  try {
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        name: true,
        billingStatus: true,
        tenant: { select: { id: true, name: true, slug: true } },
        createdAt: true,
        users: {
          where: { role: "STORE_OWNER" },
          select: { id: true, email: true },
          take: 1,
        },
      },
    });

    return NextResponse.json({ ok: true, stores });
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
    const storeId = typeof body.storeId === "string" ? body.storeId : "";
    const billingStatus = body.billingStatus;

    if (!storeId) {
      return NextResponse.json({ ok: false, error: "storeId is required" }, { status: 400 });
    }

    if (billingStatus !== "PENDING" && billingStatus !== "ACTIVE" && billingStatus !== "SUSPENDED") {
      return NextResponse.json(
        { ok: false, error: "billingStatus must be PENDING | ACTIVE | SUSPENDED" },
        { status: 400 },
      );
    }

    const store = await prisma.store.update({
      where: { id: storeId },
      data: { billingStatus },
      select: { id: true, name: true, billingStatus: true },
    });

    return NextResponse.json({ ok: true, store });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
