"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Badge } from "@/components/Badge";

type Role = "PROVIDER_ADMIN" | "STORE_OWNER" | "MANAGER" | "CASHIER";

export function AppShell({
  children,
  role,
  storeName,
}: {
  children: ReactNode;
  role?: Role;
  storeName?: string | null;
}) {
  const pathname = usePathname();
  const navItems =
    role === "PROVIDER_ADMIN"
      ? [
        { href: "/admin", label: "Onboarding" },
        { href: "/admin/stores", label: "Stores" },
      ]
      : role === "STORE_OWNER"
        ? [
          { href: "/app", label: "Dashboard" },
          { href: "/app/select-store", label: "Switch store" },
          { href: "/app/products", label: "Products" },
          { href: "/app/inventory", label: "Inventory" },
          { href: "/app/pos", label: "POS" },
          { href: "/app/sales", label: "Sales" },
          { href: "/app/staff", label: "Staff" },
          { href: "/app/reports", label: "Reports" },
          { href: "/app/billing", label: "Billing" },
        ]
        : [
          { href: "/app", label: "Dashboard" },
          { href: "/app/products", label: "Products" },
          { href: "/app/inventory", label: "Inventory" },
          { href: "/app/pos", label: "POS" },
          { href: "/app/sales", label: "Sales" },
          { href: "/app/staff", label: "Staff" },
          { href: "/app/reports", label: "Reports" },
          { href: "/app/billing", label: "Billing" },
        ];

  function isActive(href: string) {
    if (!pathname) return false;
    if (pathname === href) return true;
    if (href !== "/" && pathname.startsWith(href + "/")) return true;
    return false;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white px-4 py-6 md:flex">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              SwiftSale
            </Link>
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
              SaaS POS
            </span>
          </div>

          <nav className="mt-6 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive(item.href)
                    ? "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-base font-semibold tracking-tight md:hidden">
                SwiftSale
              </Link>
              <span className="hidden text-sm text-zinc-600 md:inline">
                {storeName ? storeName : "Retail POS"}
              </span>
              {role ? (
                <span className="hidden md:inline">
                  <Badge variant={role === "PROVIDER_ADMIN" ? "warning" : "default"}>{role}</Badge>
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {role ? (
                <Link
                  href="/logout"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                >
                  Logout
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </header>

          {role ? (
            <div className="border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
              <div className="flex items-center gap-2 overflow-x-auto">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isActive(item.href)
                        ? "whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                        : "whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800"
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
