import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "swiftsale_session";

export type Role = "PROVIDER_ADMIN" | "STORE_OWNER" | "MANAGER" | "CASHIER";

export type BillingStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  tenantId: string;
  storeId: string | null;
  storeBillingStatus: BillingStatus | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          store: {
            select: { billingStatus: true },
          },
        },
      },
      activeStore: {
        select: { id: true, billingStatus: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  const u = session.user;
  const effectiveStoreId = session.activeStoreId ?? u.storeId ?? null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    tenantId: u.tenantId,
    storeId: effectiveStoreId,
    storeBillingStatus: session.activeStore?.billingStatus ?? u.store?.billingStatus ?? null,
  };
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie() {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}
