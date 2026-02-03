import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";

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

    const storeId = user.storeId;
    const products = await prisma.product.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ ok: true, storeId, products });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
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

    const storeId = user.storeId;
    const body = (await req.json()) as {
      name?: string;
      sku?: string | null;
      barcode?: string | null;
      priceCents?: number;
      reorderLevel?: number;
    };

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "name is required" },
        { status: 400 },
      );
    }

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
    }

    const product = await prisma.product.create({
      data: {
        storeId,
        name: body.name.trim(),
        sku: body.sku ?? null,
        barcode: body.barcode ?? null,
        priceCents: Number.isFinite(body.priceCents) ? body.priceCents! : 0,
        reorderLevel: Number.isFinite(body.reorderLevel) ? body.reorderLevel! : 0,
      },
    });

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json(
          { ok: false, error: "Unique constraint violation" },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
