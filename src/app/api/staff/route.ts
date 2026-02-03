import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireActiveBilling } from "@/lib/authz";
import { hashPassword } from "@/lib/password";

type CreateBody = {
  email?: string;
  password?: string;
  name?: string;
  role?: "MANAGER" | "CASHIER";
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (!user.storeId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const billing = requireActiveBilling(user);
    if (!billing.ok) return billing.res;

    const staff = await prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        storeId: user.storeId,
        role: { in: ["STORE_OWNER", "MANAGER", "CASHIER"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      take: 200,
    });

    return NextResponse.json({ ok: true, staff });
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

    if (user.role !== "STORE_OWNER" && user.role !== "MANAGER" && user.role !== "CASHIER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (!user.storeId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const billing = requireActiveBilling(user);
    if (!billing.ok) return billing.res;

    const body = (await req.json()) as CreateBody;

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    const requestedRole = body.role === "MANAGER" || body.role === "CASHIER" ? body.role : null;
    if (!requestedRole) {
      return NextResponse.json({ ok: false, error: "role is required" }, { status: 400 });
    }

    if ((user.role === "MANAGER" || user.role === "CASHIER") && requestedRole !== "CASHIER") {
      return NextResponse.json(
        { ok: false, error: "Managers can only create CASHIER accounts" },
        { status: 403 },
      );
    }

    if (!email) {
      return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Email already exists" }, { status: 409 });
    }

    const created = await prisma.user.create({
      data: {
        tenantId: user.tenantId,
        storeId: user.storeId,
        email,
        name: name.length ? name : null,
        passwordHash: hashPassword(password),
        role: requestedRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, user: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
