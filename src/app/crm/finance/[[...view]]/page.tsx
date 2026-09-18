import { redirect } from "next/navigation";
import { admin } from "@/lib/server";
import FinanceHub from "@/components/finance/hub";
export const dynamic = "force-dynamic";
export default async function FinancePage({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  try {
    await admin();
  } catch {
    redirect("/login");
  }
  const { view } = await params;
  return <FinanceHub view={view?.[0] || "overview"} />;
}
