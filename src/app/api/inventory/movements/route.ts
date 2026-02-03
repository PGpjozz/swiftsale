import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Body = {
  productId?: string;
  type?: "RECEIVE" | "ADJUST";
  quantity?: number;
  note?: string | null;
  reference?: string;
};

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

    const movements = await prisma.stockMovement.findMany({
      where: { storeId: user.storeId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        product: { select: { id: true, name: true } },
        sale: { select: { id: true } },
      },
    });

    return NextResponse.json({ ok: true, movements });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
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

    const body = (await req.json()) as Body;
    const productId = typeof body.productId === "string" ? body.productId : "";
    const type = body.type === "RECEIVE" || body.type === "ADJUST" ? body.type : null;
    const quantity = typeof body.quantity === "number" ? body.quantity : NaN;
    const note = typeof body.note === "string" ? body.note : null;
    const reference = typeof body.reference === "string" ? body.reference : null;

    if (!productId) {
      return NextResponse.json({ ok: false, error: "productId is required" }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ ok: false, error: "type is required" }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity === 0) {
      return NextResponse.json(
        { ok: false, error: "quantity must be a non-zero integer" },
        { status: 400 },
      );
    }

    const storeId = user.storeId;

    const product = await prisma.product.findFirst({
      where: { id: productId, storeId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    }

    const quantityDelta = type === "RECEIVE" ? Math.abs(quantity) : quantity;

    const movement = await prisma.stockMovement.create({
      data: {
        storeId,
        productId,
        type,
        quantityDelta,
        note,
        reference,
      },
      include: {
        product: { select: { id: true, name: true } },
        sale: { select: { id: true } },
      },
    });

    return NextResponse.json({ ok: true, movement }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
