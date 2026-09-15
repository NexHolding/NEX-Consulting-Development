"use client";
import { withLoading } from "@/lib/loading-state";
import { useState } from "react";
import { Shell, Editor, Blank } from "./portal-shared";
import {
  display as s,
  euro,
  date,
  type Row,
  type PortalData,
} from "@/lib/portal-model";
const tabs = [
  "Dashboard",
  "Aktueller Auftrag und Bearbeitungsstand",
  "Supporttickets",
  "Gebuchter Tarif",
  "Rechnungen",
  "Verträge und Dokumente",
  "Kontaktdaten",
];
export default function CustomerPortal({ initial }: { initial: PortalData }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState(tabs[0]);
  const [orderId, setOrderId] = useState("");
  const [ticketId, setTicketId] = useState("");
  async function save(action: string, payload: Record<string, unknown>) {
    const [r, d] = await withLoading(async () => {
      const r = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return [r, await r.json()] as const;
    });
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  const order = data.orders.find((o) => o.id === orderId);
  const ticket = data.tickets.find((t) => t.id === ticketId);
  const current = data.orders.filter(
    (o) => o.status !== "Auftrag abgeschlossen",
  );
  const cards = (orders: Row[]) => (
    <div className="portal-grid">
      {orders.map((o) => (
        <button
          className="portal-card order-card"
          key={o.id}
          onClick={() => {
            setOrderId(o.id);
            setTab(tabs[1]);
          }}
        >
          <span className="eyebrow">{s(o.number)}</span>
          <h3>{s(o.name)}</h3>
          <span className="portal-badge">{s(o.status)}</span>
          <div className="portal-progress">
            <progress max={100} value={Number(o.progress)} />
            <strong>{s(o.progress)} %</strong>
          </div>
          <p>
            {s(o.current_step) || "Die nächsten Schritte werden vorbereitet."}
          </p>
          <small>
            {s(o.due_kind)}: {date(o.due_date)}
          </small>
          <span className="portal-more">Auftrag ansehen ↗</span>
        </button>
      ))}
    </div>
  );
  return (
    <Shell>
      <div className="portal-layout">
        <nav aria-label="Kundenportal">
          {tabs.map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => {
                setTab(t);
                setOrderId("");
              }}
            >
              {t}
            </button>
          ))}
        </nav>
        <main className="portal-content">
          <p className="eyebrow">NEX CONSULTING · {s(data.contact[0]?.name)}</p>
          <h1>{tab === tabs[0] ? "Willkommen in Ihrem Portal." : tab}</h1>
          {tab === tabs[0] && (
            <>
              <p>
                Ihr Auftrag, unsere nächsten Schritte und Ihr direkter Kontakt.
              </p>
              <div className="portal-metrics">
                <div>
                  <strong>{current.length}</strong>Laufende Aufträge
                </div>
                <div>
                  <strong>
                    {data.tickets.filter((t) => t.status !== "Gelöst").length}
                  </strong>
                  Offene Tickets
                </div>
                <div>
                  <strong>{data.documents.length}</strong>Verträge & Dokumente
                </div>
              </div>
              <h2>Ihre aktuellen Aufträge</h2>
              {current.length ? (
                cards(current)
              ) : (
                <Blank>Aktuell ist kein laufender Auftrag freigegeben.</Blank>
              )}
              <button className="button small" onClick={() => setTab(tabs[2])}>
                Support kontaktieren ↗
              </button>
              {data.websites.length > 0 && (
                <section className="portal-card">
                  <h2>Ihre freigegebenen Websites</h2>
                  {data.websites.map((w) => (
                    <p key={w.id}>
                      <strong>{s(w.name)}</strong> · {s(w.domain)}
                    </p>
                  ))}
                </section>
              )}
            </>
          )}
          {tab === tabs[1] &&
            (order ? (
              <>
                <button className="text-link" onClick={() => setOrderId("")}>
                  ← Alle Aufträge
                </button>
                <article className="portal-card">
                  <p className="eyebrow">{s(order.number)}</p>
                  <h2>{s(order.name)}</h2>
                  <span className="portal-badge">{s(order.status)}</span>
                  <div className="portal-progress">
                    <progress max={100} value={Number(order.progress)} />
                    <strong>{s(order.progress)} %</strong>
                  </div>
                  <dl className="portal-details">
                    {[
                      ["Aktueller Bearbeitungsschritt", order.current_step],
                      ["Abgeschlossene Schritte", order.completed_steps],
                      ["Nächster geplanter Schritt", order.next_step],
                      ["Rückfragen und benötigte Unterlagen", order.questions],
                      [
                        "Fertigstellung",
                        s(order.due_kind) + " · " + date(order.due_date),
                      ],
                      ["Ihr Ansprechpartner", order.contact],
                      ["Letzte Aktualisierung", date(order.updated_at)],
                    ].map(([label, value]) => (
                      <div key={s(label)}>
                        <dt>{s(label)}</dt>
                        <dd>{s(value) || "Noch keine Angaben"}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              </>
            ) : data.orders.length ? (
              cards(data.orders)
            ) : (
              <Blank>Noch keine freigegebenen Aufträge.</Blank>
            ))}
          {tab === tabs[2] && (
            <>
              {ticket ? (
                <>
                  <button className="text-link" onClick={() => setTicketId("")}>
                    ← Alle Tickets
                  </button>
                  <article className="portal-card">
                    <span className="portal-badge">{s(ticket.status)}</span>
                    <h2>{s(ticket.subject)}</h2>
                    <p className="preline">{s(ticket.description)}</p>
                    <small>Eingegangen am {date(ticket.created_at)}</small>
                    <h3>Nachrichten</h3>
                    {data.messages
                      .filter((m) => m.ticket_id === ticket.id)
                      .map((m) => (
                        <div className="portal-message" key={m.id}>
                          <strong>{s(m.author)}</strong>
                          <small> · {date(m.created_at)}</small>
                          <p className="preline">{s(m.body)}</p>
                        </div>
                      ))}
                    <Editor
                      key={ticket.id}
                      fields={[
                        {
                          key: "body",
                          label: "Ihre Nachricht",
                          type: "textarea",
                          required: true,
                        },
                      ]}
                      label="Nachricht senden"
                      submit={(p) =>
                        save("message", { ...p, ticket_id: ticket.id })
                      }
                    />
                  </article>
                </>
              ) : (
                <>
                  <section className="portal-card">
                    <h2>Wie können wir helfen?</h2>
                    <p>
                      Beschreiben Sie Ihr Anliegen. Die passende Website ordnen
                      wir für Sie zu.
                    </p>
                    <Editor
                      fields={[
                        { key: "subject", label: "Betreff", required: true },
                        {
                          key: "description",
                          label: "Ihr Anliegen",
                          type: "textarea",
                          required: true,
                        },
                      ]}
                      label="Ticket absenden"
                      submit={(p) => save("ticket", p)}
                    />
                  </section>
                  <h2>Ihre Supporttickets</h2>
                  {!data.tickets.length && (
                    <Blank>Hier erscheinen Ihre Supportanfragen.</Blank>
                  )}
                  {data.tickets.map((t) => (
                    <button
                      className="portal-card portal-list-row"
                      key={t.id}
                      onClick={() => setTicketId(t.id)}
                    >
                      <span>
                        <strong>{s(t.subject)}</strong>
                        <small>{date(t.created_at)}</small>
                      </span>
                      <span className="portal-badge">{s(t.status)}</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
          {tab === tabs[3] && (
            <>
              {!data.plans.length && (
                <Blank>Noch kein Tarif zur Ansicht freigegeben.</Blank>
              )}
              <div className="portal-grid">
                {data.plans.map((p) => (
                  <section className="portal-card" key={p.id}>
                    <p className="eyebrow">MONATLICHE BETREUUNG</p>
                    <h2>{s(p.plan)}</h2>
                    <h3>{euro(p.monthly_cents)} / Monat netto</h3>
                    <p>
                      {Number(p.included_minutes) / 60} Stunden vereinbartes
                      Kontingent
                    </p>
                    <p>Beginn: {date(p.starts_on)}</p>
                    {Boolean(p.ends_on) && <p>Ende: {date(p.ends_on)}</p>}
                  </section>
                ))}
              </div>
            </>
          )}
          {tab === tabs[4] && (
            <>
              {!data.invoices.length && (
                <Blank>Hier finden Sie Ihre freigegebenen Rechnungen.</Blank>
              )}
              {data.invoices.map((i) => (
                <details className="portal-card" key={i.id}>
                  <summary>
                    {s(i.number)} · {s(i.subject)} ·{" "}
                    {euro(
                      Number(i.net_cents) *
                        (1 + Number(i.tax_basis_points) / 10000),
                    )}
                  </summary>
                  <p>
                    Status:{" "}
                    {i.status === "paid"
                      ? "Bezahlt"
                      : i.status === "cancelled"
                        ? "Storniert"
                        : "Ausgestellt"}{" "}
                    · {date(i.issued_at)}
                  </p>
                  {(
                    i.items as {
                      description: string;
                      quantity: number;
                      unit_cents: number;
                    }[]
                  ).map((item, n) => (
                    <p key={n}>
                      {item.description} · {item.quantity} ×{" "}
                      {euro(item.unit_cents)} netto
                    </p>
                  ))}
                  <p>
                    Netto: {euro(i.net_cents)} · Umsatzsteuer:{" "}
                    {Number(i.tax_basis_points) / 100} %
                  </p>
                </details>
              ))}
            </>
          )}
          {tab === tabs[5] && (
            <>
              {!data.documents.length && (
                <Blank>Noch keine Verträge oder Dokumente freigegeben.</Blank>
              )}
              {data.documents.map((d) => (
                <details className="portal-card" key={d.id}>
                  <summary>
                    {s(d.kind)} · {s(d.title)}
                  </summary>
                  <small>Aktualisiert: {date(d.updated_at)}</small>
                  <p className="preline">{s(d.body)}</p>
                  {Boolean(d.file_name) && (
                    <a
                      className="button small"
                      href={"/api/portal-documents?id=" + d.id}
                    >
                      PDF herunterladen
                    </a>
                  )}
                </details>
              ))}
            </>
          )}
          {tab === tabs[6] && (
            <section className="portal-card">
              <h2>{s(data.contact[0]?.name)}</h2>
              <Editor
                initial={data.contact[0]}
                fields={[
                  { key: "contact", label: "Ansprechpartner" },
                  {
                    key: "email",
                    label: "E-Mail",
                    type: "email",
                    required: true,
                  },
                  { key: "address", label: "Anschrift", type: "textarea" },
                ]}
                submit={(p) => save("contact", p)}
              />
            </section>
          )}
        </main>
      </div>
    </Shell>
  );
}
