"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import {
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  FileText,
  Landmark,
  RefreshCw,
  Plus,
  Upload,
  ChevronRight,
  Check,
  LockKeyhole,
  Network,
  Download,
  X,
} from "lucide-react";
import {
  financeViews,
  brandNames,
  money,
  summarize,
  inPeriod,
  depreciationForMonth,
  parseMoney,
  type FinanceSnapshot,
  type FinanceRecord,
  type FinanceData,
  type FinanceKind,
} from "@/lib/finance/model";
import { financeDataSchema } from "@/lib/finance/schema";
const kinds: Record<string, string> = {
  incoming_invoice: "Eingangsrechnung",
  outgoing_invoice: "Ausgangsrechnung",
  delivery_note: "Lieferschein",
  payroll: "Lohnunterlage",
  contract: "Vertrag",
  other: "Sonstiger Beleg",
};
const today = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const amountInput = (n: number) =>
  ((n || 0) / 100).toFixed(2).replace(".", ",");
type Command = {
  action: "reverse" | "classify" | "match";
  record: FinanceRecord;
};
export default function FinanceHub({ view }: { view: string }) {
  const [data, setData] = useState<FinanceSnapshot | null>(null),
    [scope, setScope] = useState("nex"),
    [period, setPeriod] = useState(today().slice(0, 7)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<
      FinanceRecord | { kind: FinanceKind; document_kind?: string } | null
    >(null),
    [command, setCommand] = useState<Command | null>(null),
    [token, setToken] = useState<{ source: string; value: string } | null>(
      null,
    ),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState("");
  const current = financeViews.find((v) => v[0] === view) || financeViews[0];
  const load = useCallback(async () => {
    const r = await fetch("/api/finance", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw Error(j.error || "Buchhaltung nicht erreichbar.");
    setData(j);
  }, []);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    setEditor(null);
    setCommand(null);
    setSearch("");
  }, [view]);
  async function call(
    action: string,
    payload: Record<string, unknown>,
    path = "/api/finance",
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          path.endsWith("/sync") ? payload : { action, payload },
        ),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || "Aktion fehlgeschlagen.");
      await load();
      setNotice("Gespeichert.");
      return j;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  const records =
    data?.records.filter(
      (r) =>
        (scope === "all" || r.brand === scope) &&
        ((r.kind === "asset" && view === "assets") || inPeriod(r, period)) &&
        (!search ||
          [r.data.title, r.data.reference, r.data.party, r.brand]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())),
    ) ?? [];
  const summary = data
    ? summarize(data.records, data.brands, data.allocation, period)
    : null;
  const visibleSummary =
    summary?.rows.filter((r) => scope === "all" || r.code === scope) ?? [];
  const income = visibleSummary.reduce((s, r) => s + r.income, 0),
    cost = visibleSummary.reduce((s, r) => s + r.cost, 0),
    result = visibleSummary.reduce((s, r) => s + r.result, 0);
  const incomplete =
    data?.sources.filter(
      (s) =>
        s.code !== "nex" &&
        (s.status !== "connected" ||
          !s.last_sync ||
          Date.now() - Date.parse(s.last_sync) > 86400000),
    ) ?? [];
  const drafts = records.filter(
    (r) =>
      r.kind === "document" &&
      ["incoming_invoice", "outgoing_invoice"].includes(r.data.document_kind) &&
      r.state === "draft",
  );
  const documents = records.filter(
    (r) =>
      r.kind === "document" &&
      (view === "delivery"
        ? r.data.document_kind === "delivery_note"
        : view === "payroll"
          ? r.data.document_kind === "payroll"
          : r.data.document_kind !== "delivery_note"),
  );
  function openNew(kind: FinanceKind, document_kind?: string) {
    setEditor({ kind, document_kind });
    setCommand(null);
  }
  const exportUrl = (type = "summary", format = "csv") =>
    "/api/finance/export?" +
    new URLSearchParams({ scope, period, type, format });
  function card(r: FinanceRecord) {
    return (
      <article className="finance-record" key={r.id}>
        <div className="finance-record-main">
          <div className="finance-record-icon">
            <FileText size={20} />
          </div>
          <div>
            <span className="finance-meta">
              {r.data.date} · {brandNames[r.brand] || r.brand}
            </span>
            <h3>{r.data.title}</h3>
            <p>
              {r.data.party}
              {r.data.reference ? " · " + r.data.reference : ""}
            </p>
            <span className={"finance-status " + r.state}>
              {r.missing
                ? "Fehlt im Quellstand"
                : r.state === "posted"
                  ? "Festgeschrieben"
                  : r.state === "reversed"
                    ? "Storniert"
                    : "Entwurf"}{" "}
              · {r.source === "nex" ? "NEX" : brandNames[r.source]}
            </span>
          </div>
          <strong className="finance-record-amount">
            {money(
              r.kind === "asset"
                ? r.data.acquisition_cost
                : r.kind === "payroll"
                  ? r.data.net + r.data.employer_cost
                  : r.data.gross,
            )}
          </strong>
        </div>
        <div className="finance-record-actions">
          {r.attachment && (
            <a
              className="button small outline"
              href={"/api/finance/file?id=" + r.id}
            >
              Original öffnen <ArrowUpRight size={13} />
            </a>
          )}
          {r.source === "nex" && r.state === "draft" && (
            <>
              <button
                className="button small outline"
                disabled={busy}
                onClick={() => setEditor(r)}
              >
                Prüfen & bearbeiten
              </button>
              {(r.kind !== "document" ||
                ["incoming_invoice", "outgoing_invoice"].includes(
                  r.data.document_kind,
                )) && (
                <button
                  className="button small"
                  disabled={busy}
                  onClick={() => call("post", { id: r.id, version: r.version })}
                >
                  {r.kind === "asset"
                    ? "Anlage aktivieren"
                    : r.kind === "payroll"
                      ? "Lohnstand bestätigen"
                      : "Festschreiben"}
                </button>
              )}
            </>
          )}
          <button
            className="text-link"
            disabled={busy}
            onClick={() => setCommand({ action: "classify", record: r })}
          >
            Kostenstelle zuordnen
          </button>
          {r.source === "nex" &&
            r.state === "posted" &&
            !r.reversal_id &&
            ["document", "depreciation"].includes(r.kind) && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => setCommand({ action: "reverse", record: r })}
              >
                Stornieren
              </button>
            )}
          {r.source !== "nex" && (
            <span className="finance-meta">
              Beträge werden im Quellsystem korrigiert.
            </span>
          )}
        </div>
      </article>
    );
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (scope === "all" || scope === "unassigned") {
      setError("Bitte zuerst die Kostenstelle wählen.");
      return;
    }
    const document_kind =
      view === "delivery"
        ? "delivery_note"
        : view === "payroll"
          ? "payroll"
          : String(
              new FormData(e.target.form!).get("document_kind") ||
                "incoming_invoice",
            );
    setBusy(true);
    setError("");
    try {
      if (file.size > 20971520) throw Error("Maximal 20 MB je Datei.");
      const r = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare_upload",
          payload: {
            brand: scope,
            document_kind,
            name: file.name,
            mime: file.type,
            size: file.size,
          },
        }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      const body = new FormData();
      body.append("cacheControl", "0");
      body.append("", file);
      const u = await fetch(j.result.signed_url, { method: "PUT", body });
      if (!u.ok)
        throw Error("Upload fehlgeschlagen. Bitte den Beleg erneut hochladen.");
      const f = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_complete",
          payload: { id: j.result.id },
        }),
      });
      if (!f.ok) throw Error("Upload konnte nicht bestätigt werden.");
      await load();
      setNotice(
        "Original geschützt gespeichert. Bitte Belegdaten prüfen und ergänzen.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  return (
    <div className="finance-shell workspace">
      <aside className={"finance-sidebar " + (mobile ? "open" : "")}>
        <button
          className="finance-mobile-close button small"
          onClick={() => setMobile(false)}
          aria-label="Navigation schließen"
        >
          <X size={20} />
        </button>
        <Brand />
        <p className="eyebrow">NEX CONSULTING KG</p>
        <h2>Finanzbuchhaltung</h2>
        <nav aria-label="Finanzbuchhaltung">
          {financeViews.map(([slug, label, detail], i) => (
            <Link
              key={slug}
              className={current[0] === slug ? "active" : ""}
              href={"/crm/finance/" + slug}
              onClick={() => setMobile(false)}
            >
              <span className="finance-nav-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
            </Link>
          ))}
        </nav>
        <div className="finance-sidebar-bottom">
          <Link href="/crm?tab=Rechnungen">
            Kundenrechnungen <ArrowUpRight size={14} />
          </Link>
          <Link href="/crm?tab=Betreuung">
            Betreuungsverträge <ArrowUpRight size={14} />
          </Link>
          <Link href="/crm">← Zurück zum CRM</Link>
          <p>
            <LockKeyhole size={12} /> Geschützter Unternehmensbestand
          </p>
        </div>
      </aside>
      <div className="finance-main">
        <header className="finance-topbar">
          <div className="finance-mobile-brand">
            <Brand />
          </div>
          <button
            className="button small outline finance-menu"
            onClick={() => setMobile(!mobile)}
            aria-expanded={mobile}
          >
            Navigation
          </button>
          <span>
            Workspace <ChevronRight size={13} /> Finanzen{" "}
            <ChevronRight size={13} /> {current[1]}
          </span>
          <button
            className="button small outline"
            disabled={busy}
            onClick={() => {
              setError("");
              void load().catch((e) => setError(e.message));
            }}
          >
            <RefreshCw size={14} /> Aktualisieren
          </button>
        </header>
        <main>
          <div className="finance-heading">
            <div>
              <p className="eyebrow">EINE GESELLSCHAFT. ALLE MARKEN.</p>
              <h1>{current[1]}</h1>
              <p>
                {view === "overview"
                  ? "Alle Zahlen an einem Ort. Mit klarer Herkunft und getrennten Kostenstellen."
                  : current[2]}
              </p>
            </div>
            <div
              className="finance-scope-switch"
              aria-label="Buchhaltungsansicht"
            >
              <button
                className={scope === "nex" ? "active" : ""}
                onClick={() => setScope("nex")}
              >
                <Building2 size={16} /> NEX Allgemein
              </button>
              <button
                className={scope === "all" ? "active" : ""}
                onClick={() => setScope("all")}
              >
                <Network size={16} /> Gesamtfirma
              </button>
            </div>
          </div>
          <div className="finance-toolbar">
            <label>
              Kostenstelle
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="all">Gesamtfirma · alle Marken</option>
                {Object.entries(brandNames).map(([id, name]) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Zeitraum
              <input
                type="month"
                value={period.length === 7 ? period : ""}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </label>
            <button
              className="text-link"
              onClick={() => setPeriod(today().slice(0, 4))}
            >
              Gesamtes Jahr
            </button>
            <button className="text-link" onClick={() => setPeriod("")}>
              Alle Zeiträume
            </button>
            <label className="finance-search">
              Suche
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Beleg, Geschäftspartner, Referenz …"
              />
            </label>
          </div>
          {error && (
            <p className="finance-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="finance-success" role="status">
              <Check size={16} />
              {notice}
            </p>
          )}
          {!data && !error && (
            <p className="finance-empty">Buchhaltung wird geladen …</p>
          )}
          {data && (
            <>
              {scope === "all" && incomplete.length > 0 && (
                <div className="finance-banner">
                  <Network size={20} />
                  <div>
                    <strong>Gesamtstand noch unvollständig</strong>
                    <p>
                      {incomplete.map((s) => s.name).join(", ")}: Schnittstelle
                      fehlt, ist nicht vollständig oder länger als 24 Stunden
                      ohne Abgleich. Fehlende Marken werden nicht als
                      vollständiger Null-Umsatz gewertet.
                    </p>
                  </div>
                  <Link href="/crm/finance/settings">
                    Schnittstellen <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
              {records.some((r) => r.missing) && (
                <p className="finance-error">
                  Im Quellsystem fehlende Datensätze sind markiert. Vor dem
                  Abschluss die Herkunft prüfen.
                </p>
              )}
              {editor && (
                <RecordForm
                  key={
                    "id" in editor
                      ? editor.id + editor.version
                      : editor.kind + (editor.document_kind || "")
                  }
                  entry={editor}
                  scope={scope}
                  brands={data.brands}
                  onCancel={() => setEditor(null)}
                  busy={busy}
                  onSave={async (p) => {
                    if (await call("save", p)) setEditor(null);
                  }}
                />
              )}
              {command && (
                <form
                  className="finance-panel finance-command"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const f = new FormData(e.currentTarget);
                      const payload =
                        command.action === "match"
                          ? {
                              bank_id: command.record.id,
                              document_id: String(f.get("document")),
                              amount: parseMoney(String(f.get("amount"))),
                            }
                          : {
                              id: command.record.id,
                              version: command.record.version,
                              reason: f.get("reason"),
                              date: f.get("date"),
                              brand: f.get("brand"),
                            };
                      if (await call(command.action, payload)) setCommand(null);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Eingabe prüfen.",
                      );
                    }
                  }}
                >
                  <div className="finance-panel-heading">
                    <h2>
                      {command.action === "reverse"
                        ? "Stornobuchung"
                        : command.action === "match"
                          ? "Bankumsatz zuordnen"
                          : "Kostenstelle zuordnen"}
                    </h2>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Aktion schließen"
                      onClick={() => setCommand(null)}
                    >
                      <X />
                    </button>
                  </div>
                  <p>{command.record.data.title}</p>
                  {command.action === "reverse" ? (
                    <>
                      <label>
                        Stornodatum
                        <input
                          name="date"
                          type="date"
                          required
                          defaultValue={today()}
                        />
                      </label>
                      <label>
                        Begründung
                        <textarea name="reason" required minLength={3} />
                      </label>
                      <p className="finance-note">
                        Das Original bleibt erhalten. Eine Gegenbuchung wird im
                        gewählten Monat angelegt.
                      </p>
                    </>
                  ) : command.action === "classify" ? (
                    <label>
                      Kostenstelle
                      <select name="brand" defaultValue={command.record.brand}>
                        {data.brands
                          .filter((b) => b.active)
                          .map((b) => (
                            <option key={b.code} value={b.code}>
                              {b.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label>
                        Gebuchter Beleg
                        <select name="document" required>
                          <option value="">Bitte wählen</option>
                          {data.records
                            .filter(
                              (r) =>
                                r.kind === "document" &&
                                r.source === "nex" &&
                                r.state === "posted" &&
                                !r.reversal_id &&
                                [
                                  "incoming_invoice",
                                  "outgoing_invoice",
                                ].includes(r.data.document_kind),
                            )
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.data.title} · {money(r.data.gross)}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Zuordnungsbetrag (EUR)
                        <input
                          name="amount"
                          required
                          defaultValue={amountInput(
                            Math.abs(command.record.data.gross) -
                              data.matches
                                .filter((m) => m.bank_id === command.record.id)
                                .reduce((s, m) => s + m.amount, 0),
                          )}
                        />
                      </label>
                    </>
                  )}
                  <button className="button" disabled={busy}>
                    Bestätigen
                  </button>
                </form>
              )}
              {["overview", "reports"].includes(current[0]) && (
                <>
                  <div className="finance-kpis">
                    <Kpi
                      label="Einnahmen · netto"
                      value={money(income)}
                      detail="Festgeschriebene Erlösbelege"
                    />
                    <Kpi
                      label="Kosten · netto"
                      value={money(cost)}
                      detail="Aufwand & gebuchte AfA"
                    />
                    <Kpi
                      label="Vorläufiges Ergebnis"
                      value={money(result)}
                      detail={
                        scope === "all"
                          ? "Umlagen verändern die Gesamtsumme nicht"
                          : "Nach interner Kostenverteilung"
                      }
                    />
                    <Kpi
                      label="Noch zu prüfen"
                      value={String(drafts.length)}
                      detail="Ungebuchte Rechnungen im Zeitraum"
                    />
                  </div>
                  <div className="finance-panel">
                    <div className="finance-panel-heading">
                      <div>
                        <p className="eyebrow">KOSTENSTELLEN & ERGEBNIS</p>
                        <h2>
                          {scope === "all"
                            ? "Die Marken im Vergleich"
                            : "Ihr Buchhaltungsstand"}
                        </h2>
                      </div>
                      <div className="finance-inline">
                        <a
                          className="button small outline"
                          href={exportUrl("summary", "pdf")}
                        >
                          <Download size={14} /> PDF
                        </a>
                        <a className="button small outline" href={exportUrl()}>
                          CSV
                        </a>
                      </div>
                    </div>
                    <div className="finance-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Kostenstelle</th>
                            <th>Einnahmen</th>
                            <th>Kosten</th>
                            <th>Umlage</th>
                            <th>Ergebnis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleSummary.map((r) => (
                            <tr key={r.code}>
                              <td>
                                <strong>{r.name}</strong>
                                <small>{r.documents} Belege</small>
                              </td>
                              <td data-label="Einnahmen">{money(r.income)}</td>
                              <td data-label="Kosten">{money(r.cost)}</td>
                              <td data-label="Umlage">{money(r.allocated)}</td>
                              <td data-label="Ergebnis">
                                <strong>{money(r.result)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="finance-note">
                      Umlageschlüssel:{" "}
                      {data.allocation.mode === "none"
                        ? "noch nicht festgelegt"
                        : data.allocation.mode === "revenue"
                          ? "Umsatzanteil"
                          : "feste Prozentsätze"}
                      . Nicht verteilte Allgemeinkosten:{" "}
                      {money(summary?.unallocated || 0)}. Grundlage sind
                      gebuchte Nettobeträge; Bankumsätze werden nicht zusätzlich
                      als Einnahmen oder Kosten gezählt.
                    </p>
                  </div>
                  {current[0] === "overview" && (
                    <div className="finance-flow">
                      {[
                        [
                          "documents",
                          "01",
                          "Belege erfassen",
                          "Originale hochladen und Kostenstelle wählen",
                        ],
                        [
                          "bank",
                          "02",
                          "Zahlungen abgleichen",
                          "Bankumsätze mit offenen Belegen verbinden",
                        ],
                        [
                          "reports",
                          "03",
                          "Gesamtfirma steuern",
                          "Markenergebnis und Allgemeinkosten vergleichen",
                        ],
                      ].map(([slug, n, title, text]) => (
                        <Link key={slug} href={"/crm/finance/" + slug}>
                          <span>{n}</span>
                          <h3>{title}</h3>
                          <p>{text}</p>
                          <ArrowUpRight size={20} />
                        </Link>
                      ))}
                    </div>
                  )}
                  {current[0] === "reports" && (
                    <>
                      <div className="finance-panel">
                        <h2>Abschlussvorbereitung</h2>
                        <p>
                          Gesellschaft: NEX Consulting KG · Marken sind
                          Kostenstellen innerhalb derselben Gesellschaft.
                        </p>
                        <p className="finance-note">
                          Diese Auswertung ist ein vorläufiger interner
                          Gesamtstand, kein festgestellter Jahresabschluss oder
                          Steuerabschluss. Kontierung, Vollständigkeit,
                          Rückstellungen, Abgrenzungen und
                          Eröffnungs-/Abschlussbuchungen sind fachlich zu
                          prüfen. Für vollständige Zahlen müssen alle Marken
                          angeschlossen sein.
                        </p>
                        <div className="finance-inline">
                          <a className="button" href={exportUrl("journal")}>
                            Buchungsjournal exportieren
                          </a>
                          <a
                            className="button outline"
                            href={exportUrl("summary", "pdf")}
                          >
                            Gesamtstand als PDF
                          </a>
                        </div>
                      </div>
                      <div className="finance-panel">
                        <h2>Herkunft & Datenstand</h2>
                        {data.sources.map((s) => (
                          <div className="finance-source-row" key={s.code}>
                            <strong>{s.name}</strong>
                            <span>
                              {s.status === "local"
                                ? "Lokaler Bestand"
                                : s.status === "connected"
                                  ? "Abgeglichen"
                                  : s.status === "partial"
                                    ? "Teilbestand"
                                    : "Anbindung offen"}
                            </span>
                            <small>
                              {s.last_sync
                                ? new Date(s.last_sync).toLocaleString("de-DE")
                                : "Noch kein Abgleich"}
                            </small>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {["documents", "delivery", "payroll"].includes(current[0]) && (
                <>
                  <div className="finance-panel finance-upload">
                    <div>
                      <p className="eyebrow">GESCHÜTZTE ORIGINALABLAGE</p>
                      <h2>
                        {view === "delivery"
                          ? "Lieferscheine ablegen"
                          : view === "payroll"
                            ? "Lohnunterlagen sammeln"
                            : "Belege erfassen"}
                      </h2>
                      <p>
                        PDF, JPG, PNG oder WebP · bis 20 MB. Nach dem Upload
                        Belegdaten ergänzen und prüfen.
                      </p>
                    </div>
                    <form>
                      {view === "documents" && (
                        <label>
                          Belegart
                          <select name="document_kind">
                            {Object.entries(kinds).map(([key, title]) => (
                              <option value={key} key={key}>
                                {title}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label className="finance-file-button">
                        <Upload size={17} /> Datei auswählen
                        <input
                          type="file"
                          accept="application/pdf,image/png,image/jpeg,image/webp"
                          disabled={
                            busy || scope === "all" || scope === "unassigned"
                          }
                          onChange={upload}
                        />
                      </label>
                    </form>
                  </div>
                  <div className="finance-panel-heading">
                    <h2>
                      {view === "delivery"
                        ? "Lieferscheinarchiv"
                        : view === "payroll"
                          ? "Lohnunterlagen"
                          : "Belegbestand"}
                    </h2>
                    <button
                      className="button small"
                      disabled={busy}
                      onClick={() =>
                        openNew(
                          "document",
                          view === "delivery"
                            ? "delivery_note"
                            : view === "payroll"
                              ? "payroll"
                              : "incoming_invoice",
                        )
                      }
                    >
                      <Plus size={15} /> Manuell erfassen
                    </button>
                  </div>
                  {documents.length ? (
                    documents.map(card)
                  ) : (
                    <Empty
                      title="Hier beginnt Ihre geordnete Ablage."
                      text="Erfassen Sie einen Beleg oder wählen Sie eine andere Kostenstelle und einen anderen Zeitraum."
                    />
                  )}
                  {view === "delivery" && (
                    <p className="finance-note">
                      Lieferscheine dokumentieren Lieferungen. Sie lösen keine
                      Zahlungs- oder Aufwandsbuchung aus.
                    </p>
                  )}
                  {view === "payroll" && (
                    <>
                      <div className="finance-panel-heading">
                        <h2>Lohnstände je Monat</h2>
                        <button
                          className="button small outline"
                          onClick={() => openNew("payroll")}
                        >
                          Lohnstand erfassen
                        </button>
                      </div>
                      <p className="finance-note">
                        Bruttolohn, Arbeitgeberanteile und Nettolohn dienen der
                        Vorbereitung und Kontrolle. Personalaufwand fließt über
                        gebuchte Eingangs-/Lohnbelege in das Ergebnis ein, damit
                        er nicht doppelt gezählt wird. Steuer- und
                        Sozialversicherungsberechnung erfolgen im Lohnsystem.
                      </p>
                      {records.filter((r) => r.kind === "payroll").map(card)}
                    </>
                  )}
                </>
              )}
              {current[0] === "bank" && (
                <>
                  <div className="finance-panel">
                    <div className="finance-panel-heading">
                      <div>
                        <h2>Bankumsätze importieren</h2>
                        <p>
                          CSV mit eindeutigen Umsatz-IDs. Wiederholte Importe
                          erzeugen keine Dubletten.
                        </p>
                      </div>
                      <button
                        className="button small outline"
                        onClick={() => openNew("bank")}
                      >
                        Umsatz erfassen
                      </button>
                    </div>
                    <BankImport
                      scope={scope}
                      busy={busy}
                      save={(p) => call("bank_import", p)}
                    />
                  </div>
                  {records
                    .filter((r) => r.kind === "bank")
                    .map((r) => (
                      <div key={r.id}>
                        {card(r)}
                        <div className="finance-bank-match">
                          <span>
                            Abgeglichen:{" "}
                            {money(
                              data.matches
                                .filter((m) => m.bank_id === r.id)
                                .reduce((s, m) => s + m.amount, 0),
                            )}{" "}
                            von {money(Math.abs(r.data.gross))}
                          </span>
                          {r.source === "nex" && r.state === "posted" && (
                            <button
                              className="button small outline"
                              onClick={() =>
                                setCommand({ action: "match", record: r })
                              }
                            >
                              Beleg zuordnen
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  {!records.some((r) => r.kind === "bank") && (
                    <Empty
                      title="Bank und Belege zusammenführen."
                      text="Importieren Sie einen Kontoauszug im angegebenen CSV-Format. Live-Bankzugänge werden separat eingerichtet."
                    />
                  )}
                </>
              )}
              {current[0] === "payments" && (
                <>
                  <div className="finance-panel">
                    <h2>Zahlungen vorbereiten und freigeben</h2>
                    <p>
                      Offene, gebuchte NEX-Eingangsrechnungen mit
                      Empfänger-IBAN. Der Export ist eine Zahlungsvorbereitung
                      und führt keine Überweisung aus.
                    </p>
                    <a
                      className="button small outline"
                      href={exportUrl("payments")}
                    >
                      Freigegebene Zahlungsaufträge als CSV
                    </a>
                  </div>
                  {records
                    .filter(
                      (r) =>
                        r.kind === "document" &&
                        r.data.document_kind === "incoming_invoice" &&
                        r.state === "posted" &&
                        !r.reversal_id &&
                        r.data.gross > 0 &&
                        r.data.payment_status !== "paid",
                    )
                    .map((r) => {
                      const p = data.payments.find(
                        (p) => p.document_id === r.id,
                      );
                      return (
                        <div key={r.id}>
                          {card(r)}
                          <div className="finance-bank-match">
                            <span>
                              Fällig:{" "}
                              {r.data.due_date || "Noch nicht angegeben"} ·{" "}
                              {p?.state === "approved"
                                ? "Zahlung freigegeben"
                                : p?.state === "prepared"
                                  ? "Zur Freigabe vorbereitet"
                                  : "Offen"}
                            </span>
                            {r.source === "nex" && (
                              <button
                                className="button small"
                                disabled={busy || p?.state === "approved"}
                                onClick={() =>
                                  call(
                                    p?.state === "prepared"
                                      ? "payment_approve"
                                      : "payment_prepare",
                                    { id: r.id, version: r.version },
                                  )
                                }
                              >
                                {p?.state === "prepared"
                                  ? "Zahlungsauftrag freigeben"
                                  : p?.state === "approved"
                                    ? "Freigegeben"
                                    : "Zahlung vorbereiten"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
              {current[0] === "assets" && (
                <>
                  <div className="finance-panel-heading">
                    <div>
                      <h2>Anlagenverzeichnis</h2>
                      <p>
                        Nutzungsdauer und Restwert werden individuell
                        vorgegeben. Monatliche lineare AfA, centgenau über die
                        gesamte Laufzeit.
                      </p>
                    </div>
                    <button
                      className="button small"
                      onClick={() => openNew("asset")}
                    >
                      <Plus size={15} /> Anlage anlegen
                    </button>
                  </div>
                  {records
                    .filter((r) => r.kind === "asset")
                    .map((r) => (
                      <div key={r.id}>
                        {card(r)}
                        <div className="finance-bank-match">
                          <span>
                            {r.data.life_months} Monate · Inbetriebnahme{" "}
                            {r.data.in_service || "offen"} · AfA{" "}
                            {period.length === 7
                              ? money(depreciationForMonth(r, period))
                              : "Monat wählen"}
                          </span>
                          {r.source === "nex" && r.state === "posted" && (
                            <button
                              className="button small outline"
                              disabled={busy || period.length !== 7}
                              onClick={() =>
                                call("depreciate", { id: r.id, month: period })
                              }
                            >
                              Monats-AfA buchen
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  <div className="finance-panel-heading">
                    <h2>Gebuchte Abschreibungen</h2>
                  </div>
                  {records.filter((r) => r.kind === "depreciation").map(card)}
                  {!records.some((r) => r.kind === "asset") && (
                    <Empty
                      title="Anlagen im Blick behalten."
                      text="Erfassen Sie Anschaffungswert, Inbetriebnahme, Nutzungsdauer und AfA-Konten. Anlagenkäufe werden getrennt vom laufenden Aufwand geführt."
                    />
                  )}
                </>
              )}
              {current[0] === "settings" && (
                <>
                  <div className="finance-panel">
                    <p className="eyebrow">RECHTSTRÄGER</p>
                    <h2>NEX Consulting KG</h2>
                    <p>
                      Eine Gesellschaft, getrennte Marken-Kostenstellen.
                      Zwischen den Marken werden keine zusätzlichen internen
                      Umsätze erzeugt.
                    </p>
                    <div className="finance-brand-grid">
                      {data.brands.map((b) => (
                        <div key={b.code}>
                          <Building2 size={17} />
                          <strong>{b.name}</strong>
                          <small>{b.code}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                  <AllocationForm
                    data={data}
                    busy={busy}
                    save={(p) => call("allocation", p)}
                  />
                  <div className="finance-panel">
                    <div className="finance-panel-heading">
                      <div>
                        <p className="eyebrow">VERBUNDENE BUCHHALTUNGEN</p>
                        <h2>Schnittstellen der Marken</h2>
                      </div>
                      <Network />
                    </div>
                    <p className="finance-note">
                      Jede Marke bekommt einen eigenen Schlüssel ausschließlich
                      für ihre Buchhaltungsdaten. Bestehende Datenbank- oder
                      Administrationszugänge werden nicht weitergegeben. Neue
                      Schlüssel ersetzen die bisherige Verbindung.
                    </p>
                    {data.sources
                      .filter((s) => s.code !== "nex")
                      .map((s) => (
                        <article className="finance-source-card" key={s.code}>
                          <div>
                            <h3>{s.name}</h3>
                            <p>
                              {s.status === "connected"
                                ? "Verbunden"
                                : s.status === "partial"
                                  ? "Teilbestand"
                                  : s.status === "error"
                                    ? "Abgleich fehlgeschlagen"
                                    : "Vorbereitet · Quellprojekt noch anbinden"}
                            </p>
                            <small>
                              {s.record_count} Datensätze ·{" "}
                              {s.last_sync
                                ? new Date(s.last_sync).toLocaleString("de-DE")
                                : "Noch kein Datenstand"}
                            </small>
                            {s.last_error && (
                              <p className="finance-error">{s.last_error}</p>
                            )}
                          </div>
                          <div className="finance-inline">
                            <button
                              className="button small outline"
                              disabled={busy}
                              onClick={async () => {
                                const r = await call("source_token", {
                                  source: s.code,
                                });
                                if (r)
                                  setToken({
                                    source: s.code,
                                    value: r.result.token,
                                  });
                              }}
                            >
                              {s.enabled
                                ? "Schlüssel erneuern"
                                : "Schnittstelle aktivieren"}
                            </button>
                            <button
                              className="button small"
                              disabled={busy || !s.enabled}
                              onClick={() =>
                                call(
                                  "",
                                  { source: s.code },
                                  "/api/finance/sync",
                                )
                              }
                            >
                              Jetzt abgleichen
                            </button>
                          </div>
                        </article>
                      ))}
                    {token && (
                      <div className="finance-token">
                        <h3>Schlüssel für {brandNames[token.source]}</h3>
                        <p>
                          Einmalige Anzeige. Im Quellprojekt als
                          NEX_ACCOUNTING_TOKEN hinterlegen.
                        </p>
                        <input
                          aria-label="Schnittstellenschlüssel"
                          type="password"
                          readOnly
                          value={token.value}
                        />
                        <button
                          className="button small outline"
                          onClick={async () => {
                            await navigator.clipboard.writeText(token.value);
                            setNotice("Schnittstellenschlüssel kopiert.");
                          }}
                        >
                          Kopieren
                        </button>
                        <button
                          className="text-link"
                          onClick={() => setToken(null)}
                        >
                          Anzeige schließen
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </main>
        <footer className="finance-footer">
          NEX Consulting KG · BUILD WHAT’S NEX(T).{" "}
          <span>
            {data
              ? "Stand " + new Date(data.captured_at).toLocaleString("de-DE")
              : ""}
          </span>
        </footer>
      </div>
    </div>
  );
}
function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="finance-empty">
      <FileText size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function RecordForm({
  entry,
  scope,
  brands,
  onCancel,
  onSave,
  busy,
}: {
  entry: FinanceRecord | { kind: FinanceKind; document_kind?: string };
  scope: string;
  brands: FinanceSnapshot["brands"];
  onCancel: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const existing = "id" in entry ? entry : null,
    kind = entry.kind;
  const d =
    existing?.data ??
    financeDataSchema.parse({
      title: "Neuer Eintrag",
      date: today(),
      document_kind: "document_kind" in entry ? entry.document_kind : "other",
    });
  const [localError, setLocalError] = useState("");
  const field = (
    name: keyof FinanceData,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label key={name}>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={String(d[name] ?? "")}
      />
    </label>
  );
  const moneyField = (name: keyof FinanceData, label: string) => (
    <label key={name}>
      {label}
      <input
        name={name}
        inputMode="decimal"
        required
        defaultValue={amountInput(Number(d[name] || 0))}
      />
    </label>
  );
  return (
    <form
      className="finance-panel finance-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setLocalError("");
        try {
          const f = new FormData(e.currentTarget);
          const next: Record<string, unknown> = { ...d };
          for (const [key, v] of f) {
            if (key === "brand") continue;
            next[key] = v;
          }
          for (const key of [
            "net",
            "tax",
            "gross",
            "acquisition_cost",
            "residual_value",
            "employer_cost",
            "net_wage",
          ])
            if (f.has(key)) next[key] = parseMoney(String(f.get(key)));
          if (f.has("life_months"))
            next.life_months = Number(f.get("life_months"));
          for (const key of ["due_date", "paid_on", "in_service", "linked_id"])
            if (next[key] === "") next[key] = null;
          if (kind === "document") {
            next.gross = Number(next.net) + Number(next.tax);
            if (
              !["incoming_invoice", "outgoing_invoice"].includes(
                String(next.document_kind),
              )
            ) {
              next.recognition = "neutral";
              next.net = 0;
              next.tax = 0;
              next.gross = 0;
              next.payment_status = "not_applicable";
            }
          }
          if (kind === "asset") {
            next.gross = next.acquisition_cost;
            next.recognition = "asset";
          }
          if (kind === "payroll") {
            next.gross = Number(next.net) + Number(next.employer_cost);
            next.recognition = "neutral";
          }
          await onSave({
            ...(existing ? { id: existing.id, version: existing.version } : {}),
            brand: f.get("brand"),
            kind,
            data: financeDataSchema.parse(next),
          });
        } catch (e) {
          setLocalError(e instanceof Error ? e.message : "Angaben prüfen.");
        }
      }}
    >
      <div className="finance-panel-heading">
        <div>
          <p className="eyebrow">
            {existing ? "ENTWURF BEARBEITEN" : "NEUER EINTRAG"}
          </p>
          <h2>
            {kind === "asset"
              ? "Anlage erfassen"
              : kind === "bank"
                ? "Bankumsatz erfassen"
                : kind === "payroll"
                  ? "Lohnstand erfassen"
                  : "Belegdaten prüfen"}
          </h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Formular schließen"
          onClick={onCancel}
        >
          <X />
        </button>
      </div>
      <fieldset disabled={busy}>
        <div className="finance-form-grid">
          <label>
            Kostenstelle
            <select
              name="brand"
              defaultValue={
                existing?.brand || (scope === "all" ? "nex" : scope)
              }
            >
              {brands
                .filter((b) => b.code !== "unassigned" && b.active)
                .map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
            </select>
          </label>
          {field(
            "date",
            kind === "payroll" ? "Abrechnungsmonat (Datum)" : "Buchungsdatum",
            "date",
            true,
          )}
          {field("title", "Bezeichnung", "text", true)}
          {field("reference", "Beleg-/Referenznummer")}
          {kind === "document" && (
            <>
              <label>
                Belegart
                <select name="document_kind" defaultValue={d.document_kind}>
                  {Object.entries(kinds).map(([id, name]) => (
                    <option value={id} key={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {field("party", "Geschäftspartner")}
              {moneyField("net", "Nettobetrag (EUR)")}
              {moneyField("tax", "Steuerbetrag (EUR)")}
              {field("due_date", "Fällig am", "date")}
              {field("iban", "Empfänger-IBAN")}
              <label>
                Bilanzielle Einordnung
                <select name="recognition" defaultValue={d.recognition}>
                  <option value="operating">Laufender Aufwand / Erlös</option>
                  <option value="asset">Anschaffung / Anlagevermögen</option>
                  <option value="neutral">Ergebnisneutral</option>
                </select>
              </label>
              {field("category", "Kategorie")}
              {field("debit", "Sollkonto (4–8 Ziffern)")}
              {field("credit", "Habenkonto (4–8 Ziffern)")}
              {field("tax_account", "Steuerkonto (bei Steuerbetrag)")}
              {field("cost_center", "Interner Kostenbereich")}
              <p className="finance-note finance-full">
                Brutto wird aus Netto plus Steuer berechnet. Für Gutschriften
                negative Beträge verwenden. Bei Anlagenanschaffungen die
                Einordnung „Anlagevermögen“ wählen, damit Anschaffung und
                spätere AfA nicht doppelt als Aufwand erscheinen. Lieferscheine
                und Unterlagen bleiben ohne Buchungsbetrag.
              </p>
            </>
          )}
          {kind === "bank" && (
            <>
              {field("account_ref", "Konto-/Bankreferenz", "text", true)}
              {field("party", "Gegenpartei")}
              {moneyField("gross", "Umsatz (EUR, Auszahlung negativ)")}
            </>
          )}
          {kind === "asset" && (
            <>
              {moneyField("acquisition_cost", "Anschaffungskosten netto (EUR)")}
              {moneyField("residual_value", "Restwert (EUR)")}
              {field("in_service", "Inbetriebnahme", "date", true)}
              <label>
                Nutzungsdauer in Monaten
                <input
                  name="life_months"
                  type="number"
                  min="1"
                  max="1200"
                  required
                  defaultValue={d.life_months}
                />
              </label>
              {field("debit", "AfA-Aufwandskonto", "text", true)}
              {field("credit", "Kumuliertes AfA-Konto", "text", true)}
              {field("asset_ref", "Inventar-/Anlagennummer")}
              {field("cost_center", "Interner Kostenbereich")}
              <p className="finance-note finance-full">
                Lineare monatliche Abschreibung. Die passende Nutzungsdauer und
                Kontierung bitte fachlich festlegen. Die Anlage selbst erzeugt
                noch keinen Aufwand; dieser entsteht durch die monatlichen
                AfA-Buchungen.
              </p>
            </>
          )}
          {kind === "payroll" && (
            <>
              {field("employee_ref", "Personalnummer / Referenz", "text", true)}
              {moneyField("net", "Bruttolohn (EUR)")}
              {moneyField(
                "employer_cost",
                "Arbeitgeberanteile zusätzlich (EUR)",
              )}
              {moneyField("net_wage", "Auszahlungsbetrag netto (EUR)")}
              <p className="finance-note finance-full">
                Dieser Lohnstand ist eine Kontrollübersicht. Aufwand über einen
                zugehörigen Buchhaltungsbeleg erfassen; keine automatische
                Steuer- oder Beitragsberechnung.
              </p>
            </>
          )}
          <label className="finance-full">
            Notizen / Zuordnung
            <textarea name="notes" defaultValue={d.notes} maxLength={4000} />
          </label>
        </div>
      </fieldset>
      {localError && (
        <p className="finance-error" role="alert">
          {localError}
        </p>
      )}
      <div className="finance-inline">
        <button className="button" disabled={busy}>
          Entwurf speichern
        </button>
        <button
          type="button"
          className="button outline"
          disabled={busy}
          onClick={onCancel}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
function AllocationForm({
  data,
  busy,
  save,
}: {
  data: FinanceSnapshot;
  busy: boolean;
  save: (p: Record<string, unknown>) => Promise<unknown>;
}) {
  const [mode, setMode] = useState(data.allocation.mode),
    [error, setError] = useState("");
  return (
    <form
      className="finance-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const f = new FormData(e.currentTarget);
        const weights = Object.fromEntries(
          data.brands
            .filter((b) => !["nex", "unassigned"].includes(b.code))
            .map((b) => [
              b.code,
              Math.round(
                Number(String(f.get(b.code) || "0").replace(",", ".")) * 100,
              ),
            ]),
        );
        if (
          mode === "fixed" &&
          Object.values(weights).reduce((s, n) => s + n, 0) !== 10000
        ) {
          setError("Die Prozentsätze müssen zusammen genau 100 % ergeben.");
          return;
        }
        await save({ mode, weights });
      }}
    >
      <p className="eyebrow">INTERNE KOSTENVERTEILUNG</p>
      <h2>Allgemeinkosten fair zuordnen</h2>
      <label>
        Umlageschlüssel
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          <option value="none">Zunächst separat ausweisen</option>
          <option value="revenue">
            Nach positiven Netto-Umsätzen im gewählten Zeitraum
          </option>
          <option value="fixed">Feste Prozentsätze je Marke</option>
        </select>
      </label>
      {mode === "fixed" && (
        <div className="finance-form-grid">
          {data.brands
            .filter((b) => !["nex", "unassigned"].includes(b.code))
            .map((b) => (
              <label key={b.code}>
                {b.name} (%)
                <input
                  name={b.code}
                  inputMode="decimal"
                  defaultValue={((data.allocation.weights[b.code] || 0) / 100)
                    .toString()
                    .replace(".", ",")}
                />
              </label>
            ))}
        </div>
      )}
      <p className="finance-note">
        Verteilt werden nur NEX-Kosten im internen Kostenbereich „allgemein“.
        Die Umlage ist eine interne Auswertung; Originalbelege und das
        Gesamtergebnis bleiben unverändert. Ohne Umsatzbasis bleibt der Betrag
        separat.
      </p>
      {error && (
        <p className="finance-error" role="alert">
          {error}
        </p>
      )}
      <button className="button small" disabled={busy}>
        Verteilung speichern
      </button>
    </form>
  );
}
function BankImport({
  scope,
  busy,
  save,
}: {
  scope: string;
  busy: boolean;
  save: (p: Record<string, unknown>) => Promise<unknown>;
}) {
  const [text, setText] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          if (scope === "all" || scope === "unassigned")
            throw Error("Bitte eine Kostenstelle auswählen.");
          const account_ref = String(
            new FormData(e.currentTarget).get("account_ref") || "",
          );
          const rows = text
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line, i) => {
              const values = line.split(";");
              if (values.length !== 5)
                throw Error(
                  "Zeile " + (i + 1) + ": erwartet werden 5 Spalten.",
                );
              const [id, date, amount, party, reference] = values;
              return {
                id: id.trim(),
                date: date.trim(),
                amount: parseMoney(amount),
                party: party.trim(),
                reference: reference.trim(),
              };
            });
          if (await save({ brand: scope, account_ref, rows })) setText("");
        } catch (e) {
          setError(e instanceof Error ? e.message : "CSV prüfen.");
        }
      }}
    >
      <label>
        Konto-/Bankreferenz
        <input
          name="account_ref"
          required
          minLength={2}
          placeholder="Zum Beispiel Geschäftskonto EUR"
        />
      </label>
      <label>
        CSV-Zeilen ohne Kopfzeile
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          placeholder={"Umsatz-ID;2026-09-18;-119,00;Lieferant;Rechnung 123"}
        />
      </label>
      <p className="finance-note">
        Format: ID;Datum;Betrag;Gegenpartei;Verwendungszweck. Datum YYYY-MM-DD,
        Dezimalkomma, Auszahlungen negativ. Keine Semikolons innerhalb der
        Felder. Bis 500 Zeilen pro Import.
      </p>
      {error && (
        <p className="finance-error" role="alert">
          {error}
        </p>
      )}
      <button className="button small" disabled={busy}>
        Bankumsätze importieren
      </button>
    </form>
  );
}
