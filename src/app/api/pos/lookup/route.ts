import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (
      (user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") ||
      !user.storeId
    ) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (user.storeBillingStatus !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Billing inactive" }, { status: 402 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    if (!q) {
      return NextResponse.json({ ok: true, products: [] });
    }

    const storeId = user.storeId;

    const exact = await prisma.product.findFirst({
      where: {
        storeId,
        OR: [{ barcode: q }, { sku: q }],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        priceCents: true,
      },
    });

    const where: Prisma.ProductWhereInput = {
      storeId,
      name: { contains: q, mode: "insensitive" },
    };

    if (exact?.id) {
      where.id = { not: exact.id };
    }

    const nameMatches = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        priceCents: true,
      },
    });

    const products = exact ? [exact, ...nameMatches] : nameMatches;

    return NextResponse.json({ ok: true, products });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
