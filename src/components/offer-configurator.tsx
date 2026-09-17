"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ArrowDown,
  Check,
  Minus,
  Plus,
  SlidersHorizontal,
  FileCheck2,
  ShieldCheck,
  Palette,
} from "lucide-react";
import defaults from "@/lib/default-offer-catalog.json";
import {
  calculateOffer,
  serviceAmount,
  offerQuantity,
  offerTiers,
  budgetForRequirements,
  euros,
  type OfferCatalog,
  type OfferQuote,
} from "@/lib/offer-catalog";
export function useOfferCatalog() {
  const [catalog, setCatalog] = useState<OfferCatalog>(
    defaults as OfferCatalog,
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/offer-catalog", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok)
          throw Error("Katalog derzeit nicht verfügbar. Bitte neu laden.");
        return r.json();
      })
      .then((c) => {
        setCatalog(c);
        setReady(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  return { catalog, setCatalog, ready, error };
}
export function OfferSummary({
  quote,
  details = false,
}: {
  quote: OfferQuote;
  details?: boolean;
}) {
  return (
    <div className="offer-summary">
      <p className="eyebrow">{quote.package} · IHRE KONFIGURATION</p>
      <div className="offer-totals">
        <div>
          <span>Einmalige Umsetzung</span>
          <strong>{euros(quote.one_time_cents)}</strong>
          <small>
            {euros(quote.project_cents)} Projekt
            {quote.logo_cents > 0 ? ` + ${euros(quote.logo_cents)} Logo` : ""}
          </small>
        </div>
        <div>
          <span>Laufend pro Monat</span>
          <strong>{euros(quote.monthly_cents)}</strong>
          <small>
            {euros(quote.care_cents)} Betreuung
            {quote.domain_cents > 0
              ? ` + ${euros(quote.domain_cents)} Domains`
              : ""}
          </small>
        </div>
      </div>
      <p className="footnote">
        Alle Beträge netto. Hosting, Lizenzen, KI-/API-Verbrauch und sonstige
        Fremdanbietergebühren separat. Mehrarbeit nach Freigabe: 150 €
        netto/Stunde, minutengenau dokumentiert.
      </p>
      {details && (
        <details>
          <summary>Leistungsumfang anzeigen</summary>
          <ul>
            {quote.items
              .filter((s) => s.quantity > 0)
              .map((s) => (
                <li key={s.id}>
                  {serviceAmount(s.quantity, s.unit, s.id)} · {s.label}
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}
function BudgetNumber({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      aria-label={label}
      min={min}
      max={max}
      step="1"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (
          e.target.value !== "" &&
          Number.isInteger(n) &&
          n >= min &&
          n <= max
        )
          onChange(n);
      }}
      onBlur={() => {
        const n = draft.trim() === "" ? value : Number(draft);
        const next = Number.isFinite(n)
          ? Math.max(min, Math.min(max, Math.round(n)))
          : value;
        setDraft(String(next));
        onChange(next);
      }}
    />
  );
}
const featuredIds = [
  "pages",
  "forms",
  "modules",
  "staff_users",
  "customer_users",
  "agents",
  "integrations",
  "corrections",
  "changes",
];
const shortLabels: Record<string, string> = {
  pages: "Inhaltsseiten",
  forms: "Formulare & Intake-Abläufe",
  modules: "CRM- & Backend-Module",
  staff_users: "Mitarbeiterzugänge",
  customer_users: "Kundenzugänge",
  agents: "KI-Agenten",
  integrations: "Schnittstellen",
  corrections: "Korrekturrunden",
  changes: "Komplettänderungen",
};
export default function OfferConfigurator({
  onRequest,
  onOptionsChange,
}: {
  onRequest: (quote: OfferQuote) => void;
  onOptionsChange: (quotes: OfferQuote[]) => void;
}) {
  const { catalog, ready, error } = useOfferCatalog();
  const [budgets, setBudgets] = useState<number[]>(
    offerTiers.map((t) => t.start),
  );
  const [logos, setLogos] = useState([false, false, false]);
  const [domains, setDomains] = useState([0, 0, 0]);
  const [fees, setFees] = useState([3, 3, 3]);
  const [active, setActive] = useState(1);
  const [requirements, setRequirements] = useState<Record<string, number>>({
    pages: 5,
    staff_users: 0,
    customer_users: 0,
    modules: 0,
    agents: 0,
    integrations: 0,
    corrections: 1,
    changes: 0,
  });
  const [recommendation, setRecommendation] = useState("");
  const quotes = useMemo(
    () =>
      budgets.map((budget, i) =>
        calculateOffer(catalog, {
          budget,
          logo: logos[i],
          domains: domains[i],
          domainFee: fees[i],
          catalogVersion: catalog.version,
        }),
      ),
    [catalog, budgets, logos, domains, fees],
  );
  useEffect(() => {
    onOptionsChange(ready ? quotes : []);
  }, [quotes, ready, onOptionsChange]);
  const updateBudget = (index: number, budget: number) => {
    setActive(index);
    setBudgets((current) => current.map((v, i) => (i === index ? budget : v)));
  };
  const groups = [
    ...new Set(
      catalog.services
        .filter((s) => !s.id.startsWith("care_"))
        .map((s) => s.group),
    ),
  ];
  return (
    <div className="offer-configurator tariff-configurator">
      <div className="tariff-intro">
        <span>
          <SlidersHorizontal size={20} /> Ihr Budget. Ihr Leistungsumfang.
        </span>
        <p>
          Regler bewegen — Leistungen und Monatsbeitrag passen sich direkt an.
          Alle Preise netto.
        </p>
        <a href="#tarif-bedarf">
          Lieber nach Bedarf berechnen <ArrowDown size={15} />
        </a>
      </div>
      <div className="tariff-grid">
        {offerTiers.map((tier, index) => {
          const quote = quotes[index];
          const progress =
            ((budgets[index] - tier.min) / (tier.max - tier.min)) * 100;
          return (
            <article
              key={tier.name}
              className={
                "tariff-card " +
                (index === 1 ? "tariff-business " : "") +
                (active === index ? "is-current" : "")
              }
              id={"tarif-" + tier.name.toLowerCase()}
              aria-label={tier.name + " konfigurieren"}
            >
              <div className="tariff-ribbon">
                {index === 1
                  ? "WEBSITE + CRM + TEAM"
                  : index === 0
                    ? "KLEIN STARTEN"
                    : "INDIVIDUELL SKALIEREN"}
              </div>
              <header>
                <p className="eyebrow">{tier.tag}</p>
                <h3>{tier.name}</h3>
                <p className="tariff-description">{tier.description}</p>
              </header>
              <div
                className="tariff-price"
                aria-live="polite"
                aria-atomic="true"
              >
                <strong>{euros(quote.one_time_cents)}</strong>
                <span>
                  einmalige Umsetzung · netto
                  {quote.logo_cents > 0 ? " · inkl. Logo" : ""}
                </span>
              </div>
              <div className="tariff-controls">
                <label htmlFor={"budget-" + index}>
                  Projektumfang einstellen{" "}
                  <span>{euros(budgets[index] * 100)}</span>
                </label>
                <input
                  id={"budget-" + index}
                  className="offer-range"
                  aria-label={tier.name + " Projektbudget einstellen"}
                  type="range"
                  min={tier.min}
                  max={tier.max}
                  step="1"
                  value={budgets[index]}
                  onChange={(e) => updateBudget(index, Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right,#d4b574 ${progress}%,#344049 ${progress}%)`,
                  }}
                />
                <div className="tariff-range-labels">
                  <span>{euros(tier.min * 100)}</span>
                  <span>{euros(tier.max * 100)}</span>
                </div>
                <label className="tariff-exact">
                  Betrag eingeben{" "}
                  <span>
                    <BudgetNumber
                      value={budgets[index]}
                      min={tier.min}
                      max={tier.max}
                      label={tier.name + " Budget in Euro"}
                      onChange={(n) => updateBudget(index, n)}
                    />{" "}
                    €
                  </span>
                </label>
                <div className="tariff-presets">
                  {[
                    tier.min,
                    ...catalog.points
                      .map((p) => p.budget)
                      .filter((n) => n > tier.min && n < tier.max),
                    tier.max,
                  ]
                    .filter((n, i, a) => a.indexOf(n) === i)
                    .map((n) => (
                      <button
                        type="button"
                        key={n}
                        className={budgets[index] === n ? "active" : ""}
                        onClick={() => updateBudget(index, n)}
                      >
                        {euros(n * 100)}
                      </button>
                    ))}
                </div>
              </div>
              <div className="tariff-live-care">
                <span>Passende Betreuung nach dem Launch</span>
                <strong>
                  {euros(quote.monthly_cents)} <small>/ Monat</small>
                </strong>
                <span>
                  {offerQuantity(quote, "care_minutes")} Min. Änderungen ·{" "}
                  {serviceAmount(
                    offerQuantity(quote, "care_requests"),
                    "Aufträge",
                  )}{" "}
                  / Monat
                  {quote.domain_cents > 0
                    ? ` · ${euros(quote.domain_cents)} Domains enthalten`
                    : ""}
                </span>
              </div>
              <button
                className={"button " + (index === 1 ? "" : "outline")}
                disabled={!ready}
                onClick={() => onRequest(quote)}
              >
                {tier.name} anfragen <ArrowUpRight size={16} />
              </button>
              <ul className="tariff-features">
                {featuredIds.map((id) => {
                  const item = quote.items.find((s) => s.id === id);
                  return item ? (
                    <li
                      key={id}
                      className={item.quantity === 0 ? "unavailable" : ""}
                    >
                      {item.quantity > 0 ? (
                        <Check size={16} />
                      ) : (
                        <Minus size={16} />
                      )}
                      <span>{shortLabels[id] || item.label}</span>
                      <strong key={item.quantity}>
                        {item.quantity > 0 ? item.quantity : "—"}
                      </strong>
                    </li>
                  ) : null;
                })}
              </ul>
              <div className="tariff-basics">
                {["imprint", "privacy", "responsive", "consent"].map((id) => {
                  const item = quote.items.find((s) => s.id === id);
                  return item && item.quantity > 0 ? (
                    <span key={id}>
                      <Check size={14} />
                      {item.label}
                    </span>
                  ) : null;
                })}
              </div>
              <div className="tariff-addons">
                <label className="tariff-logo">
                  <input
                    type="checkbox"
                    checked={logos[index]}
                    onChange={(e) => {
                      setActive(index);
                      setLogos((v) =>
                        v.map((x, i) => (i === index ? e.target.checked : x)),
                      );
                    }}
                  />
                  <span>
                    <strong>Logo-Erstellung</strong>
                    <small>Nach Ihren Wunschvorgaben</small>
                  </span>
                  <b>+299 €</b>
                </label>
                <label className="tariff-domain-toggle">
                  <input
                    type="checkbox"
                    checked={domains[index] > 0}
                    onChange={(e) => {
                      setActive(index);
                      setDomains((v) =>
                        v.map((x, i) =>
                          i === index ? (e.target.checked ? 1 : 0) : x,
                        ),
                      );
                    }}
                  />
                  Domain-Verwaltung <b>2–5 € / Monat</b>
                </label>
                {domains[index] > 0 && (
                  <div className="tariff-domain-fields">
                    <label>
                      Anzahl Domains
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={domains[index]}
                        onChange={(e) =>
                          setDomains((v) =>
                            v.map((x, i) =>
                              i === index
                                ? Math.max(
                                    1,
                                    Math.min(
                                      50,
                                      Math.floor(Number(e.target.value)),
                                    ),
                                  )
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Je Domain / Monat
                      <select
                        value={fees[index]}
                        onChange={(e) =>
                          setFees((v) =>
                            v.map((x, i) =>
                              i === index ? Number(e.target.value) : x,
                            ),
                          )
                        }
                      >
                        {[2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} €
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
              <a className="tariff-details-link" href="#leistungsvergleich">
                Alle Leistungen im Vergleich <ArrowDown size={14} />
              </a>
            </article>
          );
        })}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="tariff-foundations">
        <article>
          <FileCheck2 size={22} />
          <h4>Impressum anlegen</h4>
          <p>
            Wir erstellen und integrieren Ihr Impressum anhand der Unternehmens-
            und Betreiberangaben, die Sie uns bereitstellen.
          </p>
        </article>
        <article>
          <ShieldCheck size={22} />
          <h4>Datenschutz für Ihre Website</h4>
          <p>
            Abgestimmt auf die tatsächlichen Funktionen, Formulare, Einbindungen
            und Dienste Ihrer individuellen Website.
          </p>
        </article>
        <article>
          <Palette size={22} />
          <h4>Ihr Logo. Ihre Richtung.</h4>
          <p>
            Optional für 299 € netto: ein Logo nach Ihrem Briefing und Ihren
            Wunschvorgaben. Korrekturen aus dem Projektkontingent.
          </p>
        </article>
      </div>
      <div className="tariff-needs" id="tarif-bedarf">
        <div>
          <p className="eyebrow">VOM BEDARF ZUM PREIS</p>
          <h3>Was soll Ihr System können?</h3>
          <p>
            Tragen Sie die benötigten Mengen ein. Wir ermitteln den kleinsten
            Budgetrahmen im Katalog, der alle gewählten Anforderungen abdeckt.
          </p>
        </div>
        <div>
          <div className="tariff-needs-fields">
            {Object.keys(requirements).map((id) => (
              <label key={id}>
                {shortLabels[id]}
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  value={requirements[id]}
                  onChange={(e) =>
                    setRequirements((v) => ({
                      ...v,
                      [id]: Math.max(
                        0,
                        Math.min(100000, Math.floor(Number(e.target.value))),
                      ),
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <button
            className="button outline"
            disabled={!ready}
            onClick={() => {
              const budget = budgetForRequirements(catalog, requirements);
              if (budget == null) {
                setRecommendation(
                  "Ihre Auswahl übersteigt den Katalograhmen von 100.000 €. Bitte besprechen Sie diesen Umfang individuell mit uns.",
                );
                return;
              }
              const index = offerTiers.findIndex(
                (t) => budget >= t.min && budget <= t.max,
              );
              updateBudget(index, budget);
              setRecommendation(
                `${offerTiers[index].name} deckt Ihre Auswahl ab: ${euros(budget * 100)} Projektbudget, zuzüglich gewählter Optionen. Die Paketkarte und Monatsbetreuung wurden angepasst.`,
              );
            }}
          >
            Passenden Tarif berechnen <ArrowUpRight size={16} />
          </button>
          {recommendation && (
            <p role="status" className="tariff-recommendation">
              {recommendation}
            </p>
          )}
        </div>
      </div>
      <div className="tariff-comparison" id="leistungsvergleich">
        <div className="tariff-comparison-heading">
          <div>
            <p className="eyebrow">DER LEISTUNGSKATALOG</p>
            <h3>Jede Leistung. Jede Menge. Klar geregelt.</h3>
          </div>
          <span>
            {catalog.services.filter((s) => !s.id.startsWith("care_")).length}{" "}
            Projektleistungen · live nach Ihren Reglern
          </span>
        </div>
        {groups.map((group, index) => (
          <details key={group} open={index === 0}>
            <summary>
              {group}
              <span>
                {
                  catalog.services.filter(
                    (s) => s.group === group && !s.id.startsWith("care_"),
                  ).length
                }{" "}
                Leistungen <Plus size={16} />
              </span>
            </summary>
            <div className="tariff-comparison-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Vereinbarter Umfang</th>
                    {quotes.map((q) => (
                      <th scope="col" key={q.package}>
                        {q.package}
                        <small>{euros(q.project_cents)}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalog.services
                    .filter(
                      (s) => s.group === group && !s.id.startsWith("care_"),
                    )
                    .map((s) => (
                      <tr key={s.id}>
                        <th scope="row">
                          <strong>{s.label}</strong>
                          <small>{s.description}</small>
                        </th>
                        {quotes.map((q) => {
                          const n = offerQuantity(q, s.id);
                          return (
                            <td
                              key={q.package}
                              className={n === 0 ? "unavailable" : ""}
                            >
                              {n > 0 ? (
                                <>
                                  <strong>{n}</strong>
                                  <small>
                                    {serviceAmount(n, s.unit).replace(
                                      /^\d+ /,
                                      "",
                                    )}
                                  </small>
                                </>
                              ) : (
                                <span aria-label="Nicht enthalten">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
      <p className="footnote tariff-terms">
        Unverbindliche Kalkulation; Umfang und Machbarkeit werden vor
        Beauftragung bestätigt. Mengen beschreiben den enthaltenen
        Leistungsrahmen. Basic enthält keine Komplettänderung; größere Pakete
        nur in der ausgewiesenen Anzahl während der Entwicklung. Mehrarbeit nach
        Freigabe: 150 € netto/Stunde, dokumentiert im Zeitauszug. Domainpreis
        nach Endung und Anbieter. Hosting, Lizenzen, KI-/API-Verbrauch,
        Rechtsprüfung und sonstige Fremdkosten separat.
      </p>
    </div>
  );
}
export function CareOverview({
  quotes,
  onRequest,
}: {
  quotes: OfferQuote[];
  onRequest: (q: OfferQuote) => void;
}) {
  return (
    <div className="tariff-care-grid">
      {quotes.map((quote, index) => (
        <article
          className={"tariff-care-card " + (index === 1 ? "featured" : "")}
          key={quote.package}
        >
          <p className="eyebrow">PASSEND ZU {quote.package.toUpperCase()}</p>
          <h3>{offerTiers[index].care}</h3>
          <p>
            {
              [
                "Für einen gepflegten Webauftritt und kleine Anpassungen.",
                "Für Systeme, die Ihr Team jeden Tag begleiten.",
                "Für vernetzte Plattformen und laufende Weiterentwicklung.",
              ][index]
            }
          </p>
          <div className="tariff-care-price" aria-live="polite">
            <strong>{euros(quote.monthly_cents)}</strong>
            <span>netto / Monat</span>
          </div>
          <p className="tariff-care-relation">
            Für Ihre Auswahl mit {euros(quote.project_cents)} Projektbudget
            {quote.domain_cents > 0
              ? ` · davon ${euros(quote.domain_cents)} Domain-Verwaltung/Monat`
              : ""}
          </p>
          <ul>
            {quote.items
              .filter((s) => s.id.startsWith("care_"))
              .map((s) => (
                <li key={s.id}>
                  <span>{s.label}</span>
                  <strong>
                    {s.quantity > 0
                      ? serviceAmount(s.quantity, s.unit, s.id)
                      : "—"}
                  </strong>
                </li>
              ))}
          </ul>
          <p className="footnote">
            Änderungszeit und Auftragsanzahl gelten gemeinsam pro Monat.
            Gespräche werden auf die Zeit angerechnet. Kein Übertrag ungenutzter
            Kontingente.
          </p>
          <button
            className={"button " + (index === 1 ? "" : "outline")}
            onClick={() => onRequest(quote)}
          >
            Projekt + Betreuung anfragen <ArrowUpRight size={15} />
          </button>
          <a href={"#tarif-" + quote.package.toLowerCase()}>
            Mit dem Projektregler anpassen ↑
          </a>
        </article>
      ))}
    </div>
  );
}
