import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";

function prismaErrorToResponse(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (err.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Unique constraint violation" },
        { status: 409 },
      );
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
    if ((user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") || !user.storeId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (user.storeBillingStatus !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Billing inactive" }, { status: 402 });
    }

    const product = await prisma.product.findFirst({
      where: { id: params.id, storeId: user.storeId },
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, product });
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
    if ((user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") || !user.storeId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (user.storeBillingStatus !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Billing inactive" }, { status: 402 });
    }

    const body = (await req.json()) as {
      name?: string;
      sku?: string | null;
      barcode?: string | null;
      priceCents?: number;
      reorderLevel?: number;
    };

    const data: {
      name?: string;
      sku?: string | null;
      barcode?: string | null;
      priceCents?: number;
      reorderLevel?: number;
    } = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { ok: false, error: "name cannot be empty" },
          { status: 400 },
        );
      }
      data.name = trimmed;
    }

    if ("sku" in body) data.sku = body.sku ?? null;
    if ("barcode" in body) data.barcode = body.barcode ?? null;

    if (typeof body.priceCents !== "undefined") {
      if (!Number.isFinite(body.priceCents)) {
        return NextResponse.json(
          { ok: false, error: "priceCents must be a number" },
          { status: 400 },
        );
      }

      if (!Number.isInteger(body.priceCents) || body.priceCents < 0) {
        return NextResponse.json(
          { ok: false, error: "priceCents must be an integer >= 0" },
          { status: 400 },
        );
      }

      data.priceCents = body.priceCents;
    }

    if (typeof body.reorderLevel !== "undefined") {
      if (!Number.isFinite(body.reorderLevel)) {
        return NextResponse.json(
          { ok: false, error: "reorderLevel must be a number" },
          { status: 400 },
        );
      }

      if (!Number.isInteger(body.reorderLevel) || body.reorderLevel < 0) {
        return NextResponse.json(
          { ok: false, error: "reorderLevel must be an integer >= 0" },
          { status: 400 },
        );
      }

      data.reorderLevel = body.reorderLevel;
    }

    const existing = await prisma.product.findFirst({
      where: { id: params.id, storeId: user.storeId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ ok: true, product });
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
    if ((user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") || !user.storeId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (user.storeBillingStatus !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Billing inactive" }, { status: 402 });
    }

    const existing = await prisma.product.findFirst({
      where: { id: params.id, storeId: user.storeId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return prismaErrorToResponse(err);
  }
}
