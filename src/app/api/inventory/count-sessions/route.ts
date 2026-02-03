import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type CreateBody = {
  note?: string;
  reference?: string;
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if ((user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") || !user.storeId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (user.storeBillingStatus !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Billing inactive" }, { status: 402 });
    }

    const sessions = await prisma.stockCountSession.findMany({
      where: { storeId: user.storeId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        note: true,
        reference: true,
        createdAt: true,
        finalizedAt: true,
        createdBy: { select: { id: true, email: true, name: true } },
        _count: { select: { lines: true } },
      },
    });

    return NextResponse.json({ ok: true, sessions });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if ((user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") || !user.storeId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (user.storeBillingStatus !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Billing inactive" }, { status: 402 });
    }

    const body = (await req.json()) as CreateBody;
    const note = typeof body.note === "string" ? body.note : null;
    const reference = typeof body.reference === "string" ? body.reference : null;

    const created = await prisma.stockCountSession.create({
      data: {
        storeId: user.storeId,
        createdByUserId: user.id,
        note,
        reference,
      },
      select: {
        id: true,
        status: true,
        note: true,
        reference: true,
        createdAt: true,
        finalizedAt: true,
      },
    });

    return NextResponse.json({ ok: true, session: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
