"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell, Editor, Blank, type Field } from "./portal-shared";
import {
  display as s,
  euro,
  orderStatuses,
  type Row,
  type PortalData,
} from "@/lib/portal-model";
export default function PortalAdmin({
  initial,
  actorRole,
  initialCustomerId,
}: {
  initial: PortalData;
  actorRole: string;
  initialCustomerId?: string;
}) {
  const [data, setData] = useState(initial);
  const [customerId, setCustomer] = useState(
    initial.customers.find((c) => c.id === initialCustomerId)?.id ||
      initial.customers[0]?.id ||
      "",
  );
  const [tab, setTab] = useState("Aufträge");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  async function save(
    action: string,
    payload: Record<string, unknown>,
    id?: string,
  ) {
    const r = await fetch("/api/portal-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload, id }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  async function run(action: string, payload: Record<string, unknown>) {
    setError("");
    try {
      await save(action, payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }
  const own = (name: string) =>
    data[name].filter((r) => r.customer_id === customerId);
  const projects = own("projects");
  const plans = data.subscriptions.filter((r) =>
    projects.some((p) => p.id === r.project_id),
  );
  const options = (rows: Row[], label = "name") => [
    { value: "", label: "Keine Zuordnung" },
    ...rows.map((r) => ({ value: r.id, label: s(r[label]) })),
  ];
  const ref = (
    key: string,
    label: string,
    rows: Row[],
    name = "name",
  ): Field => ({ key, label, type: "ref", options: options(rows, name) });
  const text = (key: string, label: string, type = "text"): Field => ({
    key,
    label,
    type,
  });
  const check: Field = {
    key: "customer_visible",
    label: "Für den Kunden freigeben",
    type: "checkbox",
  };
  const staff = data.users.filter((u) => u.role !== "customer" && u.active);
  const schema: Record<string, Field[]> = {
    Aufträge: [
      { ...text("number", "Auftragsnummer"), required: true },
      { ...text("name", "Bezeichnung"), required: true },
      {
        key: "status",
        label: "Bearbeitungsstatus",
        options: orderStatuses.map((x) => ({ value: x, label: x })),
        default: orderStatuses[0],
      },
      text("progress", "Fortschritt in Prozent", "number"),
      text("current_step", "Aktueller Bearbeitungsschritt"),
      text(
        "completed_steps",
        "Abgeschlossene Schritte (eine Zeile je Schritt)",
        "textarea",
      ),
      text("next_step", "Nächster geplanter Schritt", "textarea"),
      text("questions", "Offene Rückfragen / benötigte Unterlagen", "textarea"),
      text("due_date", "Fertigstellungstermin", "date"),
      {
        key: "due_kind",
        label: "Terminart",
        options: ["Voraussichtlich", "Vereinbart"].map((x) => ({
          value: x,
          label: x,
        })),
        default: "Voraussichtlich",
      },
      text("contact", "Öffentlicher Ansprechpartner"),
      check,
      text("internal_notes", "Interne Notizen", "textarea"),
    ],
    Websites: [
      { ...text("name", "Website- / Anwendungsname"), required: true },
      text("domain", "Domain"),
      ref("project_id", "Internes Projekt", projects),
      text("status", "Projektstatus"),
      text("plan", "Gebuchter Tarif"),
      ref(
        "contract_id",
        "Vertrag",
        own("documents").filter((d) => d.kind === "Vertrag"),
        "title",
      ),
      text("contact", "Ansprechpartner"),
      ref("assignee_id", "Zuständiger Mitarbeiter", staff, "username"),
      text(
        "features",
        "Seitentitel / Funktionen für Website-Vorschläge (kommagetrennt)",
        "textarea",
      ),
      text("internal_notes", "Technische Notizen (intern)", "textarea"),
      check,
    ],
    Dokumente: [
      { ...text("title", "Titel"), required: true },
      {
        key: "kind",
        label: "Art",
        options: ["Vertrag", "Dokument"].map((x) => ({ value: x, label: x })),
        default: "Dokument",
      },
      text("body", "Dokumentinhalt", "textarea"),
      check,
    ],
  };
  const table = {
    Aufträge: "orders",
    Websites: "websites",
    Dokumente: "documents",
  }[tab];
  const row = table ? own(table).find((r) => r.id === selected) : undefined;
  const ticket = own("tickets").find((t) => t.id === selected);
  return (
    <Shell admin>
      <div className="portal-admin-top">
        <Link className="text-link" href="/crm">
          ← Zum internen CRM
        </Link>
        <label>
          Kunde
          <select
            aria-label="Kunde"
            value={customerId}
            onChange={(e) => {
              setCustomer(e.target.value);
              setSelected("");
            }}
          >
            <option value="">Kunden auswählen</option>
            {data.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {s(c.name)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="portal-layout">
        <nav aria-label="Portalverwaltung">
          {[
            "Aufträge",
            "Websites",
            "Tickets",
            "Dokumente",
            "Tarife & Rechnungen",
            "Kundenzugänge",
          ]
            .filter(
              (t) => t !== "Kundenzugänge" || actorRole === "global_admin",
            )
            .map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => {
                  setTab(t);
                  setSelected("");
                }}
              >
                {t}
              </button>
            ))}
        </nav>
        <main className="portal-content">
          <p className="eyebrow">NEX CONSULTING · INTERN</p>
          <h1>{tab}</h1>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!customerId ? (
            <Blank>
              Wählen Sie einen Kunden. Neue Kunden legen Sie im CRM an.
            </Blank>
          ) : (
            <>
              {tab === "Dokumente" && (
                <section className="portal-card">
                  <h2>PDF hochladen</h2>
                  <p>
                    Neue Dateien bleiben intern, bis Sie sie ausdrücklich
                    freigeben.
                  </p>
                  <form
                    className="portal-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const body = new FormData(form);
                      body.set("customer_id", customerId);
                      setError("");
                      try {
                        const r = await fetch("/api/portal-documents", {
                          method: "POST",
                          body,
                        });
                        const d = await r.json();
                        if (!r.ok) throw Error(d.error);
                        const state = await fetch("/api/portal-admin");
                        if (!state.ok)
                          throw Error("Aktualisieren fehlgeschlagen");
                        setData(await state.json());
                        form.reset();
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Upload fehlgeschlagen",
                        );
                      }
                    }}
                  >
                    <label>
                      Titel
                      <input name="title" required minLength={2} />
                    </label>
                    <label>
                      Art
                      <select name="kind">
                        <option>Dokument</option>
                        <option>Vertrag</option>
                      </select>
                    </label>
                    <label>
                      PDF (max. 4 MB)
                      <input
                        name="file"
                        type="file"
                        accept="application/pdf"
                        required
                      />
                    </label>
                    <button className="button small">PDF hochladen</button>
                  </form>
                </section>
              )}
              {table && (
                <>
                  <div className="portal-grid">
                    {own(table).map((r) => (
                      <button
                        key={r.id}
                        className={
                          "portal-card order-card " +
                          (r.id === selected ? "selected" : "")
                        }
                        onClick={() => setSelected(r.id)}
                      >
                        <span className="portal-badge">
                          {r.customer_visible
                            ? "Für Kunde freigegeben"
                            : "Nur intern"}
                        </span>
                        <h3>{s(r.name || r.title)}</h3>
                        <p>{s(r.number || r.domain || r.kind)}</p>
                        {table === "websites" && (
                          <>
                            <small>
                              {
                                data.order_websites
                                  .filter((l) => l.website_id === r.id)
                                  .filter((l) =>
                                    data.orders.some(
                                      (o) =>
                                        o.id === l.order_id &&
                                        o.status !== "Auftrag abgeschlossen",
                                    ),
                                  ).length
                              }{" "}
                              aktive Aufträge ·{" "}
                              {
                                own("tickets").filter(
                                  (t) =>
                                    t.website_id === r.id &&
                                    t.status !== "Gelöst",
                                ).length
                              }{" "}
                              offene Tickets
                            </small>
                            <p>
                              Projekt-ID:{" "}
                              {s(r.project_id) || "Nicht zugeordnet"}
                            </p>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                  <button className="text-link" onClick={() => setSelected("")}>
                    + Neu anlegen
                  </button>
                  <section className="portal-card">
                    <h2>{row ? "Bearbeiten" : "Neu anlegen"}</h2>
                    {Boolean(row?.file_name) && (
                      <a
                        className="text-link"
                        href={"/api/portal-documents?id=" + row!.id}
                      >
                        PDF herunterladen
                      </a>
                    )}
                    <Editor
                      key={customerId + tab + selected}
                      fields={schema[tab]}
                      initial={row}
                      submit={(p) =>
                        save(
                          {
                            Aufträge: "order",
                            Websites: "website",
                            Dokumente: "document",
                          }[tab]!,
                          { ...p, customer_id: customerId },
                          row?.id,
                        )
                      }
                    />
                  </section>
                  {tab === "Aufträge" && row && (
                    <section className="portal-card">
                      <h2>Websites dieses Auftrags</h2>
                      <p>
                        Diese Zuordnung ist intern. Mehrere Websites sind
                        möglich.
                      </p>
                      <Editor
                        key={row.id + "links"}
                        fields={own("websites").map((w) => ({
                          key: w.id,
                          label: s(w.name) + " · " + s(w.domain),
                          type: "checkbox",
                          default: data.order_websites.some(
                            (l) =>
                              l.order_id === row.id && l.website_id === w.id,
                          ),
                        }))}
                        submit={(p) =>
                          save("order_websites", {
                            order_id: row.id,
                            customer_id: customerId,
                            website_ids: Object.keys(p).filter((k) => p[k]),
                          })
                        }
                      />
                    </section>
                  )}
                </>
              )}
              {tab === "Tickets" && (
                <>
                  {!own("tickets").length && (
                    <Blank>
                      Für diesen Kunden liegen noch keine Tickets vor.
                    </Blank>
                  )}
                  {own("tickets").map((t) => (
                    <button
                      className="portal-card portal-list-row"
                      key={t.id}
                      onClick={() => setSelected(t.id)}
                    >
                      <strong>{s(t.subject)}</strong>
                      <span>
                        {s(t.assignment_status)} · {s(t.status)}
                      </span>
                    </button>
                  ))}
                  {ticket && (
                    <section className="portal-card">
                      <h2>{s(ticket.subject)}</h2>
                      <p className="preline">{s(ticket.description)}</p>
                      <h3>Automatische Zuordnungsvorschläge</h3>
                      <p>
                        Vorschläge ändern keine Zuordnung. Wählen Sie die
                        Website und speichern Sie zur Bestätigung.
                      </p>
                      {(
                        ticket.suggestion as {
                          website_id: string;
                          score: number;
                          reasons: string[];
                          method: string;
                        }[]
                      ).map((a) => (
                        <div className="portal-message" key={a.website_id}>
                          <strong>
                            {s(
                              own("websites").find((w) => w.id === a.website_id)
                                ?.name,
                            )}
                          </strong>
                          <p>
                            {a.method} · {a.reasons.join(", ")} · Wertung{" "}
                            {a.score}
                          </p>
                        </div>
                      ))}
                      {!(ticket.suggestion as unknown[])?.length && (
                        <Blank>
                          Website-Zuordnung erforderlich. Bitte manuell
                          auswählen.
                        </Blank>
                      )}
                      <button
                        className="text-link"
                        onClick={() => run("suggest", { id: ticket.id })}
                      >
                        Vorschläge neu prüfen
                      </button>
                      <Editor
                        key={ticket.id}
                        initial={ticket}
                        fields={[
                          ref(
                            "website_id",
                            "Betroffene Website / Domain",
                            own("websites"),
                          ),
                          ref("order_id", "Auftrag", own("orders")),
                          ref("project_id", "Internes Projekt", projects),
                          ref(
                            "subscription_id",
                            "Gebuchter Tarif",
                            plans,
                            "plan",
                          ),
                          ref("assignee_id", "Mitarbeiter", staff, "username"),
                          text("team", "Team"),
                          {
                            key: "status",
                            label: "Für Kunden sichtbarer Ticketstatus",
                            options: [
                              "Eingegangen",
                              "In Bearbeitung",
                              "Rückfrage",
                              "Gelöst",
                            ].map((x) => ({ value: x, label: x })),
                          },
                          text(
                            "internal_notes",
                            "Interne Kommentare",
                            "textarea",
                          ),
                        ]}
                        submit={(p) =>
                          save("ticket", {
                            ...p,
                            id: ticket.id,
                            customer_id: customerId,
                          })
                        }
                      />
                      <h3>Nachrichten & Kommentare</h3>
                      {own("ticket_messages")
                        .filter((m) => m.ticket_id === ticket.id)
                        .map((m) => (
                          <div className="portal-message" key={m.id}>
                            <strong>
                              {s(m.author)} ·{" "}
                              {m.customer_visible ? "Kundensichtbar" : "Intern"}
                            </strong>
                            <p className="preline">{s(m.body)}</p>
                          </div>
                        ))}
                      <Editor
                        fields={[
                          text(
                            "body",
                            "Antwort / interner Kommentar",
                            "textarea",
                          ),
                          check,
                        ]}
                        label="Nachricht speichern"
                        submit={(p) =>
                          save("message", {
                            ...p,
                            ticket_id: ticket.id,
                            customer_id: customerId,
                          })
                        }
                      />
                    </section>
                  )}
                </>
              )}
              {tab === "Tarife & Rechnungen" && (
                <>
                  <h2>Betreuungstarife</h2>
                  {!plans.length && (
                    <Blank>Tarife legen Sie im CRM unter Betreuung an.</Blank>
                  )}
                  {plans.map((p) => (
                    <section className="portal-card" key={p.id}>
                      <h3>
                        {s(p.plan)} · {euro(p.monthly_cents)} / Monat
                      </h3>
                      <p>
                        {s(projects.find((x) => x.id === p.project_id)?.name)}
                      </p>
                      <button
                        className="button small"
                        onClick={() =>
                          run("visibility", {
                            id: p.id,
                            entity: "subscriptions",
                            customer_visible: !p.customer_visible,
                          })
                        }
                      >
                        {p.customer_visible
                          ? "Freigabe zurücknehmen"
                          : "Für Kunde freigeben"}
                      </button>
                    </section>
                  ))}
                  <h2>Rechnungen</h2>
                  {!own("invoices").length && (
                    <Blank>Noch keine Rechnungen vorhanden.</Blank>
                  )}
                  {own("invoices").map((i) => (
                    <section className="portal-card" key={i.id}>
                      <h3>
                        {s(i.subject)} · {euro(i.net_cents)} netto
                      </h3>
                      <p>
                        {i.status === "draft"
                          ? "Entwurf – für Kunden gesperrt"
                          : s(i.number)}
                      </p>
                      <button
                        className="button small"
                        disabled={i.status === "draft"}
                        onClick={() =>
                          run("visibility", {
                            id: i.id,
                            entity: "invoices",
                            customer_visible: !i.customer_visible,
                          })
                        }
                      >
                        {i.customer_visible
                          ? "Freigabe zurücknehmen"
                          : "Für Kunde freigeben"}
                      </button>
                    </section>
                  ))}
                </>
              )}
              {tab === "Kundenzugänge" && actorRole === "global_admin" && (
                <>
                  <p>
                    Jeder Zugang ist fest einem Kunden zugeordnet. Zugangsdaten
                    geben Sie persönlich weiter.
                  </p>
                  {own("users").map((u) => (
                    <section className="portal-card" key={u.id}>
                      <h3>{s(u.username)}</h3>
                      <button
                        className="button small"
                        onClick={() =>
                          run("account_active", { id: u.id, active: !u.active })
                        }
                      >
                        {u.active ? "Zugang sperren" : "Zugang aktivieren"}
                      </button>
                    </section>
                  ))}
                  <section className="portal-card">
                    <h2>Kundenzugang anlegen</h2>
                    <Editor
                      key={customerId}
                      fields={[
                        {
                          key: "username",
                          label: "Benutzername",
                          required: true,
                        },
                        {
                          key: "password",
                          label: "Passwort (mindestens 12 Zeichen)",
                          type: "password",
                          required: true,
                        },
                      ]}
                      submit={(p) =>
                        save("account", { ...p, customer_id: customerId })
                      }
                    />
                  </section>
                </>
              )}
            </>
          )}
          {actorRole === "global_admin" && tab === "Kundenzugänge" && (
            <section className="portal-card">
              <h2>Mitarbeiterzugang anlegen</h2>
              {data.users
                .filter((u) => u.role === "employee")
                .map((u) => (
                  <div className="portal-message" key={u.id}>
                    <strong>{s(u.username)}</strong>
                    <button
                      className="text-link"
                      onClick={() =>
                        run("account_active", { id: u.id, active: !u.active })
                      }
                    >
                      {u.active
                        ? "Mitarbeiterzugang sperren"
                        : "Mitarbeiterzugang aktivieren"}
                    </button>
                  </div>
                ))}
              <p>
                Mitarbeiter können Aufträge, Websites und Tickets im Adminportal
                bearbeiten.
              </p>
              <Editor
                fields={[
                  {
                    key: "username",
                    label: "Mitarbeiter-Benutzername",
                    required: true,
                  },
                  {
                    key: "password",
                    label: "Mitarbeiter-Passwort (mindestens 12 Zeichen)",
                    type: "password",
                    required: true,
                  },
                ]}
                submit={(p) => save("employee_account", p)}
              />
            </section>
          )}
        </main>
      </div>
    </Shell>
  );
}
