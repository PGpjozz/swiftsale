import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type PatchBody =
  | {
    action?: "FINALIZE";
  }
  | {
    productId?: string;
    countedQty?: number;
  };

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

    const storeId = user.storeId;

    const session = await prisma.stockCountSession.findFirst({
      where: { id: params.id, storeId },
      select: {
        id: true,
        status: true,
        note: true,
        reference: true,
        createdAt: true,
        finalizedAt: true,
        createdBy: { select: { id: true, email: true, name: true } },
        lines: {
          select: { productId: true, countedQty: true, updatedAt: true, createdAt: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        reorderLevel: true,
      },
    });

    const grouped = await prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { storeId },
      _sum: { quantityDelta: true },
    });

    const onHandByProductId = new Map(grouped.map((g) => [g.productId, g._sum.quantityDelta ?? 0] as const));
    const countedByProductId = new Map(session.lines.map((l) => [l.productId, l.countedQty] as const));

    const items = products.map((p) => ({
      ...p,
      onHand: onHandByProductId.get(p.id) ?? 0,
      countedQty: countedByProductId.get(p.id) ?? null,
    }));

    return NextResponse.json({ ok: true, session, items });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
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

    const storeId = user.storeId;

    const body = (await req.json()) as PatchBody;

    if ("action" in body && body.action === "FINALIZE") {
      const finalized = await prisma.$transaction(async (tx) => {
        const session = await tx.stockCountSession.findFirst({
          where: { id: params.id, storeId },
          select: {
            id: true,
            status: true,
            note: true,
            reference: true,
            lines: { select: { productId: true, countedQty: true } },
          },
        });

        if (!session) {
          return { ok: false as const, res: NextResponse.json({ ok: false, error: "Not found" }, { status: 404 }) };
        }

        if (session.status !== "OPEN") {
          return {
            ok: false as const,
            res: NextResponse.json({ ok: false, error: "Session already finalized" }, { status: 400 }),
          };
        }

        if (session.lines.length === 0) {
          return {
            ok: false as const,
            res: NextResponse.json({ ok: false, error: "No counted items" }, { status: 400 }),
          };
        }

        const grouped = await tx.stockMovement.groupBy({
          by: ["productId"],
          where: { storeId },
          _sum: { quantityDelta: true },
        });

        const onHandByProductId = new Map(grouped.map((g) => [g.productId, g._sum.quantityDelta ?? 0] as const));

        const adjustments = session.lines
          .map((l) => {
            const onHand = onHandByProductId.get(l.productId) ?? 0;
            const diff = l.countedQty - onHand;
            return { productId: l.productId, diff };
          })
          .filter((a) => a.diff !== 0);

        if (adjustments.length > 0) {
          await tx.stockMovement.createMany({
            data: adjustments.map((a) => ({
              storeId,
              productId: a.productId,
              type: "ADJUST",
              quantityDelta: a.diff,
              note: session.note ?? "Stock count",
              reference: session.reference,
              stockCountSessionId: session.id,
            })),
          });
        }

        const updated = await tx.stockCountSession.update({
          where: { id: session.id },
          data: { status: "FINALIZED", finalizedAt: new Date() },
          select: { id: true, status: true, finalizedAt: true },
        });

        return { ok: true as const, session: updated, adjustmentCount: adjustments.length };
      });

      if ("res" in finalized) return finalized.res;
      return NextResponse.json(finalized);
    }

    const productId = "productId" in body && typeof body.productId === "string" ? body.productId : "";
    const countedQty = "countedQty" in body && typeof body.countedQty === "number" ? body.countedQty : NaN;

    if (!productId) {
      return NextResponse.json({ ok: false, error: "productId is required" }, { status: 400 });
    }
    if (!Number.isInteger(countedQty) || countedQty < 0) {
      return NextResponse.json({ ok: false, error: "countedQty must be an integer >= 0" }, { status: 400 });
    }

    const session = await prisma.stockCountSession.findFirst({
      where: { id: params.id, storeId },
      select: { id: true, status: true },
    });

    if (!session) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (session.status !== "OPEN") {
      return NextResponse.json({ ok: false, error: "Session is finalized" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, storeId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    }

    const line = await prisma.stockCountLine.upsert({
      where: {
        sessionId_productId: {
          sessionId: session.id,
          productId,
        },
      },
      create: {
        sessionId: session.id,
        productId,
        countedQty,
      },
      update: {
        countedQty,
      },
      select: { id: true, productId: true, countedQty: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, line });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
