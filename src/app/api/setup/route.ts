import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const existing = await prisma.user.findFirst({ where: { role: "PROVIDER_ADMIN" } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Provider admin already exists" },
        { status: 409 },
      );
    }

    const body = (await req.json()) as { email?: string; password?: string; name?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || email.length === 0) {
      return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.create({
      data: {
        slug: "provider",
        name: "Provider",
      },
    });

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        name: body.name?.trim() || null,
        role: "PROVIDER_ADMIN",
        passwordHash: hashPassword(password),
      },
    });

    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(token, expiresAt);

    return NextResponse.json(
      { ok: true, user: { id: user.id, email: user.email, role: user.role } },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
