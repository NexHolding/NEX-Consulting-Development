import { redirect } from "next/navigation";
import { currentUser, snapshot } from "@/lib/server";
import { workspaceView } from "@/lib/workspace-navigation";
import Workspace from "@/components/workspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Workspace" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; customer?: string; section?: string }>;
}) {
  const user = await currentUser();
  if (user?.role === "employee") redirect("/crm/portal");
  if (!user || user.role !== "global_admin") redirect("/login");
  const [data, query] = await Promise.all([snapshot(), searchParams]);
  return (
    <Workspace initial={{ user, ...data }} initialView={workspaceView(query)} />
  );
}
