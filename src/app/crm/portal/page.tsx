import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server";
import { portalAdminSnapshot } from "@/lib/portal-server";
import PortalAdmin from "@/components/portal-admin";
export const dynamic = "force-dynamic";
export const metadata = { title: "Portalverwaltung" };
export default async function Page() {
  const u = await currentUser();
  if (!u || !["global_admin", "employee"].includes(u.role)) redirect("/login");
  return (
    <PortalAdmin initial={await portalAdminSnapshot()} actorRole={u.role} />
  );
}
