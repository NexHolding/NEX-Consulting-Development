"use client";
import TimeEntryEditor from "./time-entry-editor";
import { withLoading, beginLoading } from "@/lib/loading-state";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "./app-link";
import TimerCard from "./timer-card";
import WorkspaceSettings from "./workspace-settings";
import { settingsSections, workspaceView } from "@/lib/workspace-navigation";
import {
  WorkspaceNavigation,
  SectionNavigation,
  financeNavigation,
} from "./workspace-navigation";
import { OfferSummary } from "./offer-configurator";
import type { OfferQuote } from "@/lib/offer-catalog";
import ProjectOffer from "./project-offer";
import {
  CorrectionFields,
  CorrectionProjectSettings,
} from "./correction-rounds";
import {
  assignmentLabel,
  assignmentStatus,
  validTimeAssignment,
  type TimeAssignment,
} from "@/lib/correction-rounds";
import CustomerFields from "./customer-fields";
import CustomerProfile, {
  TimeReport,
  type CustomerRecord as Customer,
} from "./customer-profile";
import { reportSeconds, reportWindow } from "@/lib/time-report";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Clock3,
  Settings,
  Plus,
  ArrowUpRight,
  Search,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
type Project = {
  id: string;
  customer_id: string;
  name: string;
  status: string;
  package: string;
  budget_cents: number;
  waiting_billable: boolean;
  included_correction_rounds?: number | null;
  notes: string;
  offer_snapshot?: OfferQuote | null;
  included_change_rounds?: number | null;
  hourly_rate_cents?: number;
};
type Time = {
  id: string;
  user_id: string;
  project_id: string;
  kind: "internal" | "external";
  category: string;
  description: string;
  started_at: string;
  stopped_at: string | null;
  approved_at: string | null;
  correction_round?: number | null;
  change_request?: string | null;
  change_round?: number | null;
  extra_work?: string | null;
  approved_rate_cents?: number | null;
  version?: number;
  invoiced?: boolean;
};
type Task = { id: string; project_id: string; title: string; done: boolean };
type Subscription = {
  included_requests?: number | null;
  offer_snapshot?: OfferQuote | null;
  id: string;
  project_id: string;
  plan: string;
  monthly_cents: number;
  included_minutes: number;
  starts_on: string;
  ends_on: string | null;
  active: boolean;
};
type Invoice = {
  id: string;
  project_id: string;
  customer_id: string;
  subject: string;
  net_cents: number;
  status: string;
  period: string | null;
  created_at: string;
  number: string | null;
};
type Lead = {
  offer_snapshot?: OfferQuote | null;
  id: string;
  name: string;
  company: string;
  email: string;
  message: string;
  package: string;
  status: string;
};
type Data = {
  capturedAt: number;
  user: { id: string; username: string; role: string };
  customers: Customer[];
  projects: Project[];
  time_entries: Time[];
  tasks: Task[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  leads: Lead[];
};
const money = (c: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(c / 100);
const date = (s: string) => new Date(s).toLocaleDateString("de-DE");
const categories: Record<string, string> = {
  active: "Aktive Leistung",
  processing: "Betreute Verarbeitung",
  waiting: "Vereinbarte Wartezeit",
  break: "Nicht abrechenbare Pause",
};
function seconds(t: Time, now: number) {
  return Math.max(
    0,
    Math.floor(
      ((t.stopped_at ? Date.parse(t.stopped_at) : now) -
        Date.parse(t.started_at)) /
        1000,
    ),
  );
}
function duration(s: number) {
  return `${Math.floor(s / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
}
const statuses = [
  "Konzeption",
  "Design",
  "Entwicklung",
  "Kundenprüfung",
  "Live",
  "Betreuung",
  "Pausiert",
  "Archiviert",
];
function Empty({
  title,
  text,
  action,
  label,
}: {
  title: string;
  text: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">
        <FolderKanban size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="button small" onClick={action}>
          <Plus size={16} />
          {label}
        </button>
      )}
    </div>
  );
}
export default function Workspace({
  initial,
  initialView = workspaceView({}),
}: {
  initial: unknown;
  initialView?: ReturnType<typeof workspaceView>;
}) {
  const [data, setData] = useState(initial as Data);
  const [tab, setTab] = useState(initialView.tab);
  const [customerId, setCustomerId] = useState(initialView.customer);
  const [section, setSection] = useState(initialView.section);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(data.capturedAt);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("active");
  const [assignment, setAssignment] = useState<TimeAssignment>({
    correction_round: null,
    change_request: null,
  });
  const [manualProject, setManualProject] = useState("");
  const [manualAssignment, setManualAssignment] = useState<TimeAssignment>({
    correction_round: null,
    change_request: null,
  });
  const [mobile, setMobile] = useState(false);
  const router = useRouter();
  useEffect(() => {
    function restore() {
      const q = new URLSearchParams(window.location.search);
      const restored = workspaceView(Object.fromEntries(q));
      setTab(restored.tab);
      setCustomerId(restored.customer);
      setSection(restored.section);
    }
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  function navigate(nextTab: string, customer = "", nextSection = "Übersicht") {
    setTab(nextTab);
    setCustomerId(customer);
    setSection(nextSection);
    setSearch("");
    setMobile(false);
    const q = new URLSearchParams({
      tab: nextTab,
      ...(customer
        ? { customer, section: nextSection }
        : nextTab === "Einstellungen"
          ? { section: nextSection }
          : {}),
    });
    window.history.pushState(null, "", "/crm?" + q);
  }
  const customer = data.customers.find((c) => c.id === customerId);
  const mainArea = ["Projekte", "Zeiterfassung", "Aufgaben"].includes(tab)
    ? "Projekte"
    : ["Rechnungen", "Betreuung"].includes(tab)
      ? "Finanzen"
      : tab === "Anfragen"
        ? "Interessenten"
        : tab;
  const secondaryItems =
    customer && tab === "Kunden"
      ? [
          "Übersicht",
          "Stammdaten",
          "Rechnungsdaten",
          "Zugänge & Infrastruktur",
          "Projekte",
          "Zeiten & Auszüge",
          "Rechnungen",
        ]
      : mainArea === "Projekte"
        ? ["Projekte", "Zeiterfassung", "Aufgaben"]
        : mainArea === "Finanzen"
          ? ["Buchhaltung", "Rechnungen", "Betreuung"]
          : mainArea === "Interessenten"
            ? ["Anfragen"]
            : mainArea === "Kunden"
              ? ["Kunden"]
              : mainArea === "Einstellungen"
                ? settingsSections
                : ["Dashboard"];
  const modalRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = modalRef.current;
    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        ) || [],
      );
    focusable()[0]?.focus();
    function keys(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModal("");
        return;
      }
      if (e.key === "Tab") {
        const list = focusable();
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keys);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keys);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [modal]);
  const refresh = useCallback(async () => {
    const finishLoading = beginLoading();
    try {
      const r = await fetch("/api/crm", { cache: "no-store" });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setError(
        "Verbindung unterbrochen. Die letzte gespeicherte Ansicht bleibt sichtbar.",
      );
    } finally {
      finishLoading();
    }
  }, [router]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const sync = setInterval(refresh, 30000);
    function focus() {
      void refresh();
    }
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(tick);
      clearInterval(sync);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  const projectName = (id: string) =>
    data.projects.find((p) => p.id === id)?.name || "Projekt";
  const customerName = (id: string) =>
    data.customers.find((c) => c.id === id)?.name || "Kunde";
  const running = data.time_entries.filter(
    (t) => !t.stopped_at && t.user_id === data.user.id,
  );
  const projectId = running[0]?.project_id || selected;
  const month = new Date(now)
    .toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" })
    .slice(0, 7);
  const monthWindow = reportWindow(month, now);
  const monthTimes = data.time_entries.filter(
    (t) => reportSeconds(t, monthWindow) > 0,
  );
  async function mutate(
    action: string,
    payload: Record<string, unknown>,
    onError?: (message: string) => void,
  ) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const [r, result] = await withLoading(async () => {
        const r = await fetch("/api/crm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, payload }),
        });
        return [r, await r.json()] as const;
      });
      if (!r.ok) throw new Error(result.error);
      setData((d) => ({ ...d, ...result }));
      setNotice("Gespeichert.");
      return true;
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Nicht gespeichert. Bitte erneut versuchen.";
      setError(message);
      onError?.(message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    let payload: Record<string, unknown> = { ...f };
    if (modal === "customer") {
      payload.payment_terms_days =
        f.payment_terms_days === "" ? 14 : Number(f.payment_terms_days ?? 14);
    }
    if (modal === "project")
      payload = {
        ...payload,
        budget_cents: Math.round(Number(f.budget) * 100),
        waiting_billable: f.waiting_billable === "on",
        included_correction_rounds:
          f.included_correction_rounds === ""
            ? null
            : Number(f.included_correction_rounds),
      };
    if (modal === "time_manual") {
      const start = new Date(String(f.started_at));
      const stop = new Date(String(f.stopped_at));
      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(stop.getTime())
      ) {
        setError("Bitte Beginn und Ende angeben.");
        return;
      }
      payload = {
        ...payload,
        started_at: start.toISOString(),
        stopped_at: stop.toISOString(),
        ...manualAssignment,
      };
    }
    if (modal === "invoice")
      payload = {
        project_id: f.project_id,
        subject: f.subject,
        net_cents: Math.round(Number(f.amount) * 100),
      };
    if (await mutate(modal, payload)) setModal("");
  }
  const filteredProjects = data.projects.filter((p) =>
    `${p.name} ${customerName(p.customer_id)}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  function open(kind: string) {
    setError("");
    setNotice("");
    if (kind === "time_manual") {
      setManualProject(selected);
      setManualAssignment({ correction_round: null, change_request: null });
    }
    setModal(kind);
  }

  const timerPanel = (
    <section className="timer-panel panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">IHR ARBEITSPLATZ</p>
          <h2>Zeit für Ihr Projekt.</h2>
        </div>
        <span className="badge">Serverseitig gespeichert</span>
      </div>
      <div className="timer-config">
        <label>
          Projekt
          <select
            value={projectId}
            disabled={running.length > 0 || busy}
            onChange={(e) => {
              setSelected(e.target.value);
              setAssignment({ correction_round: null, change_request: null });
            }}
          >
            <option value="">Projekt auswählen</option>
            {data.projects
              .filter((p) => p.status !== "Archiviert")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Leistungsbeschreibung
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Woran arbeiten Sie gerade?"
            maxLength={1000}
          />
        </label>
        <label>
          Externe Zeitart
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.entries(categories).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <CorrectionFields
        project={data.projects.find((p) => p.id === projectId)}
        times={data.time_entries}
        assignment={assignment}
        onChange={setAssignment}
        disabled={busy}
      />
      <div className="timer-grid">
        {(["internal", "external"] as const).map((kind) => {
          const live = running.find((t) => t.kind === kind);
          return (
            <TimerCard
              key={kind}
              label={
                kind === "internal"
                  ? "Interne Arbeitszeit"
                  : "Externe Projektzeit"
              }
              running={!!live}
              elapsed={duration(live ? seconds(live, now) : 0)}
              description={
                live
                  ? live.description +
                    " · " +
                    assignmentLabel(
                      live,
                      data.projects.find((p) => p.id === live.project_id)
                        ?.included_correction_rounds,
                      data.projects.find((p) => p.id === live.project_id)
                        ?.included_change_rounds,
                    )
                  : kind === "internal"
                    ? "Tatsächliche aktive Arbeit. Nur intern sichtbar."
                    : "Projektzeit einschließlich vereinbarter Begleitzeiten."
              }
              disabled={
                busy ||
                (!live &&
                  (!projectId ||
                    description.trim().length < 3 ||
                    !validTimeAssignment(assignment)))
              }
              overdue={!!live && seconds(live, now) > 28800}
              onToggle={() =>
                mutate("timer", {
                  project_id: live?.project_id || projectId,
                  kind,
                  action: live ? "stop" : "start",
                  category: live?.category || category,
                  description: live?.description || description,
                  ...(live
                    ? {
                        correction_round: live.correction_round ?? null,
                        change_request: live.change_request ?? null,
                        change_round: live.change_round ?? null,
                        extra_work: live.extra_work ?? null,
                      }
                    : assignment),
                })
              }
            />
          );
        })}
      </div>
      <p className="footnote">
        Beide Timer sind unabhängig. Zum Projektwechsel laufende Timer stoppen.
        Eine andere Zeitart oder Leistungszuordnung gilt erst beim nächsten
        Start. Externe Zeit wird erst nach Prüfung zur Abrechnung freigegeben.
      </p>
    </section>
  );
  return (
    <div
      className={
        "workspace " +
        (secondaryItems.length <= 1 ? "workspace-without-subnav" : "")
      }
    >
      <WorkspaceNavigation
        active={mainArea}
        user={data.user}
        mobile={mobile}
        onMobileChange={setMobile}
        leadCount={data.leads.filter((l) => l.status === "Neu").length}
        onNavigate={(label) => {
          if (label === "Finanzen") router.push("/crm/finance");
          else navigate(label === "Interessenten" ? "Anfragen" : label);
          setError("");
        }}
      />
      {secondaryItems.length > 1 && (
        <SectionNavigation
          title={customer && tab === "Kunden" ? customer.name : mainArea}
          eyebrow={customer && tab === "Kunden" ? "Kundenakte" : "Bereiche"}
          active={
            mainArea === "Finanzen"
              ? tab === "Rechnungen"
                ? "invoices"
                : "care"
              : (customer && tab === "Kunden") || tab === "Einstellungen"
                ? section
                : tab
          }
          back={
            customer && tab === "Kunden"
              ? {
                  label: "Alle Kunden",
                  href: "/crm?tab=Kunden",
                  onClick: () => navigate("Kunden"),
                }
              : undefined
          }
          items={
            mainArea === "Finanzen"
              ? financeNavigation
              : secondaryItems.map((item) => ({
                  id: item,
                  label:
                    item === "Anfragen" ? "Interessenten & Anfragen" : item,
                  href:
                    item === "Buchhaltung"
                      ? "/crm/finance"
                      : "/crm?" +
                        new URLSearchParams(
                          customer && tab === "Kunden"
                            ? {
                                tab: "Kunden",
                                customer: customer.id,
                                section: item,
                              }
                            : tab === "Einstellungen"
                              ? { tab: "Einstellungen", section: item }
                              : { tab: item },
                        ),
                  description: (
                    {
                      Übersicht: "Überblick und nächste Schritte",
                      Stammdaten: "Kontakt und Anschrift",
                      Rechnungsdaten: "Empfänger und Zahlungsziel",
                      "Zugänge & Infrastruktur":
                        "Passwörter, Domains und E-Mail",
                      Projekte: "Projektstand und Leistungen",
                      "Zeiten & Auszüge": "Zeitnachweise und Monats-PDF",
                      Rechnungen: "Kundenrechnungen",
                      Betreuung: "Wiederkehrende Leistungen",
                      Buchhaltung: "Belege, Banken und Markenergebnis",
                      Zeiterfassung: "Timer und Zeitnachweise",
                      Aufgaben: "Nächste Schritte",
                      "Preise & Pakete": "Budgets und monatliche Betreuung",
                      Leistungen: "Katalog nach Kategorien",
                      "Mein Zugang": "Ihr angemeldetes Konto",
                    } as Record<string, string>
                  )[item],
                }))
          }
          onSelect={(item) =>
            mainArea === "Finanzen"
              ? item === "invoices"
                ? navigate("Rechnungen")
                : item === "care"
                  ? navigate("Betreuung")
                  : router.push("/crm/finance/" + item)
              : item === "Buchhaltung"
                ? router.push("/crm/finance")
                : customer && tab === "Kunden"
                  ? navigate("Kunden", customer.id, item)
                  : tab === "Einstellungen"
                    ? navigate("Einstellungen", "", item)
                    : navigate(item)
          }
        />
      )}
      <div className="workspace-main">
        <header className="workspace-header">
          <div className="breadcrumbs">
            {mainArea} <span>/</span>{" "}
            <strong>
              {tab === "Einstellungen" || (customer && tab === "Kunden")
                ? section
                : tab === "Anfragen"
                  ? "Anfragen"
                  : "Übersicht"}
            </strong>
          </div>
          <span className="workspace-date">
            {new Date(now).toLocaleDateString("de-DE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <Link href="/" target="_blank" className="text-link">
            Website <ArrowUpRight size={15} />
          </Link>
        </header>
        <main className="workspace-content">
          <div className="workspace-title">
            <div>
              <p className="eyebrow">NEX CONSULTING</p>
              <h1>
                {customer && tab === "Kunden"
                  ? section
                  : tab === "Einstellungen"
                    ? section === "Übersicht"
                      ? "Einstellungen"
                      : section
                    : tab === "Dashboard"
                      ? "Ihr Unternehmen im Überblick"
                      : tab === "Anfragen"
                        ? "Interessenten & Anfragen"
                        : tab}
              </h1>
              <p>
                {tab === "Einstellungen"
                  ? "Preise, Leistungen und Zugänge an einem Ort verwalten."
                  : tab === "Dashboard"
                    ? "Ihre Projekte, Kunden und nächsten Schritte. An einem Ort."
                    : tab === "Zeiterfassung"
                      ? "Interne Arbeit verstehen. Externe Leistungen nachvollziehbar erfassen."
                      : tab === "Rechnungen"
                        ? "Einmalige Projekte und monatliche Betreuung übersichtlich vorbereiten."
                        : "Übersichtlich organisiert. Direkt in Ihrem Workspace."}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Aktualisieren"
              onClick={refresh}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}
          {tab === "Dashboard" && (
            <>
              <div className="metrics">
                {[
                  [
                    data.projects.filter(
                      (p) => !["Archiviert", "Pausiert"].includes(p.status),
                    ).length,
                    "Aktive Projekte",
                    "In Bewegung",
                  ],
                  [data.customers.length, "Kunden", "Zentral verwaltet"],
                  [
                    money(
                      data.subscriptions
                        .filter(
                          (s) =>
                            s.active &&
                            s.starts_on <=
                              new Date(now).toISOString().slice(0, 10) &&
                            (!s.ends_on ||
                              s.ends_on >=
                                new Date(now).toISOString().slice(0, 10)),
                        )
                        .reduce((v, s) => v + s.monthly_cents, 0),
                    ),
                    "Monatliche Betreuung",
                    "Vereinbarter Nettoumsatz",
                  ],
                  [
                    data.tasks.filter((t) => !t.done).length,
                    "Offene Aufgaben",
                    "Die nächsten Schritte",
                  ],
                ].map(([v, l, n]) => (
                  <article className="metric" key={l}>
                    <span>{l}</span>
                    <strong>{v}</strong>
                    <small>{n}</small>
                  </article>
                ))}
              </div>
              {timerPanel}
              <div className="dashboard-bottom">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Projekte im Fokus</h2>
                    <button
                      className="text-link"
                      onClick={() => setTab("Projekte")}
                    >
                      Alle Projekte <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {data.projects.length ? (
                    data.projects.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        className="project-line"
                        onClick={() => {
                          setSelected(p.id);
                          setTab("Projekte");
                        }}
                      >
                        <span className="project-avatar">
                          {p.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span>
                          <strong>{p.name}</strong>
                          <small>{customerName(p.customer_id)}</small>
                        </span>
                        <span className="badge">{p.status}</span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))
                  ) : (
                    <Empty
                      title="Ihr erstes Projekt wartet."
                      text="Legen Sie einen Kunden an und ordnen Sie ihm ein Projekt zu."
                      action={() =>
                        open(data.customers.length ? "project" : "customer")
                      }
                      label={
                        data.customers.length
                          ? "Projekt anlegen"
                          : "Kunde anlegen"
                      }
                    />
                  )}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Dieser Monat</h2>
                    <Clock3 size={20} className="gold" />
                  </div>
                  <div className="month-stat">
                    <span>Interne Arbeitszeit</span>
                    <strong>
                      {duration(
                        monthTimes
                          .filter((t) => t.kind === "internal")
                          .reduce(
                            (s, t) => s + reportSeconds(t, monthWindow),
                            0,
                          ),
                      )}
                    </strong>
                  </div>
                  <div className="month-stat">
                    <span>Externe Projektzeit</span>
                    <strong>
                      {duration(
                        monthTimes
                          .filter((t) => t.kind === "external")
                          .reduce(
                            (s, t) => s + reportSeconds(t, monthWindow),
                            0,
                          ),
                      )}
                    </strong>
                  </div>
                  <p className="footnote">
                    Anteilig erfasste Dauer innerhalb dieses Monats
                    (Europe/Berlin). Noch keine Rechnungsfreigabe.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => setTab("Zeiterfassung")}
                  >
                    Zeiten prüfen <ArrowRightIcon />
                  </button>
                </section>
              </div>
            </>
          )}
          {tab === "Kunden" && customer && (
            <CustomerProfile
              key={customer.id}
              customer={customer}
              section={section}
              projects={data.projects}
              times={data.time_entries}
              invoices={data.invoices}
              now={now}
              busy={busy}
              mutate={mutate}
              openProject={() => open("project")}
              track={(id) => {
                setSelected(id);
                navigate("Zeiterfassung");
              }}
            />
          )}
          {tab === "Kunden" && !customer && (
            <section className="panel">
              <div className="panel-heading">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    aria-label="Kunden suchen"
                    placeholder="Kunden durchsuchen …"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button
                  className="button small"
                  onClick={() => open("customer")}
                >
                  <Plus size={16} />
                  Kunde anlegen
                </button>
              </div>
              {data.customers.length ? (
                <div className="customer-grid">
                  {data.customers
                    .filter((c) =>
                      (c.name + " " + c.email)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((c) => (
                      <article className="customer-card" key={c.id}>
                        <div className="project-avatar">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <h3>
                          <a
                            className="customer-profile-link"
                            href={"/crm?tab=Kunden&customer=" + c.id}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate("Kunden", c.id);
                            }}
                          >
                            {c.name} <ArrowUpRight size={17} />
                          </a>
                        </h3>
                        <p>{c.contact || "Kein Ansprechpartner"}</p>
                        <span>{c.email || "Keine E-Mail hinterlegt"}</span>
                        {c.address && <p className="preline">{c.address}</p>}
                        <small>
                          {
                            data.projects.filter((p) => p.customer_id === c.id)
                              .length
                          }{" "}
                          Projekte
                        </small>
                        {c.notes && (
                          <details>
                            <summary>Interne Notizen</summary>
                            <p>{c.notes}</p>
                          </details>
                        )}
                      </article>
                    ))}
                </div>
              ) : (
                <Empty
                  title="Platz für Ihre Kunden."
                  text="Stammdaten, Ansprechpartner und Projekte zentral verwalten."
                />
              )}
            </section>
          )}
          {tab === "Projekte" && (
            <section className="panel">
              <div className="panel-heading">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    aria-label="Projekte suchen"
                    placeholder="Projekt oder Kunde suchen …"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button
                  className="button small"
                  disabled={!data.customers.length}
                  onClick={() => open("project")}
                >
                  <Plus size={16} />
                  Projekt anlegen
                </button>
              </div>
              {filteredProjects.length ? (
                <div className="project-cards">
                  {filteredProjects.map((p) => (
                    <article
                      className={
                        "project-card " + (selected === p.id ? "selected" : "")
                      }
                      key={p.id}
                    >
                      <div className="card-top">
                        <span className="badge">{p.package}</span>
                        <button
                          className="text-link"
                          onClick={() => navigate("Kunden", p.customer_id)}
                        >
                          {customerName(p.customer_id)}
                        </button>
                      </div>
                      <h3>{p.name}</h3>
                      <p>
                        {p.notes ||
                          "Noch keine Projektbeschreibung hinterlegt."}
                      </p>
                      <label>
                        Projektstatus
                        <select
                          aria-label={"Status " + p.name}
                          value={p.status}
                          disabled={busy}
                          onChange={(e) =>
                            mutate("status", {
                              id: p.id,
                              status: e.target.value,
                            })
                          }
                        >
                          {statuses.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <ProjectOffer project={p} mutate={mutate} busy={busy} />
                      <CorrectionProjectSettings
                        key={
                          p.id +
                          String(p.included_correction_rounds) +
                          String(p.included_change_rounds) +
                          String(p.hourly_rate_cents)
                        }
                        project={p}
                        times={data.time_entries}
                        mutate={mutate}
                        busy={busy}
                      />
                      <div className="project-numbers">
                        <span>
                          Projektbudget<strong>{money(p.budget_cents)}</strong>
                        </span>
                        <span>
                          Interner Aufwand
                          <strong>
                            {duration(
                              data.time_entries
                                .filter(
                                  (t) =>
                                    t.project_id === p.id &&
                                    t.kind === "internal",
                                )
                                .reduce(
                                  (s, t) => s + reportSeconds(t, monthWindow),
                                  0,
                                ),
                            )}
                          </strong>
                        </span>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => {
                          setSelected(p.id);
                          setTab("Zeiterfassung");
                        }}
                      >
                        Am Projekt arbeiten <ArrowUpRight size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Noch keine Projekte."
                  text={
                    data.customers.length
                      ? "Starten Sie mit dem ersten Kundenprojekt."
                      : "Legen Sie zuerst einen Kunden an."
                  }
                  action={() =>
                    data.customers.length ? open("project") : open("customer")
                  }
                  label={
                    data.customers.length ? "Projekt anlegen" : "Kunde anlegen"
                  }
                />
              )}
            </section>
          )}
          {tab === "Zeiterfassung" && (
            <>
              {timerPanel}
              <div className="panel-heading">
                <p>Vergangene Leistungen mit Beginn und Ende erfassen.</p>
                <button
                  className="button small"
                  disabled={!data.projects.length}
                  onClick={() => open("time_manual")}
                >
                  Zeit nachtragen
                </button>
              </div>
              <TimeReport
                times={data.time_entries}
                projects={data.projects}
                now={now}
                mutate={mutate}
                busy={busy}
              />
              <section className="panel">
                <div className="panel-heading">
                  <h2>Erfasste Zeiten</h2>
                  <select
                    aria-label="Zeiten nach Projekt filtern"
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setAssignment({
                        correction_round: null,
                        change_request: null,
                      });
                    }}
                  >
                    <option value="">Alle Projekte</option>
                    {data.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {data.time_entries.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Projekt / Leistung</th>
                          <th>Art</th>
                          <th>Start</th>
                          <th>Dauer</th>
                          <th>Freigabe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.time_entries
                          .filter((t) => !selected || t.project_id === selected)
                          .map((t) => (
                            <tr key={t.id}>
                              <td>
                                <strong>{projectName(t.project_id)}</strong>
                                <small>{t.description}</small>
                                <small className="correction-label">
                                  {assignmentLabel(
                                    t,
                                    data.projects.find(
                                      (p) => p.id === t.project_id,
                                    )?.included_correction_rounds,
                                    data.projects.find(
                                      (p) => p.id === t.project_id,
                                    )?.included_change_rounds,
                                  )}
                                </small>
                                {t.extra_work && (
                                  <p className="change-request-note">
                                    <strong>Zusatzumfang:</strong>{" "}
                                    {t.extra_work}
                                  </p>
                                )}
                                {t.change_request != null && (
                                  <small className="change-request-note">
                                    <strong>Kundenwunsch:</strong>{" "}
                                    {t.change_request}
                                  </small>
                                )}
                                <TimeEntryEditor
                                  entry={t}
                                  projects={data.projects}
                                  times={data.time_entries}
                                  mutate={mutate}
                                  busy={busy}
                                />
                              </td>
                              <td>
                                <span
                                  className={
                                    "badge " +
                                    (t.kind === "internal" ? "" : "gold-badge")
                                  }
                                >
                                  {t.kind === "internal" ? "Intern" : "Extern"}
                                </span>
                                <small>{categories[t.category]}</small>
                              </td>
                              <td>
                                {date(t.started_at)}
                                <small>
                                  {new Date(t.started_at).toLocaleTimeString(
                                    "de-DE",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </small>
                              </td>
                              <td className="mono">
                                {duration(seconds(t, now))}
                                {!t.stopped_at && (
                                  <small className="success">Läuft</small>
                                )}
                              </td>
                              <td>
                                {t.approved_at ? (
                                  <span className="badge green">
                                    Freigegeben
                                  </span>
                                ) : t.kind === "external" &&
                                  (["included", "open"].includes(
                                    assignmentStatus(
                                      t,
                                      data.projects.find(
                                        (p) => p.id === t.project_id,
                                      ),
                                    ),
                                  ) ||
                                    (assignmentStatus(
                                      t,
                                      data.projects.find(
                                        (p) => p.id === t.project_id,
                                      ),
                                    ) === "regular" &&
                                      data.projects.find(
                                        (p) => p.id === t.project_id,
                                      )?.offer_snapshot)) ? (
                                  <span className="muted">
                                    {assignmentStatus(
                                      t,
                                      data.projects.find(
                                        (p) => p.id === t.project_id,
                                      ),
                                    ) === "open"
                                      ? "Paketumfang / Zuordnung offen"
                                      : "Im Paket enthalten"}
                                  </span>
                                ) : t.kind === "external" &&
                                  t.stopped_at &&
                                  t.category !== "break" ? (
                                  <button
                                    className="button small outline"
                                    disabled={busy}
                                    onClick={() =>
                                      mutate("approve", { id: t.id })
                                    }
                                  >
                                    Freigeben
                                  </button>
                                ) : (
                                  <span className="muted">
                                    {t.kind === "internal" ? "Nur intern" : "—"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Jede Minute am richtigen Ort."
                    text="Wählen Sie oben ein Projekt und starten Sie die passende Zeiterfassung."
                  />
                )}
                <p className="footnote">
                  Die Freigabe bestätigt die Abrechenbarkeit. Warte- und
                  Verarbeitungszeiten benötigen zusätzlich die im Projekt
                  hinterlegte Vereinbarung. Zeitbasierte Rechnungspositionen
                  werden in dieser Version noch manuell geprüft und angelegt.
                </p>
              </section>
            </>
          )}
          {tab === "Aufgaben" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Die nächsten Schritte</h2>
                <button
                  className="button small"
                  disabled={!data.projects.length}
                  onClick={() => open("task")}
                >
                  <Plus size={16} />
                  Aufgabe anlegen
                </button>
              </div>
              {data.tasks.length ? (
                data.tasks.map((t) => (
                  <div className="task-line" key={t.id}>
                    <input
                      type="checkbox"
                      aria-label={t.title + " erledigt"}
                      checked={t.done}
                      disabled={busy}
                      onChange={(e) =>
                        mutate("task_done", {
                          id: t.id,
                          done: e.target.checked,
                        })
                      }
                    />
                    <div className={t.done ? "completed" : ""}>
                      <strong>{t.title}</strong>
                      <small>{projectName(t.project_id)}</small>
                    </div>
                    <span className="badge">
                      {t.done ? "Erledigt" : "Offen"}
                    </span>
                  </div>
                ))
              ) : (
                <Empty
                  title="Ein klarer Kopf. Ein klarer Plan."
                  text="Halten Sie die nächsten Schritte für Ihre Projekte fest."
                />
              )}
            </section>
          )}
          {tab === "Betreuung" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Laufende Verträge</h2>
                <button
                  className="button small"
                  disabled={!data.projects.length}
                  onClick={() => open("subscription")}
                >
                  <Plus size={16} />
                  Betreuung einrichten
                </button>
              </div>
              <p className="info-box">
                Monatliche Entwürfe werden täglich automatisch erstellt. Beginn
                zum Monatsersten, volle Monatsgebühr. Versand und steuerliche
                Finalisierung sind noch nicht aktiviert.
              </p>
              {data.subscriptions.length ? (
                <div className="project-cards">
                  {data.subscriptions.map((s) => (
                    <article className="project-card" key={s.id}>
                      <span className="badge">{s.plan}</span>
                      <h3>{projectName(s.project_id)}</h3>
                      <div className="price compact">
                        {money(s.monthly_cents)}
                        <small> / Monat</small>
                      </div>
                      <p>
                        {s.included_minutes} Minuten Änderungsbudget / Monat
                        {s.included_requests != null
                          ? ` · bis zu ${s.included_requests} Anfragen`
                          : ""}
                      </p>
                      {s.offer_snapshot && (
                        <OfferSummary quote={s.offer_snapshot} details />
                      )}
                      <small>
                        Beginn: {date(s.starts_on)}
                        {s.ends_on ? " · Ende: " + date(s.ends_on) : ""}
                      </small>
                      <label>
                        Vertragsende
                        <input
                          aria-label={
                            "Vertragsende " + projectName(s.project_id)
                          }
                          type="date"
                          defaultValue={s.ends_on || ""}
                          min={s.starts_on}
                          onChange={(e) => {
                            if (e.target.value)
                              void mutate("subscription_end", {
                                id: s.id,
                                ends_on: e.target.value,
                              });
                          }}
                        />
                      </label>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Planbare Betreuung beginnt hier."
                  text="Verknüpfen Sie Care, Care Plus oder Care Dedicated mit einem Kundenprojekt."
                />
              )}
            </section>
          )}
          {tab === "Rechnungen" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Rechnungsentwürfe</h2>
                <div className="actions">
                  <button
                    className="button small outline"
                    disabled={busy}
                    onClick={() => mutate("billing", {})}
                  >
                    <RefreshCw size={15} />
                    Monatslauf prüfen
                  </button>
                  <button
                    className="button small"
                    disabled={!data.projects.length}
                    onClick={() => open("invoice")}
                  >
                    <Plus size={15} />
                    Entwurf anlegen
                  </button>
                </div>
              </div>
              <p className="info-box">
                Noch kein Rechnungsversand: Firmendaten, Steuerkonfiguration und
                Rechnungsabsender fehlen. Entwürfe sind keine ausgestellten
                Rechnungen.
              </p>
              {data.invoices.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Kunde / Betreff</th>
                        <th>Zeitraum</th>
                        <th>Netto</th>
                        <th>Status</th>
                        <th>Beleg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <strong>{customerName(i.customer_id)}</strong>
                            <small>{i.subject}</small>
                          </td>
                          <td>{i.period || date(i.created_at)}</td>
                          <td>{money(i.net_cents)}</td>
                          <td>
                            <span className="badge">
                              {i.status === "draft" ? "Entwurf" : i.status}
                            </span>
                          </td>
                          <td>
                            <Link
                              className="text-link"
                              target="_blank"
                              href={"/crm/rechnung/" + i.id}
                            >
                              Ansehen <ArrowUpRight size={15} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="Abrechnung mit Überblick."
                  text="Legen Sie einen Projektentwurf an oder starten Sie den Monatslauf für Betreuungsverträge."
                />
              )}
            </section>
          )}
          {tab === "Anfragen" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Neue Möglichkeiten</h2>
                <span className="badge">Website → CRM</span>
              </div>
              {data.leads.length ? (
                <div className="customer-grid">
                  {data.leads.map((l) => (
                    <article className="customer-card" key={l.id}>
                      <span className="badge">{l.package || "Noch offen"}</span>
                      <h3>{l.name}</h3>
                      <small>{l.company}</small>
                      <p>{l.message}</p>
                      {l.offer_snapshot && (
                        <OfferSummary quote={l.offer_snapshot} details />
                      )}
                      <span>{l.email}</span>
                      <label>
                        Bearbeitungsstatus
                        <select
                          value={l.status}
                          disabled={busy}
                          onChange={(e) =>
                            mutate("lead_status", {
                              id: l.id,
                              status: e.target.value,
                            })
                          }
                        >
                          {[
                            "Neu",
                            "Qualifiziert",
                            "Gespräch",
                            "Angebot",
                            "Gewonnen",
                            "Verloren",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Bereit für neue Anfragen."
                  text="Über das Website-Formular eingehende Projektanfragen erscheinen automatisch hier."
                />
              )}
            </section>
          )}
          {tab === "Einstellungen" && (
            <WorkspaceSettings
              section={section}
              username={data.user.username}
              onSelect={(item) => navigate("Einstellungen", "", item)}
            />
          )}
        </main>
        <footer className="workspace-footer">
          NEX CONSULTING WORKSPACE{" "}
          <span>Ihre Daten werden in Supabase gespeichert.</span>
        </footer>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal("");
          }}
        >
          <section
            ref={modalRef}
            className={
              "modal " + (modal === "customer" ? "customer-modal" : "")
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="panel-heading">
              <h2 id="modal-title">
                {
                  {
                    time_manual: "Vergangene Zeit nachtragen",
                    customer: "Kunde anlegen",
                    project: "Projekt anlegen",
                    task: "Aufgabe anlegen",
                    subscription: "Betreuung einrichten",
                    invoice: "Rechnungsentwurf",
                  }[modal]
                }
              </h2>
              <button
                className="icon-button"
                aria-label="Schließen"
                disabled={busy}
                onClick={() => setModal("")}
              >
                <X />
              </button>
            </div>
            <form onSubmit={submit}>
              {modal === "customer" && <CustomerFields />}
              {modal === "project" && (
                <>
                  <label>
                    Projektname
                    <input name="name" required minLength={2} autoFocus />
                  </label>
                  <label>
                    Kunde
                    <select
                      name="customer_id"
                      required
                      defaultValue={customerId}
                    >
                      <option value="">Bitte auswählen</option>
                      {data.customers.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-pair">
                    <label>
                      Paket
                      <select name="package">
                        {["Basic", "Business", "Enterprise"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Budget netto (€)
                      <input
                        name="budget"
                        type="number"
                        min="0"
                        max="10000000"
                        step="0.01"
                        defaultValue="4900"
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Im Paket enthaltene Korrekturrunden
                    <input
                      name="included_correction_rounds"
                      type="number"
                      min="0"
                      max="999"
                      step="1"
                      placeholder="Noch nicht vereinbart"
                    />
                  </label>
                  <label>
                    Projektbeschreibung
                    <textarea name="notes" maxLength={4000} />
                  </label>
                  <label className="check-label">
                    <input name="waiting_billable" type="checkbox" />
                    Abrechnung von Warte-/Verarbeitungszeiten ist mit dem Kunden
                    ausdrücklich vereinbart.
                  </label>
                </>
              )}
              {["task", "subscription", "invoice"].includes(modal) && (
                <label>
                  Projekt
                  <select
                    name="project_id"
                    required
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">Bitte auswählen</option>
                    {data.projects.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {modal === "time_manual" && (
                <>
                  <label>
                    Projekt
                    <select
                      name="project_id"
                      required
                      value={manualProject}
                      onChange={(e) => {
                        setManualProject(e.target.value);
                        setManualAssignment({
                          correction_round: null,
                          change_request: null,
                        });
                      }}
                    >
                      <option value="">Bitte auswählen</option>
                      {data.projects
                        .filter((p) => p.status !== "Archiviert")
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <CorrectionFields
                    project={data.projects.find((p) => p.id === manualProject)}
                    times={data.time_entries}
                    assignment={manualAssignment}
                    onChange={setManualAssignment}
                    disabled={busy}
                  />
                  <div className="form-pair">
                    <label>
                      Beginn
                      <input name="started_at" type="datetime-local" required />
                    </label>
                    <label>
                      Ende
                      <input name="stopped_at" type="datetime-local" required />
                    </label>
                  </div>
                  <p className="footnote">
                    Uhrzeit in Ihrer lokalen Zeitzone (
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}). Maximal
                    24 Stunden pro Eintrag.
                  </p>
                  <div className="form-pair">
                    <label>
                      Zeitart
                      <select name="kind">
                        <option value="internal">Interne Arbeitszeit</option>
                        <option value="external">Externe Projektzeit</option>
                      </select>
                    </label>
                    <label>
                      Kategorie
                      <select name="category">
                        {Object.entries(categories).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Leistungsbeschreibung
                    <textarea
                      name="description"
                      required
                      minLength={3}
                      maxLength={1000}
                    />
                  </label>
                  <p className="footnote">
                    Externe Nachträge werden zunächst ungeprüft gespeichert. Die
                    Abrechnungsfreigabe erfolgt separat.
                  </p>
                </>
              )}
              {modal === "task" && (
                <label>
                  Aufgabe
                  <input name="title" required minLength={2} maxLength={200} />
                </label>
              )}
              {modal === "subscription" && (
                <>
                  {data.projects.find((p) => p.id === selected)
                    ?.offer_snapshot ? (
                    <OfferSummary
                      quote={
                        data.projects.find((p) => p.id === selected)!
                          .offer_snapshot!
                      }
                      details
                    />
                  ) : (
                    <p className="info-box">
                      Bitte zuerst im Projekt den Paketumfang und die Betreuung
                      vereinbaren.
                    </p>
                  )}
                  <label>
                    Startdatum (Monatserster)
                    <input
                      type="date"
                      name="starts_on"
                      defaultValue={month + "-01"}
                      required
                    />
                  </label>
                  <p className="footnote">
                    Preis, Domains und monatliche Kontingente werden aus dem
                    vereinbarten Projektumfang übernommen. Der Monatslauf
                    erstellt Entwürfe ab dem gewählten Monat. Kein automatischer
                    Versand.
                  </p>
                </>
              )}
              {modal === "invoice" && (
                <>
                  <label>
                    Leistung / Betreff
                    <input
                      name="subject"
                      required
                      minLength={2}
                      maxLength={200}
                    />
                  </label>
                  <label>
                    Betrag netto (€)
                    <input
                      name="amount"
                      type="number"
                      required
                      min="0"
                      max="10000000"
                      step="0.01"
                    />
                  </label>
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="button" disabled={busy}>
                {busy ? "Wird gespeichert …" : "Speichern"}
                <Check size={17} />
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={16} />;
}
