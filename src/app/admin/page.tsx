import { redirect } from "next/navigation";

import AdminClient from "./AdminClient";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PROVIDER_ADMIN") redirect("/app");

  return <AdminClient />;
}
