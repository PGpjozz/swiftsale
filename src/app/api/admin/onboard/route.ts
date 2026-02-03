import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/authz";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER_ADMIN");
  if (!auth.ok) return auth.res;

  try {
    const body = (await req.json()) as {
      tenantName?: string;
      tenantSlug?: string;
      storeName?: string;
      ownerEmail?: string;
      ownerPassword?: string;
      ownerName?: string;
    };

    const tenantName = body.tenantName?.trim() || "";
    const tenantSlug = (body.tenantSlug?.trim() || slugify(tenantName)).toLowerCase();
    const storeName = body.storeName?.trim() || "";
    const ownerEmail = body.ownerEmail?.trim().toLowerCase() || "";
    const ownerPassword = body.ownerPassword || "";

    if (!tenantName) {
      return NextResponse.json({ ok: false, error: "tenantName is required" }, { status: 400 });
    }

    if (!tenantSlug) {
      return NextResponse.json({ ok: false, error: "tenantSlug is required" }, { status: 400 });
    }

    if (!storeName) {
      return NextResponse.json({ ok: false, error: "storeName is required" }, { status: 400 });
    }

    if (!ownerEmail) {
      return NextResponse.json({ ok: false, error: "ownerEmail is required" }, { status: 400 });
    }

    if (!ownerPassword || ownerPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "ownerPassword must be at least 8 characters" },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: tenantSlug,
          name: tenantName,
        },
      });

      const store = await tx.store.create({
        data: {
          tenantId: tenant.id,
          name: storeName,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          storeId: store.id,
          email: ownerEmail,
          name: body.ownerName?.trim() || null,
          role: "STORE_OWNER",
          passwordHash: hashPassword(ownerPassword),
        },
      });

      return { tenant, store, user };
    });

    return NextResponse.json({ ok: true, ...created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
