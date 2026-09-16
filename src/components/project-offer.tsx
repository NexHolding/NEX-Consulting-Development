"use client";
import { useState } from "react";
import { useOfferCatalog, OfferSummary } from "./offer-configurator";
import { calculateOffer, type OfferQuote } from "@/lib/offer-catalog";
export default function ProjectOffer({
  project,
  mutate,
  busy,
}: {
  project: { id: string; offer_snapshot?: OfferQuote | null };
  mutate: (
    action: string,
    payload: Record<string, unknown>,
  ) => Promise<boolean>;
  busy: boolean;
}) {
  const { catalog, ready, error } = useOfferCatalog();
  const old = project.offer_snapshot?.selection;
  const [budget, setBudget] = useState(old?.budget ?? 1000),
    [logo, setLogo] = useState(old?.logo ?? false),
    [domains, setDomains] = useState(old?.domains ?? 0),
    [domainFee, setDomainFee] = useState(old?.domainFee ?? 3),
    [notice, setNotice] = useState("");
  const selection = {
    budget,
    logo,
    domains,
    domainFee,
    catalogVersion: catalog.version,
  };
  const quote = calculateOffer(catalog, selection);
  return (
    <details className="project-offer">
      <summary>Paketumfang & Betreuung vereinbaren</summary>
      {project.offer_snapshot && (
        <>
          <p>Gespeicherter Projektumfang</p>
          <OfferSummary quote={project.offer_snapshot} details />
        </>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await mutate("project_offer", {
              id: project.id,
              configuration: selection,
            })
          )
            setNotice(
              "Vereinbarten Umfang und 150 € netto/Stunde für Mehrarbeit gespeichert.",
            );
        }}
      >
        <label>
          Projektbudget netto (€)
          <input
            type="number"
            min="1000"
            max="100000"
            required
            value={budget}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n >= 1000 && n <= 100000) setBudget(Math.floor(n));
            }}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={logo}
            onChange={(e) => setLogo(e.target.checked)}
          />
          Logo-Erstellung +299 € netto
        </label>
        <div className="form-pair">
          <label>
            Domains
            <input
              type="number"
              min="0"
              max="50"
              value={domains}
              onChange={(e) =>
                setDomains(
                  Math.max(0, Math.min(50, Math.floor(Number(e.target.value)))),
                )
              }
            />
          </label>
          <label>
            Euro / Domain / Monat
            <select
              value={domainFee}
              onChange={(e) => setDomainFee(Number(e.target.value))}
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <OfferSummary quote={quote} details />
        <label className="check-label">
          <input type="checkbox" required />
          Dieser Umfang ist mit dem Kunden vereinbart. Bestehende
          Betreuungsverträge bleiben unverändert.
        </label>
        <button className="button small outline" disabled={busy || !ready}>
          Vereinbarten Umfang übernehmen
        </button>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </form>
    </details>
  );
}
