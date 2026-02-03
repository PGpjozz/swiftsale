import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireStoreAppUser } from "@/lib/pageAuth";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireStoreAppUser("/app");
  if (user.role === "PROVIDER_ADMIN") redirect("/admin");

  const store = await prisma.store.findFirst({
    where: { id: user.storeId, tenantId: user.tenantId },
    select: { name: true },
  });

  return (
    <AppShell role={user.role} storeName={store?.name ?? null}>
      {children}
    </AppShell>
  );
}
