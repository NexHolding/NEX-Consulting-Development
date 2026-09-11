import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server";
import Login from "@/components/login";
export const metadata = { title: "Anmelden" };
export default async function Page() {
  const user = await currentUser();
  if (user?.role === "global_admin") redirect("/crm");
  if (user?.role === "customer") redirect("/portal");
  if (user?.role === "employee") redirect("/crm/portal");
  return <Login />;
}
