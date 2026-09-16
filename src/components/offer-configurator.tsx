"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Minus, Plus } from "lucide-react";
import defaults from "@/lib/default-offer-catalog.json";
import {
  calculateOffer,
  euros,
  type OfferCatalog,
  type OfferQuote,
  type OfferSelection,
} from "@/lib/offer-catalog";
export function useOfferCatalog() {
  const [catalog, setCatalog] = useState<OfferCatalog>(defaults);
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
                  {s.quantity} {s.unit} · {s.label}
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}
export default function OfferConfigurator({
  onRequest,
  onChange,
}: {
  onRequest: (quote: OfferQuote) => void;
  onChange: (quote: OfferQuote) => void;
}) {
  const { catalog, ready, error } = useOfferCatalog();
  const [budget, setBudget] = useState(10000),
    [logo, setLogo] = useState(false),
    [domains, setDomains] = useState(0),
    [domainFee, setDomainFee] = useState(3),
    [openGroup, setOpenGroup] = useState("Website & Inhalte");
  const selection: OfferSelection = {
    budget,
    logo,
    domains,
    domainFee,
    catalogVersion: catalog.version,
  };
  const quote = calculateOffer(catalog, selection);
  const groups = [...new Set(catalog.services.map((s) => s.group))];
  useEffect(() => {
    onChange(
      calculateOffer(catalog, {
        budget,
        logo,
        domains,
        domainFee,
        catalogVersion: catalog.version,
      }),
    );
  }, [catalog, budget, logo, domains, domainFee, onChange]);
  return (
    <div className="offer-configurator">
      <div className="offer-package-grid">
        {[
          {
            name: "Basic",
            budget: 1000,
            tag: "WEBSITE & EINSTIEG",
            text: "Ein klarer Auftritt mit den richtigen Grundlagen.",
          },
          {
            name: "Business",
            budget: 10000,
            tag: "WEBSITE, CRM & TEAM",
            text: "Kunden, Abläufe und Zugänge in einem System.",
          },
          {
            name: "Enterprise",
            budget: 35000,
            tag: "PLATTFORM & AUTOMATISIERUNG",
            text: "Portale, Finance, Schnittstellen und KI nach Ihrem Bedarf.",
          },
        ].map((p) => (
          <button
            key={p.name}
            className={
              "offer-package " + (quote.package === p.name ? "selected" : "")
            }
            aria-pressed={quote.package === p.name}
            onClick={() => setBudget(p.budget)}
          >
            <span>{p.tag}</span>
            <h3>{p.name}</h3>
            <p>{p.text}</p>
            <strong>ab {euros(p.budget * 100)}</strong>
            <small>
              Betreuung ab{" "}
              {euros(
                calculateOffer(catalog, { ...selection, budget: p.budget })
                  .care_cents,
              )}
              /Monat
            </small>
          </button>
        ))}
      </div>
      <div className="offer-builder">
        <div className="offer-build-main">
          <div className="offer-budget-heading">
            <div>
              <p className="eyebrow">UMFANG SELBST PLANEN</p>
              <h3>Wie groß ist Ihr nächster Schritt?</h3>
            </div>
            <label>
              Projektbudget netto
              <div className="offer-budget-input">
                <input
                  aria-label="Projektbudget in Euro"
                  type="number"
                  min={1000}
                  max={100000}
                  step={1}
                  value={budget}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (n >= 1000 && n <= 100000) setBudget(Math.floor(n));
                  }}
                />
                <span>€</span>
              </div>
            </label>
          </div>
          <input
            className="offer-range"
            aria-label="Projektbudget einstellen"
            type="range"
            min={1000}
            max={100000}
            step={500}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            style={{
              background: `linear-gradient(to right,#ae884c ${(budget - 1000) / 990}%,#354047 ${(budget - 1000) / 990}%)`,
            }}
          />
          <div className="offer-range-labels">
            <span>1.000 €</span>
            <span>100.000 €</span>
          </div>
          <p className="footnote">
            Das Budget bestimmt das Paket und die unten ausgewiesenen Mengen.
            Sie können den Regler ziehen, die Pfeiltasten nutzen oder einen
            Betrag eingeben.
          </p>
          <div className="offer-service-groups">
            {groups.map((group) => (
              <section key={group}>
                <button
                  className="offer-group-toggle"
                  aria-expanded={openGroup === group}
                  onClick={() => setOpenGroup(openGroup === group ? "" : group)}
                >
                  <span>{group}</span>
                  {openGroup === group ? (
                    <Minus size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                </button>
                {openGroup === group && (
                  <ul>
                    {quote.items
                      .filter((s) => s.group === group)
                      .map((s) => (
                        <li
                          key={s.id}
                          className={s.quantity === 0 ? "not-included" : ""}
                        >
                          <div>
                            <strong>{s.label}</strong>
                            <p>{s.description}</p>
                          </div>
                          <span>
                            {s.quantity > 0
                              ? `${s.quantity} ${s.unit}`
                              : "Nicht enthalten"}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <div className="offer-addons">
            <h4>Passend dazu</h4>
            <label className="offer-check">
              <input
                type="checkbox"
                checked={logo}
                onChange={(e) => setLogo(e.target.checked)}
              />
              <span>
                <strong>Logo-Erstellung nach Wunschvorgaben</strong>
                <small>
                  299 € netto einmalig · 1 Logo nach Wunschvorgaben. Korrekturen
                  aus dem Projektkontingent.
                </small>
              </span>
            </label>
            <div className="form-pair">
              <label>
                Verwaltete Domains
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={domains}
                  onChange={(e) =>
                    setDomains(
                      Math.min(
                        50,
                        Math.max(0, Math.floor(Number(e.target.value))),
                      ),
                    )
                  }
                />
              </label>
              <label>
                Je Domain / Monat
                <select
                  value={domainFee}
                  onChange={(e) => setDomainFee(Number(e.target.value))}
                >
                  {[2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} € netto
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="footnote">
              Domainpreis nach Endung und Anbieter. Verfügbarkeit und konkrete
              Kosten werden im Angebot bestätigt.
            </p>
          </div>
        </div>
        <aside className="offer-build-summary">
          <OfferSummary quote={quote} />
          <ul className="offer-key-quotas">
            {[
              "pages",
              "modules",
              "staff_users",
              "customer_users",
              "agents",
              "corrections",
              "changes",
              "care_minutes",
            ].map((id) => {
              const s = quote.items.find((i) => i.id === id);
              return s ? (
                <li key={id}>
                  <Check size={15} />
                  <span>{s.label}</span>
                  <strong>
                    {s.quantity}
                    {id === "care_minutes" ? " Min." : ""}
                  </strong>
                </li>
              ) : null;
            })}
          </ul>
          <button
            className="button"
            disabled={!ready}
            onClick={() => onRequest(quote)}
          >
            Diese Konfiguration anfragen <ArrowUpRight size={17} />
          </button>
          {error && <p role="alert">{error}</p>}
          <p className="footnote">
            Unverbindliche Kalkulation. Der konkrete Umfang und die technische
            Machbarkeit werden vor Beauftragung bestätigt. Komplettänderungen
            gelten nur während der Entwicklung und innerhalb der vereinbarten
            Mengen.
          </p>
        </aside>
      </div>
    </div>
  );
}
export function CareOverview({ quote }: { quote: OfferQuote | null }) {
  if (!quote) return null;
  const care = quote.items.filter((s) => s.id.startsWith("care_"));
  return (
    <div className="offer-care">
      <div>
        <p className="eyebrow">PASSEND ZU IHRER PLATTFORM</p>
        <h3>{quote.package} Betreuung</h3>
        <p>Die Betreuung wächst mit dem ausgewählten Projektumfang.</p>
        <strong className="offer-care-price">
          {euros(quote.care_cents)} <small>netto / Monat</small>
        </strong>
        <p>
          {quote.domain_cents
            ? `Mit Domain-Verwaltung: ${euros(quote.monthly_cents)} netto / Monat.`
            : "Domain-Verwaltung optional."}
        </p>
        <a className="button outline" href="#pakete">
          Umfang anpassen
        </a>
      </div>
      <ul>
        {care.map((s) => (
          <li key={s.id}>
            <strong>
              {s.quantity} {s.unit}
            </strong>
            <span>{s.label}</span>
            <small>{s.description}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
