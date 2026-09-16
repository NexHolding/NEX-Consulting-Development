"use client";
import { extraAmount } from "@/lib/time-report";
import Link from "./app-link";
import { useState } from "react";
import ProjectOffer from "./project-offer";
import type { OfferQuote } from "@/lib/offer-catalog";
import CustomerFields from "./customer-fields";
import {
  CorrectionProjectSettings,
  CorrectionAssignment,
} from "./correction-rounds";
import {
  correctionLabel,
  assignmentLabel,
  usedCorrectionRounds,
} from "@/lib/correction-rounds";
import CustomerAccess from "./customer-access";
import {
  reportSeconds,
  reportWindow,
  timeDuration,
  type ReportTime,
} from "@/lib/time-report";
export type CustomerRecord = {
  [field: string]: string | number | undefined;
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  notes: string;
  phone?: string;
  billing_name?: string;
  billing_email?: string;
  billing_address?: string;
  vat_id?: string;
  payment_terms_days?: number;
  source?: string;
};
type Project = {
  id: string;
  customer_id: string;
  name: string;
  status: string;
  budget_cents: number;
  hourly_rate_cents?: number;
  waiting_billable?: boolean;
  included_change_rounds?: number | null;
  offer_snapshot?: OfferQuote | null;
  included_correction_rounds?: number | null;
};
type Invoice = {
  id: string;
  customer_id: string;
  subject: string;
  net_cents: number;
  status: string;
};
const money = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    v / 100,
  );
