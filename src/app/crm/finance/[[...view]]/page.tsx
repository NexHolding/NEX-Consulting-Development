import { redirect, notFound } from "next/navigation";
import { admin } from "@/lib/server";
import { financeViews } from "@/lib/finance/model";
import FinanceHub from "@/components/finance/hub";
export const metadata = { title: "Finanzen" };
export const dynamic = "force-dynamic";
export default async function FinancePage({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  let user;
  try {
    user = await admin();
  } catch {
    redirect("/login");
  }
  const { view } = await params;
  const current = view?.[0] || "overview";
  const section = view?.[1] || "overview";
  if (
    !financeViews.some((v) => v[0] === current) ||
    (view?.length || 0) > 2 ||
    (view?.[1] && current !== "settings") ||
    !["overview", "brands", "allocation", "connections"].includes(section)
  )
    notFound();
  return (
    <FinanceHub
      view={current}
      settingsSection={section}
      user={{ username: user.username }}
    />
  );
}
