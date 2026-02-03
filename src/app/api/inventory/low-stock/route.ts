import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        reorderLevel: true,
        priceCents: true,
      },
    });

    const grouped = await prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { storeId },
      _sum: { quantityDelta: true },
    });

    const onHandByProductId = new Map(grouped.map((g) => [g.productId, g._sum.quantityDelta ?? 0] as const));

    const items = products
      .map((p) => {
        const onHand = onHandByProductId.get(p.id) ?? 0;
        const reorderLevel = Number.isFinite(p.reorderLevel) ? p.reorderLevel : 0;
        const lowStock = reorderLevel > 0 && onHand <= reorderLevel;
        return { ...p, onHand, lowStock };
      })
      .filter((i) => i.lowStock);

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
