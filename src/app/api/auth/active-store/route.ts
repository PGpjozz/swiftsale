import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Body = {
  storeId?: string;
};

export async function POST(req: Request) {
  try {
    const token = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, role: true, tenantId: true } } },
    });

    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STORE_OWNER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    const storeId = typeof body.storeId === "string" ? body.storeId : "";

    if (!storeId) {
      return NextResponse.json({ ok: false, error: "storeId is required" }, { status: 400 });
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, tenantId: session.user.tenantId },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { activeStoreId: storeId },
      select: { id: true },
    });

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
