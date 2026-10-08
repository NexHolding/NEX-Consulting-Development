"use client";
import { useState } from "react";
import {
  billingStatus,
  monthlyCharge,
  type BillingData,
  type BillingMutation,
  type BillingProduct,
  type RecurringCost,
} from "@/lib/recurring-billing";
import {
  euros,
  type OfferQuote,
  type OfferCatalog,
  calculateOffer,
} from "@/lib/offer-catalog";
import Link from "./app-link";

type Project = {
  id: string;
  customer_id: string;
  name: string;
  offer_snapshot?: OfferQuote | null;
};
export function BillingModules({
  products,
  busy,
  mutate,
}: {
  products: BillingProduct[];
  busy: boolean;
  mutate: BillingMutation;
}) {
  return (
    <section className="panel">
      <p className="eyebrow">WEITERBERECHNUNG</p>
      <h2>Abrechnungsmodule</h2>
      <p>
        Faktor 1,3 entspricht 30 % Aufschlag auf Ihre monatlichen Nettokosten.
        Änderungen am Katalog gelten für neue Kosten; bestehende Vereinbarungen
        behalten ihren Faktor.
      </p>
      <div className="billing-module-grid">
        {products.map((p) => (
          <form
            key={p.id + p.name + p.factor + p.active}
            className="project-card"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await mutate("billing_product", {
                id: p.id,
                name: f.get("name"),
                factor: Number(f.get("factor")),
                active: f.get("active") === "on",
              });
            }}
          >
            <label>
              Produkt
              <input
                name="name"
                required
                minLength={2}
                maxLength={160}
                defaultValue={p.name}
              />
            </label>
            <label>
              Standardfaktor
              <input
                name="factor"
                type="number"
                min={1}
                max={100}
                step="0.0001"
                defaultValue={p.factor}
                required
              />
            </label>
            <label className="check-label">
              <input name="active" type="checkbox" defaultChecked={p.active} />
              Zur Auswahl anbieten
            </label>
            <button className="button small outline" disabled={busy}>
              Modul speichern
            </button>
          </form>
        ))}
      </div>
      <form
        className="profile-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          if (
            await mutate("billing_product", {
              name: f.get("name"),
              factor: Number(f.get("factor")),
            })
          )
            form.reset();
        }}
      >
        <h3>Eigenes Produkt ergänzen</h3>
        <div className="form-pair">
          <label>
            Produktname
            <input name="name" required minLength={2} maxLength={160} />
          </label>
          <label>
            Standardfaktor
            <input
              name="factor"
              type="number"
              min={1}
              max={100}
              step="0.0001"
              defaultValue={1.3}
              required
            />
          </label>
        </div>
        <button className="button small" disabled={busy}>
          Produkt anlegen
        </button>
      </form>
    </section>
  );
}
function BillingDates({
  today,
  startsOn,
  endsOn,
}: {
  today: string;
  startsOn?: string;
  endsOn?: string | null;
}) {
  const [start, setStart] = useState(startsOn ?? today);
  return (
    <div className="form-pair">
      <label>
        Beginn
        <input
          name="starts_on"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          min="2020-01-01"
          max="2100-12-31"
          required
        />
      </label>
      <label>
        Ende (leer = unbefristet)
        <input
          name="ends_on"
          type="date"
          defaultValue={endsOn ?? ""}
          min={start}
        />
      </label>
    </div>
  );
}
export function SubscriptionFields({
  quote,
  catalog,
  today,
}: {
  quote?: OfferQuote | null;
  catalog?: OfferCatalog;
  today: string;
}) {
  const [mode, setMode] = useState("individual");
  const [tier, setTier] = useState("Basic");
  const selected =
    mode === "project"
      ? quote
      : catalog
        ? calculateOffer(catalog, {
            budget:
              tier === "Basic" ? 1000 : tier === "Business" ? 10000 : 35000,
            logo: false,
            domains: 0,
            domainFee: 3,
            catalogVersion: catalog.version,
          })
        : null;
  return (
    <>
      <label>
        Betreuungstarif
        <select
          name="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="individual">Individueller Monatspreis</option>
          <option value="package" disabled={!catalog}>
            Bestehendes Paket
          </option>
          <option value="project" disabled={!quote}>
            Vereinbarter Projektumfang
          </option>
        </select>
      </label>
      {mode === "individual" ? (
        <>
          <label>
            Bezeichnung
            <input
              name="plan"
              defaultValue="Individuelle Software-Betreuung"
              required
              minLength={2}
              maxLength={160}
            />
          </label>
          <div className="form-pair">
            <label>
              Monatspreis netto (€)
              <input
                name="monthly"
                type="number"
                min="0.01"
                max="10000000"
                step="0.01"
                required
              />
            </label>
            <label>
              Enthaltene Minuten / Monat
              <input
                name="included_minutes"
                type="number"
                min={0}
                max={100000}
                defaultValue={0}
              />
            </label>
            <label>
              Enthaltene Anfragen / Monat (optional)
              <input
                name="included_requests"
                type="number"
                min={0}
                max={10000}
              />
            </label>
          </div>
        </>
      ) : (
        <>
          {mode === "package" && (
            <label>
              Paket
              <select
                name="package"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              >
                <option value="Basic">Basic · Care Start</option>
                <option value="Business">Business · Care Business</option>
                <option value="Enterprise">Enterprise · Care Scale</option>
              </select>
            </label>
          )}
          {selected && (
            <p className="info-box">
              {euros(selected.monthly_cents)} netto / Monat ·{" "}
              {selected.items.find((i) => i.id === "care_minutes")?.quantity ??
                0}{" "}
              Minuten ·{" "}
              {selected.items.find((i) => i.id === "care_requests")?.quantity ??
                0}{" "}
              Anfragen.{" "}
              {mode === "package"
                ? "Aktueller Einstiegstarif des Pakets, ohne separate Domainkosten."
                : "Preis aus dem vereinbarten Projektumfang einschließlich dort enthaltener Domainkosten."}
            </p>
          )}
        </>
      )}
      <BillingDates today={today} />
      <p className="footnote">
        Jeder begonnene Kalendermonat wird vollständig berechnet, auch bei
        Beginn oder Ende im laufenden Monat. Vergangene Startdaten erzeugen
        nachträgliche Entwürfe. Paketpreise werden beim Anlegen festgehalten.
      </p>
    </>
  );
}
export function subscriptionPayload(f: FormData) {
  return {
    project_id: f.get("project_id"),
    mode: f.get("mode"),
    package: f.get("package") ?? undefined,
    plan: f.get("plan") ?? undefined,
    monthly_cents: f.get("monthly")
      ? Math.round(Number(f.get("monthly")) * 100)
      : undefined,
    included_minutes: Number(f.get("included_minutes") || 0),
    included_requests: f.get("included_requests")
      ? Number(f.get("included_requests"))
      : null,
    starts_on: f.get("starts_on"),
    ends_on: f.get("ends_on") || null,
  };
}
function CostForm({
  row,
  customerId,
  projectId,
  projects,
  products,
  busy,
  mutate,
  done,
  today,
}: {
  row?: RecurringCost;
  customerId: string;
  projectId?: string;
  projects: Project[];
  products: BillingProduct[];
  busy: boolean;
  mutate: BillingMutation;
  done: () => void;
  today: string;
}) {
  const [productId, setProductId] = useState(
    row?.product_id ?? products.find((p) => p.active)?.id ?? "",
  );
  const product = products.find((p) => p.id === productId);
  const [factor, setFactor] = useState(
    String(row?.factor ?? product?.factor ?? 1.3),
  );
  const [cost, setCost] = useState(row ? String(row.cost_cents / 100) : "");
  const [label, setLabel] = useState(row?.label ?? product?.name ?? "");
  return (
    <form
      className="profile-form billing-entry"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (
          await mutate("recurring_cost", {
            id: row?.id,
            customer_id: customerId,
            project_id: projectId ?? (f.get("project_id") || null),
            product_id: productId,
            label,
            cost_cents: Math.round(Number(cost) * 100),
            factor: Number(factor),
            starts_on: f.get("starts_on"),
            ends_on: f.get("ends_on") || null,
            active: f.get("active") === "on",
          })
        )
          done();
      }}
    >
      <h3>
        {row ? "Monatliche Kosten bearbeiten" : "Monatliche Kosten anlegen"}
      </h3>
      <div className="form-pair">
        <label>
          Produkt
          <select
            value={productId}
            required
            onChange={(e) => {
              const p = products.find((p) => p.id === e.target.value);
              setProductId(e.target.value);
              setFactor(String(p?.factor ?? 1.3));
              setLabel(p?.name ?? "");
            }}
          >
            {products
              .filter((p) => p.active || p.id === row?.product_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Bezeichnung für die Rechnung
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            minLength={2}
            maxLength={200}
          />
        </label>
        {!projectId && (
          <label>
            Zuordnung
            <select name="project_id" defaultValue={row?.project_id ?? ""}>
              <option value="">Kunde allgemein</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Eigene Kosten netto / Monat (€)
          <input
            type="number"
            min="0.01"
            max="10000000"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
          />
        </label>
        <label>
          Abrechnungsfaktor
          <input
            type="number"
            min={1}
            max={100}
            step="0.0001"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            required
          />
        </label>
      </div>
      <BillingDates
        today={today}
        startsOn={row?.starts_on}
        endsOn={row?.ends_on}
      />
      <p className="info-box" aria-live="polite">
        Kundenpreis:{" "}
        {euros(
          monthlyCharge(
            Math.round(Number(cost || 0) * 100),
            Number(factor || 1),
          ),
        )}{" "}
        netto / Monat
      </p>
      <label className="check-label">
        <input
          name="active"
          type="checkbox"
          defaultChecked={row?.active ?? true}
        />
        Im Monatslauf abrechnen
      </label>
      <p className="footnote">
        Volle Gebühr je begonnenem Kalendermonat. Vergangene Startdaten werden
        nachberechnet. Bestehende Entwürfe bleiben unverändert; Änderungen
        gelten für noch nicht abgerechnete Monate. Verbrauchsdienste werden mit
        dem hier vereinbarten Monatsbetrag berechnet.
      </p>
      <div className="actions">
        <button className="button small" disabled={busy}>
          Kosten speichern
        </button>
        <button
          className="button small outline"
          type="button"
          disabled={busy}
          onClick={done}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
export default function CustomerBilling({
  customerId,
  projectId,
  projects,
  data,
  busy,
  mutate,
  now,
  catalog,
}: {
  customerId: string;
  projectId?: string;
  projects: Project[];
  data: BillingData;
  busy: boolean;
  mutate: BillingMutation;
  now: number;
  catalog?: OfferCatalog;
}) {
  const [editing, setEditing] = useState<RecurringCost | "new" | null>(null);
  const [care, setCare] = useState(false);
  const [careProject, setCareProject] = useState(
    projectId ?? projects[0]?.id ?? "",
  );
  const today = new Date(now).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Berlin",
  });
  const costs = (data.recurring_costs ?? []).filter(
    (r) =>
      r.customer_id === customerId &&
      (!projectId || r.project_id === projectId),
  );
  const subscriptions = data.subscriptions.filter(
    (r) =>
      projects.some((p) => p.id === r.project_id) &&
      (!projectId || r.project_id === projectId),
  );
  const total =
    costs
      .filter((r) => billingStatus(r, today) === "Laufend")
      .reduce((s, r) => s + r.monthly_cents, 0) +
    subscriptions
      .filter((r) => billingStatus(r, today) === "Laufend")
      .reduce((s, r) => s + r.monthly_cents, 0);
  if (data.billingAvailable === false)
    return (
      <p className="info-box">Dieser Bereich ist noch nicht freigeschaltet.</p>
    );
  return (
    <section className="panel recurring-billing">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">MONATLICHE ABRECHNUNG</p>
          <h2>Kosten & Software-Betreuung</h2>
        </div>
        <strong>{euros(total)} netto / Monat</strong>
      </div>
      <div className="actions">
        <button
          className="button small"
          disabled={
            busy || !(data.billing_products ?? []).some((p) => p.active)
          }
          onClick={() => {
            setEditing("new");
            setCare(false);
          }}
        >
          Kosten anlegen
        </button>
        <button
          className="button small outline"
          disabled={busy || !projects.length}
          onClick={() => {
            setCare(true);
            setEditing(null);
          }}
        >
          Software-Abo anlegen
        </button>
      </div>
      {editing && (
        <CostForm
          key={typeof editing === "string" ? "new" : editing.id}
          row={typeof editing === "string" ? undefined : editing}
          customerId={customerId}
          projectId={projectId}
          projects={projects}
          products={data.billing_products ?? []}
          busy={busy}
          mutate={mutate}
          done={() => setEditing(null)}
          today={today}
        />
      )}
      {care && (
        <form
          className="profile-form billing-entry"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await mutate(
                "subscription",
                subscriptionPayload(new FormData(e.currentTarget)),
              )
            )
              setCare(false);
          }}
        >
          <h3>Software-Betreuung anlegen</h3>
          <label>
            Projekt
            <select
              name="project_id"
              value={careProject}
              required
              onChange={(e) => setCareProject(e.target.value)}
            >
              {projects
                .filter((p) => !projectId || p.id === projectId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <SubscriptionFields
            key={careProject}
            quote={projects.find((p) => p.id === careProject)?.offer_snapshot}
            catalog={catalog}
            today={today}
          />
          <div className="actions">
            <button className="button small" disabled={busy}>
              Abo speichern
            </button>
            <button
              className="button small outline"
              type="button"
              onClick={() => setCare(false)}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Leistung / Zuordnung</th>
              <th>Eigene Kosten</th>
              <th>Faktor</th>
              <th>Kundenpreis / Monat</th>
              <th>Laufzeit</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.label}
                  <small>
                    {projects.find((p) => p.id === r.project_id)?.name ??
                      "Kunde allgemein"}
                  </small>
                </td>
                <td>{euros(r.cost_cents)}</td>
                <td>{Number(r.factor).toLocaleString("de-DE")}</td>
                <td>{euros(r.monthly_cents)} netto</td>
                <td>
                  {r.starts_on} – {r.ends_on ?? "unbefristet"}
                  <small>{billingStatus(r, today)}</small>
                </td>
                <td>
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() => {
                      setEditing(r);
                      setCare(false);
                    }}
                  >
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
            {subscriptions.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.plan}
                  <small>
                    {projects.find((p) => p.id === r.project_id)?.name}
                  </small>
                </td>
                <td>—</td>
                <td>—</td>
                <td>{euros(r.monthly_cents)} netto</td>
                <td>
                  {r.starts_on} – {r.ends_on ?? "unbefristet"}
                  <small>{billingStatus(r, today)}</small>
                </td>
                <td>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      await mutate("subscription_end", {
                        id: r.id,
                        ends_on: f.get("ends_on") || null,
                      });
                    }}
                  >
                    <label>
                      Vertragsende
                      <input
                        name="ends_on"
                        type="date"
                        min={r.starts_on}
                        defaultValue={r.ends_on ?? ""}
                      />
                    </label>
                    <button className="text-link" disabled={busy}>
                      Laufzeit speichern
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!costs.length && !subscriptions.length && (
        <p className="info-box">
          Noch keine monatlichen Kosten oder Abos angelegt.
        </p>
      )}
      <p className="footnote">
        Der Monatslauf erstellt Rechnungsentwürfe pro Position und Monat. Kein
        automatischer Versand. Bereits im Betreuungspreis enthaltene Domains
        bitte nicht erneut anlegen.{" "}
        <Link href="/crm?tab=Rechnungen">Rechnungsentwürfe öffnen</Link>
      </p>
    </section>
  );
}
