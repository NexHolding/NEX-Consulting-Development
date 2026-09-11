import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server";
import Login from "@/components/login";
export const metadata = { title: "Anmelden" };
export default async function Page() {
  const user = await currentUser();
  if (user?.role === "global_admin") redirect("/crm");
  return <Login />;
}
