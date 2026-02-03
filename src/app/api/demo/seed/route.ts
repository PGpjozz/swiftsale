import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveBilling, requireStoreRole } from "@/lib/authz";

type DemoProduct = {
  sku: string;
  name: string;
  priceCents: number;
  reorderLevel: number;
  barcode?: string;
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)];
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    return NextResponse.json({ ok: false, error: "Demo seeding is disabled" }, { status: 403 });
  }

  const auth = await requireStoreRole(["STORE_OWNER"]);
  if (!auth.ok) return auth.res;

  const billing = requireActiveBilling(auth.user);
  if (!billing.ok) return billing.res;

  if (!auth.user.storeId) {
    return NextResponse.json({ ok: false, error: "No active store selected" }, { status: 400 });
  }

  const storeId = auth.user.storeId;
  const userId = auth.user.id;

  const demoProducts: DemoProduct[] = [
    { sku: "BEV-WATER-500", name: "Mineral Water 500ml", priceCents: 600, reorderLevel: 12, barcode: "6001000000011" },
    { sku: "BEV-SODA-330", name: "Cola Soda 330ml", priceCents: 900, reorderLevel: 12, barcode: "6001000000028" },
    { sku: "BEV-JUICE-1L", name: "Orange Juice 1L", priceCents: 2200, reorderLevel: 6, barcode: "6001000000035" },
    { sku: "GRC-RICE-2K", name: "Rice 2kg", priceCents: 4500, reorderLevel: 8, barcode: "6001000000042" },
    { sku: "GRC-SUGAR-2K", name: "White Sugar 2kg", priceCents: 3200, reorderLevel: 8, barcode: "6001000000059" },
    { sku: "GRC-SALT-1K", name: "Table Salt 1kg", priceCents: 1200, reorderLevel: 10, barcode: "6001000000066" },
    { sku: "DAI-MILK-1L", name: "Fresh Milk 1L", priceCents: 1900, reorderLevel: 10, barcode: "6001000000073" },
    { sku: "DAI-YOG-1L", name: "Plain Yogurt 1L", priceCents: 2400, reorderLevel: 8, barcode: "6001000000080" },
    { sku: "BAK-BREAD-WHT", name: "White Bread", priceCents: 1500, reorderLevel: 14, barcode: "6001000000097" },
    { sku: "BAK-BUNS-6", name: "Burger Buns (6 pack)", priceCents: 1800, reorderLevel: 10, barcode: "6001000000103" },
    { sku: "SNK-CHIPS-150", name: "Potato Chips 150g", priceCents: 1700, reorderLevel: 10, barcode: "6001000000110" },
    { sku: "SNK-BISCUITS-200", name: "Tea Biscuits 200g", priceCents: 1600, reorderLevel: 10, barcode: "6001000000127" },
    { sku: "HOU-SOAP-BAR", name: "Bath Soap Bar", priceCents: 1100, reorderLevel: 12, barcode: "6001000000134" },
    { sku: "HOU-DETER-1K", name: "Laundry Detergent 1kg", priceCents: 5200, reorderLevel: 6, barcode: "6001000000141" },
    { sku: "HOU-TP-9", name: "Toilet Paper (9 rolls)", priceCents: 6500, reorderLevel: 6, barcode: "6001000000158" },
  ];

  const INITIAL_REF = "DEMO-SEED-INITIAL";

  const result = await prisma.$transaction(async (tx) => {
    const upsertedProducts = await Promise.all(
      demoProducts.map((p) =>
        tx.product.upsert({
          where: { storeId_sku: { storeId, sku: p.sku } },
          update: {
            name: p.name,
            barcode: p.barcode ?? null,
            priceCents: p.priceCents,
            reorderLevel: p.reorderLevel,
          },
          create: {
            storeId,
            sku: p.sku,
            barcode: p.barcode ?? null,
            name: p.name,
            priceCents: p.priceCents,
            reorderLevel: p.reorderLevel,
          },
        }),
      ),
    );

    const existingInitial = await tx.stockMovement.findMany({
      where: { storeId, reference: INITIAL_REF },
      select: { productId: true },
    });

    const existingProductIds = new Set(existingInitial.map((m) => m.productId));

    const receiveRows = upsertedProducts
      .filter((p) => !existingProductIds.has(p.id))
      .map((p) => ({
        storeId,
        productId: p.id,
        type: "RECEIVE" as const,
        quantityDelta: randInt(20, 120),
        note: "Demo initial stock",
        reference: INITIAL_REF,
      }));

    if (receiveRows.length > 0) {
      await tx.stockMovement.createMany({ data: receiveRows });
    }

    const saleCount = await tx.sale.count({ where: { storeId } });

    let createdSales = 0;
    let createdSaleItems = 0;
    let createdSaleMovements = 0;

    if (saleCount === 0) {
      const productPool = shuffle(upsertedProducts);
      const days = 14;
      const numSales = randInt(18, 32);

      for (let i = 0; i < numSales; i++) {
        const dayOffset = randInt(0, days - 1);
        const createdAt = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
        createdAt.setHours(randInt(9, 20), randInt(0, 59), randInt(0, 59), 0);

        const itemsCount = randInt(1, 4);
        const chosen = shuffle(productPool).slice(0, itemsCount);

        const items = chosen.map((p) => {
          const quantity = randInt(1, 3);
          const unitPriceCents = p.priceCents;
          const lineTotalCents = unitPriceCents * quantity;
          return {
            productId: p.id,
            quantity,
            unitPriceCents,
            lineTotalCents,
            createdAt,
          };
        });

        const subtotalCents = items.reduce((s, it) => s + it.lineTotalCents, 0);
        const taxCents = Math.round(subtotalCents * 0.15);
        const totalCents = subtotalCents + taxCents;

        const sale = await tx.sale.create({
          data: {
            storeId,
            userId,
            subtotalCents,
            taxCents,
            totalCents,
            createdAt,
            items: {
              create: items,
            },
          },
          select: { id: true },
        });

        createdSales += 1;
        createdSaleItems += items.length;

        const movements = items.map((it) => ({
          storeId,
          productId: it.productId,
          type: "SALE" as const,
          quantityDelta: -it.quantity,
          saleId: sale.id,
          note: "Demo sale",
          createdAt,
        }));

        await tx.stockMovement.createMany({ data: movements });
        createdSaleMovements += movements.length;
      }
    }

    return {
      productsUpserted: upsertedProducts.length,
      receiveMovementsCreated: receiveRows.length,
      salesCreated: createdSales,
      saleItemsCreated: createdSaleItems,
      saleMovementsCreated: createdSaleMovements,
    };
  });

  return NextResponse.json({ ok: true, ...result });
}
