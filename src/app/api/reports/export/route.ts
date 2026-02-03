import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function csvCell(value: unknown) {
  if (value === null || typeof value === "undefined") return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function asInt(value: string | null, fallback: number) {
  const n = value ? Number(value) : NaN;
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return n;
}

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const type = (url.searchParams.get("type") ?? "sales").toLowerCase();
    const daysRaw = asInt(url.searchParams.get("days"), 14);
    const days = Math.max(1, Math.min(365, daysRaw));

    const storeId = user.storeId;

    if (type === "sales") {
      type SalesRow = {
        id: string;
        createdAt: Date;
        email: string;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
      };

      const rows =
        (await prisma.$queryRaw<SalesRow[]>`
          select
            s.id as id,
            s."createdAt" as "createdAt",
            u.email as email,
            s."subtotalCents" as "subtotalCents",
            s."taxCents" as "taxCents",
            s."totalCents" as "totalCents"
          from "Sale" s
          join "User" u on u.id = s."userId"
          where s."storeId" = ${storeId}
            and s."createdAt" >= now() - (${days} || ' days')::interval
          order by s."createdAt" desc
          limit 5000
        `) ?? [];

      const header = [
        "sale_id",
        "created_at",
        "cashier_email",
        "subtotal_cents",
        "tax_cents",
        "total_cents",
      ];

      const lines = [header.join(",")].concat(
        rows.map((r) =>
          [
            csvCell(r.id),
            csvCell(r.createdAt.toISOString()),
            csvCell(r.email),
            csvCell(r.subtotalCents),
            csvCell(r.taxCents),
            csvCell(r.totalCents),
          ].join(","),
        ),
      );

      const csv = lines.join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"sales-${days}d.csv\"`,
        },
      });
    }

    if (type === "sale-items") {
      type ItemsRow = {
        sale_id: string;
        created_at: Date;
        cashier_email: string;
        product_name: string;
        quantity: number;
        unit_price_cents: number;
        line_total_cents: number;
      };

      const rows =
        (await prisma.$queryRaw<ItemsRow[]>`
          select
            s.id as sale_id,
            s."createdAt" as created_at,
            u.email as cashier_email,
            p.name as product_name,
            si.quantity as quantity,
            si."unitPriceCents" as unit_price_cents,
            si."lineTotalCents" as line_total_cents
          from "SaleItem" si
          join "Sale" s on s.id = si."saleId"
          join "User" u on u.id = s."userId"
          join "Product" p on p.id = si."productId"
          where s."storeId" = ${storeId}
            and s."createdAt" >= now() - (${days} || ' days')::interval
          order by s."createdAt" desc
          limit 10000
        `) ?? [];

      const header = [
        "sale_id",
        "created_at",
        "cashier_email",
        "product_name",
        "quantity",
        "unit_price_cents",
        "line_total_cents",
      ];

      const lines = [header.join(",")].concat(
        rows.map((r) =>
          [
            csvCell(r.sale_id),
            csvCell(r.created_at.toISOString()),
            csvCell(r.cashier_email),
            csvCell(r.product_name),
            csvCell(r.quantity),
            csvCell(r.unit_price_cents),
            csvCell(r.line_total_cents),
          ].join(","),
        ),
      );

      const csv = lines.join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"sale-items-${days}d.csv\"`,
        },
      });
    }

    if (type === "top-products") {
      type TopRow = { product_id: string; product_name: string; qty: bigint; total_cents: bigint };

      const rows =
        (await prisma.$queryRaw<TopRow[]>`
          select
            p.id as product_id,
            p.name as product_name,
            coalesce(sum(si.quantity), 0) as qty,
            coalesce(sum(si."lineTotalCents"), 0) as total_cents
          from "SaleItem" si
          join "Sale" s on s.id = si."saleId"
          join "Product" p on p.id = si."productId"
          where s."storeId" = ${storeId}
            and s."createdAt" >= now() - (${days} || ' days')::interval
          group by p.id, p.name
          order by qty desc
          limit 100
        `) ?? [];

      const header = ["product_id", "product_name", "qty", "total_cents"];
      const lines = [header.join(",")].concat(
        rows.map((r) =>
          [
            csvCell(r.product_id),
            csvCell(r.product_name),
            csvCell(Number(r.qty)),
            csvCell(Number(r.total_cents)),
          ].join(","),
        ),
      );

      const csv = lines.join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"top-products-${days}d.csv\"`,
        },
      });
    }

    if (type === "cashiers") {
      type CashierRow = { user_id: string; email: string; name: string | null; sale_count: bigint; total_cents: bigint };

      const rows =
        (await prisma.$queryRaw<CashierRow[]>`
          select
            u.id as user_id,
            u.email as email,
            u.name as name,
            coalesce(count(*), 0) as sale_count,
            coalesce(sum(s."totalCents"), 0) as total_cents
          from "Sale" s
          join "User" u on u.id = s."userId"
          where s."storeId" = ${storeId}
            and s."createdAt" >= now() - (${days} || ' days')::interval
          group by u.id, u.email, u.name
          order by total_cents desc
          limit 200
        `) ?? [];

      const header = ["user_id", "email", "name", "sale_count", "total_cents"];
      const lines = [header.join(",")].concat(
        rows.map((r) =>
          [
            csvCell(r.user_id),
            csvCell(r.email),
            csvCell(r.name),
            csvCell(Number(r.sale_count)),
            csvCell(Number(r.total_cents)),
          ].join(","),
        ),
      );

      const csv = lines.join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"cashiers-${days}d.csv\"`,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid type. Use: sales, sale-items, top-products, cashiers" },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
