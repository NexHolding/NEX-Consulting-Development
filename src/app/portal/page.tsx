import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server";
import { portalSnapshot } from "@/lib/portal-server";
import CustomerPortal from "@/components/customer-portal";
export const dynamic = "force-dynamic";
export const metadata = { title: "Kundenportal" };
export default async function Page() {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role === "global_admin") redirect("/crm/portal");
  if (u.role !== "customer" || !u.customer_id) redirect("/login");
  return <CustomerPortal initial={await portalSnapshot(u.customer_id)} />;
}
