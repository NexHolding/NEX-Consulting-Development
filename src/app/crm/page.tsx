import { redirect } from "next/navigation";
import { currentUser, snapshot } from "@/lib/server";
import Workspace from "@/components/workspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Workspace" };
export default async function Page() {
  const user = await currentUser();
  if (!user || user.role !== "global_admin") redirect("/login");
  return <Workspace initial={{ user, ...(await snapshot()) }} />;
}
