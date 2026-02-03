"use client";

import { ReactNode } from "react";

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "danger" | "warning";
}) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";

  const styles =
    variant === "success"
      ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
      : variant === "danger"
        ? "bg-red-50 text-red-900 ring-1 ring-red-200"
        : variant === "warning"
          ? "bg-amber-50 text-amber-950 ring-1 ring-amber-200"
          : "bg-zinc-50 text-zinc-900 ring-1 ring-zinc-200";

  return <span className={`${base} ${styles}`}>{children}</span>;
}
