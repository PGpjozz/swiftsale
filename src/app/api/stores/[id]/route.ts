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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "STORE_OWNER") {
      const store = await prisma.store.findFirst({
        where: { id: params.id, tenantId: user.tenantId },
      });

      if (!store) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, store });
    }

    if (user.role !== "PROVIDER_ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const store = await prisma.store.findUnique({ where: { id: params.id } });

    if (!store) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, store });
  } catch (err) {
    return prismaErrorToResponse(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "PROVIDER_ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { name?: string };

    if (typeof body.name === "string" && body.name.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "name cannot be empty" },
        { status: 400 },
      );
    }

    const store = await prisma.store.update({
      where: { id: params.id },
      data: {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
      },
    });

    return NextResponse.json({ ok: true, store });
  } catch (err) {
    return prismaErrorToResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "PROVIDER_ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.store.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return prismaErrorToResponse(err);
  }
}