export function TimeReport({
  times,
  projects,
  customerId,
  now,
  mutate,
  busy = false,
}: {
  times: ReportTime[];
  projects: Project[];
  customerId?: string;
  now: number;
  mutate?: (
    action: string,
    payload: Record<string, unknown>,
  ) => Promise<boolean>;
  busy?: boolean;
}) {
  const [month, setMonth] = useState("");
  const [project, setProject] = useState("");
  const window = reportWindow(month, now);
  const rows = times.filter(
    (t) =>
      (!project || t.project_id === project) && reportSeconds(t, window) > 0,
  );
  const total = (kind: string, approved = false) =>
    rows
      .filter((t) => t.kind === kind && (!approved || t.approved_at))
      .reduce((s, t) => s + reportSeconds(t, window), 0);
  const query = new URLSearchParams({
    ...(customerId ? { customer: customerId } : {}),
    ...(project ? { project } : {}),
    ...(month ? { month } : {}),
  });
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">LEISTUNGSÜBERSICHT</p>
          <h2>Zeitstand & Auszüge</h2>
        </div>
        <a
          className="button small"
          href={"/api/time-report?" + query}
          target="_blank"
          rel="noreferrer"
        >
          PDF herunterladen
        </a>
      </div>
      <div className="form-pair">
        <label>
          Zeitraum
          <select
            value={month ? "month" : "all"}
            onChange={(e) =>
              setMonth(
                e.target.value === "all"
                  ? ""
                  : new Date(now)
                      .toLocaleDateString("sv-SE", {
                        timeZone: "Europe/Berlin",
                      })
                      .slice(0, 7),
              )
            }
          >
            <option value="all">Aktueller Gesamtstand</option>
            <option value="month">Monatsauszug</option>
          </select>
        </label>
        {month && (
          <label>
            Monat
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
        )}
        <label>
          Projektfilter
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Alle Projekte</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="metrics report-metrics">
        {[
          [total("internal"), "Intern"],
          [total("external"), "Extern"],
          [total("external", true), "Extern freigegeben"],
        ].map(([v, l]) => (
          <article className="metric" key={l}>
            <span>{l}</span>
            <strong>{timeDuration(Number(v))}</strong>
          </article>
        ))}
      </div>
      {rows.some((t) => t.correction_round != null) && (
        <div className="correction-overview">
          <h3>Korrekturrunden im gewählten Zeitraum</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Projekt / Runde</th>
                  <th>Paketzuordnung</th>
                  <th>Intern</th>
                  <th>Extern</th>
                </tr>
              </thead>
              <tbody>
                {projects.flatMap((p) =>
                  usedCorrectionRounds(rows, p.id).map((n) => {
                    const roundTimes = rows.filter(
                      (t) => t.project_id === p.id && t.correction_round === n,
                    );
                    const sum = (kind: string) =>
                      roundTimes
                        .filter((t) => t.kind === kind)
                        .reduce((s, t) => s + reportSeconds(t, window), 0);
                    return (
                      <tr key={p.id + ":" + n}>
                        <td>
                          {p.name}
                          <small>Runde {n}</small>
                        </td>
                        <td>
                          {
                            correctionLabel(
                              n,
                              p.included_correction_rounds,
                            ).split(" · ")[1]
                          }
                        </td>
                        <td>{timeDuration(sum("internal"))}</td>
                        <td>{timeDuration(sum("external"))}</td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
          <p className="footnote">
            Korrekturzeiten sind bereits in den obigen Summen enthalten. Eine
            Runde kann mehrere Einträge enthalten. Zusatzzeit ist zur späteren
            Abrechnungsprüfung vorgemerkt.
          </p>
        </div>
      )}
      {rows.some((t) => t.change_request != null) && (
        <div className="correction-overview change-request-overview">
          <h3>Abänderungen durch Kunden</h3>
          <div className="metrics report-metrics">
            {["internal", "external"].map((kind) => (
              <article className="metric" key={kind}>
                <span>
                  {kind === "internal"
                    ? "Abänderung · Intern"
                    : "Abänderung · Extern"}
                </span>
                <strong>
                  {timeDuration(
                    rows
                      .filter(
                        (t) => t.kind === kind && t.change_request != null,
                      )
                      .reduce((sum, t) => sum + reportSeconds(t, window), 0),
                  )}
                </strong>
              </article>
            ))}
          </div>
          <p className="footnote">
            Enthaltene und zusätzliche Änderungen werden je Änderungsnummer
            zugeordnet. Noch nicht nummerierte Änderungen bleiben zur Prüfung
            offen. Diese Zeiten sind bereits in den Gesamtzeiten enthalten und
            verbrauchen keine Korrekturrunden.
          </p>
        </div>
      )}
      <div className="info-box">
        <strong>
          Zusätzlicher Aufwand / freigegebene Einzelzeiten:{" "}
          {new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
          }).format(
            rows.reduce(
              (sum, t) =>
                sum +
                extraAmount(
                  t,
                  projects.find((p) => p.id === t.project_id),
                  window,
                ),
              0,
            ) / 100,
          )}{" "}
          netto
        </strong>
        <p>
          Abgeschlossene externe Zusatzzeiten zum vereinbarten
          Projektstundensatz. Enthaltene Leistungen werden nicht zusätzlich
          berechnet. Freigegebene Zeiten behalten ihren gespeicherten Satz.
          Ungeprüfte Beträge sind vorläufig; dies ist keine Rechnung.
        </p>
      </div>
      <p className="footnote">
        Stand: {new Date(now).toLocaleString("de-DE")}. Interne und externe
        Zeiten werden getrennt ausgewiesen. Monatsgrenzen: Europe/Berlin;
        übergreifende Einträge werden anteilig berücksichtigt. Laufende Timer
        sind vorläufig.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Datum / Projekt</th>
              <th>Leistung</th>
              <th>Zeitart</th>
              <th>Dauer</th>
              <th>Prüfstatus</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  {new Date(t.started_at).toLocaleString("de-DE", {
                    timeZone: "Europe/Berlin",
                  })}
                  <small>
                    {projects.find((p) => p.id === t.project_id)?.name}
                  </small>
                </td>
                <td>
                  {t.description}
                  <small className="correction-label">
                    {assignmentLabel(
                      t,
                      projects.find((p) => p.id === t.project_id)
                        ?.included_correction_rounds,
                      projects.find((p) => p.id === t.project_id)
                        ?.included_change_rounds,
                    )}
                  </small>
                  {t.extra_work && (
                    <p className="change-request-note">
                      <strong>Zusatzumfang:</strong> {t.extra_work}
                    </p>
                  )}
                  {t.change_request != null && (
                    <p className="change-request-note">
                      <strong>Kundenwunsch:</strong> {t.change_request}
                    </p>
                  )}
                  {mutate && (
                    <CorrectionAssignment
                      key={
                        t.id +
                        String(t.correction_round) +
                        String(t.change_request) +
                        String(t.change_round) +
                        String(t.extra_work)
                      }
                      entry={t}
                      project={projects.find((p) => p.id === t.project_id)}
                      times={times}
                      mutate={mutate}
                      busy={busy}
                    />
                  )}
                </td>
                <td>
                  {t.kind === "internal" ? "Intern" : "Extern"}
                  <small>
                    {
                      {
                        active: "Aktive Leistung",
                        processing: "Verarbeitung",
                        waiting: "Wartezeit",
                        break: "Pause",
                      }[t.category]
                    }
                  </small>
                </td>
                <td>
                  {timeDuration(reportSeconds(t, window))}
                  {extraAmount(
                    t,
                    projects.find((p) => p.id === t.project_id),
                    window,
                  ) > 0 && (
                    <small>
                      {money(
                        extraAmount(
                          t,
                          projects.find((p) => p.id === t.project_id),
                          window,
                        ),
                      )}{" "}
                      netto ·{" "}
                      {money(
                        t.approved_at
                          ? (t.approved_rate_cents ??
                              projects.find((p) => p.id === t.project_id)
                                ?.hourly_rate_cents ??
                              0)
                          : (projects.find((p) => p.id === t.project_id)
                              ?.hourly_rate_cents ?? 0),
                      )}
                      /h
                    </small>
                  )}
                </td>
                <td>
                  {!t.stopped_at
                    ? "Läuft"
                    : t.approved_at
                      ? "Freigegeben"
                      : t.kind === "internal"
                        ? "Nur intern"
                        : t.change_request != null
                          ? "Gesonderte Abrechnung offen"
                          : t.correction_round != null
                            ? "Abrechnung offen"
                            : "Ungeprüft"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="info-box">
            Für diesen Zeitraum wurden noch keine Zeiten erfasst.
          </p>
        )}
      </div>
    </section>
  );
}
export default function CustomerProfile({
  customer: c,
  section,
  projects,
  times,
  invoices,
  now,
  busy,
  mutate,
  openProject,
  track,
}: {
  customer: CustomerRecord;
  section: string;
  projects: Project[];
  times: ReportTime[];
  invoices: Invoice[];
  now: number;
  busy: boolean;
  mutate: (
    action: string,
    payload: Record<string, unknown>,
  ) => Promise<boolean>;
  openProject: () => void;
  track: (id: string) => void;
}) {
  const [saved, setSaved] = useState(false);
  const cp = projects.filter((p) => p.customer_id === c.id),
    ct = times.filter((t) => cp.some((p) => p.id === t.project_id)),
    ci = invoices.filter((i) => i.customer_id === c.id);
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setSaved(
      await mutate("customer_update", {
        id: c.id,
        ...f,
        ...(f.payment_terms_days !== undefined
          ? {
              payment_terms_days:
                f.payment_terms_days === "" ? 14 : Number(f.payment_terms_days),
            }
          : {}),
      }),
    );
  }
  return (
    <>
      <section className="panel customer-hero">
        <div className="project-avatar">{c.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <p className="eyebrow">KUNDENAKTE · {c.source || "NEX Consulting"}</p>
          <h2>{c.name}</h2>
          <p>
            {c.contact || "Ansprechpartner ergänzen"} ·{" "}
            {c.email || "E-Mail ergänzen"}
          </p>
        </div>
        <Link
          className="button small outline"
          href={"/crm/portal?customer=" + c.id}
        >
          Kundenportal
        </Link>
      </section>
      {section === "Zugänge & Infrastruktur" && (
        <CustomerAccess key={c.id} customerId={c.id} />
      )}
      {section === "Übersicht" && (
        <>
          <div className="metrics">
            {[
              [cp.length, "Projekte"],
              [
                timeDuration(
                  ct
                    .filter((t) => t.kind === "internal")
                    .reduce((s, t) => s + reportSeconds(t, [0, now]), 0),
                ),
                "Interne Zeit",
              ],
              [
                timeDuration(
                  ct
                    .filter((t) => t.kind === "external")
                    .reduce((s, t) => s + reportSeconds(t, [0, now]), 0),
                ),
                "Externe Zeit",
              ],
              [
                money(
                  ci
                    .filter((i) => i.status === "issued")
                    .reduce((s, i) => s + i.net_cents, 0),
                ),
                "Offene Rechnungen netto",
              ],
            ].map(([v, l]) => (
              <article className="metric" key={l}>
                <span>{l}</span>
                <strong>{v}</strong>
              </article>
            ))}
          </div>
          <section className="panel">
            <h2>Kontaktdaten & Anschrift</h2>
            {c.legal_name && (
              <p>
                {c.legal_name}
                {c.legal_form ? ` · ${c.legal_form}` : ""}
              </p>
            )}
            <p>
              {c.email || "Keine E-Mail"} · {c.phone || "Keine Telefonnummer"}
            </p>
            <p className="preline">
              {c.address || "Noch keine Anschrift hinterlegt."}
            </p>
            <p className="preline">{c.notes}</p>
          </section>
        </>
      )}
      {["Stammdaten", "Rechnungsdaten"].includes(section) && (
        <section className="panel">
          <h2>{section}</h2>
          <form
            key={c.id + section}
            onSubmit={save}
            onChange={() => setSaved(false)}
            className="profile-form"
          >
            <CustomerFields
              values={c}
              mode={section === "Stammdaten" ? "master" : "billing"}
            />
            <button className="button" disabled={busy}>
              {busy ? "Wird gespeichert …" : "Änderungen speichern"}
            </button>
            {saved && <p role="status">Kundendaten gespeichert.</p>}
          </form>
        </section>
      )}
      {["Übersicht", "Projekte"].includes(section) && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Projekte</h2>
            <button className="button small" onClick={openProject}>
              Projekt anlegen
            </button>
          </div>
          <div className="project-cards">
            {cp.map((p) => (
              <article className="project-card" key={p.id}>
                <span className="badge">{p.status}</span>
                <h3>{p.name}</h3>
                <p>
                  Budget:{" "}
                  {p.budget_cents
                    ? money(p.budget_cents)
                    : "Noch nicht vereinbart"}
                </p>
                <p>
                  Externe Zeit:{" "}
                  {timeDuration(
                    ct
                      .filter(
                        (t) => t.project_id === p.id && t.kind === "external",
                      )
                      .reduce((s, t) => s + reportSeconds(t, [0, now]), 0),
                  )}
                </p>
                <ProjectOffer project={p} mutate={mutate} busy={busy} />
                <CorrectionProjectSettings
                  key={
                    p.id +
                    String(p.included_correction_rounds) +
                    String(p.included_change_rounds) +
                    String(p.hourly_rate_cents)
                  }
                  project={p}
                  times={ct}
                  mutate={mutate}
                  busy={busy}
                />
                <button
                  className="button small outline"
                  onClick={() => track(p.id)}
                >
                  Zeit erfassen / nachtragen
                </button>
              </article>
            ))}
          </div>
          {!cp.length && <p>Noch keine Projekte angelegt.</p>}
        </section>
      )}
      {section === "Zeiten & Auszüge" && (
        <TimeReport
          times={ct}
          projects={cp}
          customerId={c.id}
          now={now}
          mutate={mutate}
          busy={busy}
        />
      )}
      {section === "Rechnungen" && (
        <section className="panel">
          <h2>Rechnungen & Entwürfe</h2>
          {ci.map((i) => (
            <div className="task-line" key={i.id}>
              <div>
                <strong>{i.subject}</strong>
                <small>
                  {i.status === "draft"
                    ? "Entwurf"
                    : i.status === "paid"
                      ? "Bezahlt"
                      : i.status === "issued"
                        ? "Ausgestellt"
                        : "Storniert"}
                </small>
              </div>
              <span>{money(i.net_cents)} netto</span>
              <Link
                className="text-link"
                href={"/crm/rechnung/" + i.id}
                target="_blank"
              >
                Beleg ansehen
              </Link>
            </div>
          ))}
          {!ci.length && <p>Noch keine Rechnungen für diesen Kunden.</p>}
        </section>
      )}
    </>
  );
}
