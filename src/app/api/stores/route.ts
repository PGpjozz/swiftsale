import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";

function prismaErrorToResponse(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json(
    { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "STORE_OWNER") {
      const stores = await prisma.store.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      return NextResponse.json({ ok: true, stores });
    }

    if (user.role === "MANAGER" || user.role === "CASHIER") {
      if (!user.storeId) {
        return NextResponse.json({ ok: true, stores: [] });
      }

      const store = await prisma.store.findFirst({
        where: { id: user.storeId, tenantId: user.tenantId },
      });

      return NextResponse.json({ ok: true, stores: store ? [store] : [] });
    }

    if (user.role !== "PROVIDER_ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const stores = await prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ ok: true, stores });
  } catch (err) {
    return prismaErrorToResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "PROVIDER_ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { tenantId?: string; name?: string };

    if (!body.tenantId) {
      return NextResponse.json(
        { ok: false, error: "tenantId is required" },
        { status: 400 },
      );
    }

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "name is required" },
        { status: 400 },
      );
    }

    const store = await prisma.store.create({
      data: {
        tenantId: body.tenantId,
        name: body.name.trim(),
      },
    });

    return NextResponse.json({ ok: true, store }, { status: 201 });
  } catch (err) {
    return prismaErrorToResponse(err);
  }
}
