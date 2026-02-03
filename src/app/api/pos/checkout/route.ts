import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type CheckoutBody = {
  items?: Array<{ productId?: string; quantity?: number }>;
};

export async function POST(req: Request) {
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

    const body = (await req.json()) as CheckoutBody;
    const rawItems = Array.isArray(body.items) ? body.items : [];

    const items = rawItems
      .map((i) => ({
        productId: typeof i.productId === "string" ? i.productId : "",
        quantity: typeof i.quantity === "number" ? i.quantity : 0,
      }))
      .filter((i) => i.productId.length > 0);

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Cart is empty" },
        { status: 400 },
      );
    }

    for (const i of items) {
      if (!Number.isInteger(i.quantity) || i.quantity <= 0) {
        return NextResponse.json(
          { ok: false, error: "quantity must be an integer > 0" },
          { status: 400 },
        );
      }
    }

    const storeId = user.storeId;
    const productIds = Array.from(new Set(items.map((i) => i.productId)));

    const products = await prisma.product.findMany({
      where: { storeId, id: { in: productIds } },
      select: { id: true, name: true, priceCents: true },
    });

    const productById = new Map(products.map((p) => [p.id, p] as const));

    for (const id of productIds) {
      if (!productById.has(id)) {
        return NextResponse.json(
          { ok: false, error: "One or more products not found" },
          { status: 400 },
        );
      }
    }

    const lineItems = items.map((i) => {
      const p = productById.get(i.productId)!;
      const unitPriceCents = Number.isFinite(p.priceCents) ? p.priceCents : 0;
      const lineTotalCents = unitPriceCents * i.quantity;
      return {
        productId: p.id,
        quantity: i.quantity,
        unitPriceCents,
        lineTotalCents,
      };
    });

    const subtotalCents = lineItems.reduce((sum, li) => sum + li.lineTotalCents, 0);
    const taxCents = 0;
    const totalCents = subtotalCents + taxCents;

    const groupedOnHand = await prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { storeId, productId: { in: productIds } },
      _sum: { quantityDelta: true },
    });

    const onHandByProductId = new Map(
      groupedOnHand.map((g) => [g.productId, g._sum.quantityDelta ?? 0] as const),
    );

    for (const li of lineItems) {
      const onHand = onHandByProductId.get(li.productId) ?? 0;
      if (onHand < li.quantity) {
        return NextResponse.json(
          {
            ok: false,
            error: "Insufficient stock",
            details: {
              productId: li.productId,
              requested: li.quantity,
              onHand,
            },
          },
          { status: 409 },
        );
      }
    }

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          storeId,
          userId: user.id,
          subtotalCents,
          taxCents,
          totalCents,
          items: {
            create: lineItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      await tx.stockMovement.createMany({
        data: lineItems.map((li) => ({
          storeId,
          productId: li.productId,
          type: "SALE",
          quantityDelta: -li.quantity,
          saleId: created.id,
        })),
      });

      return created;
    });

    return NextResponse.json({ ok: true, sale }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
