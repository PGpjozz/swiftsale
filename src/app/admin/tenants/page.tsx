"use client";

import { PageHeader } from "@/components/PageHeader";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminTenantsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/stores");
  }, [router]);

  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle="Billing activation moved to store-level. Redirecting…"
      />
    </div>
  );
}
