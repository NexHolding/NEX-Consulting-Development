import { notFound, redirect } from "next/navigation";
import { currentUser, db } from "@/lib/server";
import Link from "next/link";
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user || user.role !== "global_admin") redirect("/login");
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  const { data: i } = await db()
    .from("nc_invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (!i) notFound();
  const { data: c } = await db()
    .from("nc_customers")
    .select("*")
    .eq("id", i.customer_id)
    .single();
  const euro = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(n / 100);
  return (
    <main className="invoice-paper">
      <Link href="/crm">← Zurück zum Workspace</Link>
      <p className="eyebrow">NEX CONSULTING</p>
      <h1>Rechnungsentwurf</h1>
      <div className="info-box">
        Nicht zur Zahlung bestimmt. Noch keine ausgestellte Rechnung. Absender-
        und Steuerangaben werden vor Ausstellung geprüft.
      </div>
      <section>
        <h2>{c?.name}</h2>
        <p className="preline">
          {c?.address || "Rechnungsanschrift noch ergänzen"}
        </p>
      </section>
      <p>Erstellt am {new Date(i.created_at).toLocaleDateString("de-DE")}</p>
      <h2>{i.subject}</h2>
      {i.period && <p>Leistungsmonat: {i.period}</p>}
      <table>
        <thead>
          <tr>
            <th>Leistung</th>
            <th>Menge</th>
            <th>Netto</th>
          </tr>
        </thead>
        <tbody>
          {(
            i.items as {
              description: string;
              quantity: number;
              unit_cents: number;
            }[]
          ).map((x, index) => (
            <tr key={index}>
              <td>{x.description}</td>
              <td>{x.quantity}</td>
              <td>{euro(x.quantity * x.unit_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Summe netto: {euro(i.net_cents)}</h2>
      <p>
        Umsatzsteuer und Bruttobetrag werden nach Prüfung der steuerlichen
        Angaben ergänzt.
      </p>
    </main>
  );
}
