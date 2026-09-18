"use client";
import { useEffect, useState } from "react";
import { Search, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useOfferCatalog } from "./offer-configurator";
import type { OfferCatalog } from "@/lib/offer-catalog";
export default function CatalogAdmin({
  mode = "services",
}: {
  mode?: "prices" | "services" | "hidden";
}) {
  const { catalog, setCatalog, ready, error } = useOfferCatalog();
  const [point, setPoint] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [failure, setFailure] = useState("");
  const [group, setGroup] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [expanded, setExpanded] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    if (ready && saved === null) setSaved(JSON.stringify(catalog));
  }, [ready, saved, catalog]);
  const dirty = saved !== null && saved !== JSON.stringify(catalog);
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const navigation = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element).closest?.("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      const url = new URL(link.getAttribute("href")!, location.href);
      if (
        url.origin !== location.origin ||
        (url.pathname === "/crm" &&
          url.searchParams.get("tab") === "Einstellungen")
      )
        return;
      if (
        !window.confirm(
          "Ihre Katalogänderungen sind noch nicht gespeichert. Möchten Sie den Bereich trotzdem verlassen?",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", guard);
    document.addEventListener("click", navigation, true);
    return () => {
      window.removeEventListener("beforeunload", guard);
      document.removeEventListener("click", navigation, true);
    };
  }, [dirty]);
  const groups = [...new Set(catalog.services.map((s) => s.group))];
  const selectedGroup = group || groups[0];
  const filtered = catalog.services.filter(
    (s) =>
      s.id === expanded ||
      ((query || s.group === selectedGroup) &&
        (!query ||
          [s.label, s.description, s.group]
            .join(" ")
            .toLocaleLowerCase("de")
            .includes(query.toLocaleLowerCase("de")))),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * 8, currentPage * 8 + 8);
  function updateService(
    id: string,
    patch: Partial<OfferCatalog["services"][number]>,
  ) {
    setCatalog({
      ...catalog,
      services: catalog.services.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
    setNotice("");
  }
  async function save() {
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      const r = await fetch("/api/offer-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catalog),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Speichern fehlgeschlagen.");
      setCatalog(d);
      setSaved(JSON.stringify(d));
      setNotice(
        "Gespeichert. Die aktualisierten Preise und Leistungen sind veröffentlicht.",
      );
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="panel catalog-admin catalog-organized"
      hidden={mode === "hidden"}
      data-unsaved={dirty ? "true" : undefined}
    >
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">
            {mode === "prices" ? "PREISGESTALTUNG" : "LEISTUNGSKATALOG"}
          </p>
          <h2>
            {mode === "prices"
              ? "Projekt & monatliche Betreuung"
              : "Leistungen gezielt bearbeiten"}
          </h2>
          <p>
            {mode === "prices"
              ? "Wählen Sie eine Budgetstufe und passen Sie die zugehörigen Preise an."
              : "Wählen Sie eine Kategorie oder suchen Sie nach einer Leistung."}
          </p>
        </div>
        <span className="settings-pill">
          {mode === "prices"
            ? catalog.points.length + " Preisstufen"
            : catalog.services.length + " Leistungen"}
        </span>
      </div>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {!ready && !error && <p role="status">Katalog wird geladen …</p>}
      <fieldset disabled={!ready || busy} className="catalog-fields">
        <div className="settings-form-grid">
          <label>
            Budgetstufe
            <select
              value={point}
              onChange={(e) => setPoint(Number(e.target.value))}
            >
              {catalog.points.map((p, i) => (
                <option value={i} key={i}>
                  {p.budget.toLocaleString("de-DE")} € Projektbudget
                </option>
              ))}
            </select>
          </label>
          {mode === "prices" && (
            <>
              <label>
                Projektbudget netto (€)
                <input
                  type="number"
                  min="1000"
                  max="100000"
                  disabled={point === 0 || point === catalog.points.length - 1}
                  value={catalog.points[point].budget}
                  onChange={(e) =>
                    setCatalog({
                      ...catalog,
                      points: catalog.points.map((p, i) =>
                        i === point
                          ? { ...p, budget: Number(e.target.value) }
                          : p,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Betreuung netto pro Monat (€)
                <input
                  type="number"
                  min="49"
                  max="5000"
                  value={catalog.points[point].monthly}
                  onChange={(e) =>
                    setCatalog({
                      ...catalog,
                      points: catalog.points.map((p, i) =>
                        i === point
                          ? { ...p, monthly: Number(e.target.value) }
                          : p,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Preisverlauf zwischen den Stufen
                <select
                  value={catalog.monthlyPricing ?? "linear"}
                  onChange={(e) =>
                    setCatalog({
                      ...catalog,
                      monthlyPricing: e.target.value as "linear" | "commercial",
                    })
                  }
                >
                  <option value="commercial">
                    Verkaufsstufen (49 / 99 / 149 / …)
                  </option>
                  <option value="linear">Gleichmäßig ansteigend</option>
                </select>
              </label>
            </>
          )}
        </div>
        {mode === "prices" && (
          <div className="settings-price-preview">
            <div>
              <small>Einmalige Umsetzung</small>
              <strong>
                {catalog.points[point].budget.toLocaleString("de-DE")} €
              </strong>
            </div>
            <div>
              <small>Monatliche Betreuung</small>
              <strong>
                {catalog.points[point].monthly.toLocaleString("de-DE")} €
              </strong>
            </div>
            <p>
              Alle Preise netto. Der Einstieg bleibt bei 1.000 € Projektbudget
              und 49 € monatlich. Preise müssen über die Budgetstufen ansteigen.
            </p>
          </div>
        )}
        {mode === "services" && (
          <>
            <div className="catalog-filters">
              <label>
                Kategorie
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    setGroup(e.target.value);
                    setQuery("");
                    setPage(0);
                    setExpanded("");
                  }}
                >
                  {groups.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label>
                Leistung suchen
                <div className="catalog-search">
                  <Search size={17} />
                  <input
                    type="search"
                    placeholder="Name oder Beschreibung …"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                      setExpanded("");
                    }}
                  />
                </div>
              </label>
            </div>
            <p className="footnote">
              {filtered.length} Treffer · Mengen gelten für{" "}
              {catalog.points[point].budget.toLocaleString("de-DE")} €
              Projektbudget. Eine Leistung öffnen, um ihre Angaben zu ändern.
            </p>
            <div className="catalog-service-list">
              {visible.map((s) => (
                <article className="catalog-service" key={s.id}>
                  <button
                    className="catalog-service-toggle"
                    type="button"
                    aria-expanded={expanded === s.id}
                    aria-controls={"service-" + s.id}
                    onClick={() => setExpanded(expanded === s.id ? "" : s.id)}
                  >
                    <span>
                      <strong>{s.label}</strong>
                      <small>{s.group}</small>
                    </span>
                    <span className="catalog-quantity">
                      {s.quantities[point]} {s.unit}
                    </span>
                    {expanded === s.id ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>
                  {expanded === s.id && (
                    <div
                      id={"service-" + s.id}
                      className="catalog-service-editor"
                    >
                      <div className="settings-form-grid">
                        <label>
                          Leistungsname
                          <input
                            value={s.label}
                            onChange={(e) =>
                              updateService(s.id, { label: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Enthaltene Menge
                          <input
                            type="number"
                            min="0"
                            max="100000"
                            value={s.quantities[point]}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              updateService(s.id, {
                                quantities: s.quantities.map((q, j) =>
                                  j === point
                                    ? n
                                    : j > point
                                      ? Math.max(q, n)
                                      : q,
                                ),
                              });
                            }}
                          />
                        </label>
                        <label>
                          Kategorie der Leistung
                          <input
                            value={s.group}
                            onChange={(e) =>
                              updateService(s.id, { group: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Einheit
                          <input
                            value={s.unit}
                            onChange={(e) =>
                              updateService(s.id, { unit: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <label>
                        Beschreibung
                        <textarea
                          value={s.description}
                          onChange={(e) =>
                            updateService(s.id, { description: e.target.value })
                          }
                        />
                      </label>
                      <p className="footnote">
                        Höhere Budgetstufen enthalten mindestens diese Menge.
                        Vereinbarte Kundenangebote bleiben unverändert.
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {!filtered.length && (
              <p className="info-box">
                Keine passende Leistung gefunden. Versuchen Sie einen anderen
                Suchbegriff.
              </p>
            )}
            {pageCount > 1 && (
              <div className="catalog-pagination">
                <button
                  className="button small outline"
                  disabled={currentPage === 0}
                  onClick={() => {
                    setPage(currentPage - 1);
                    setExpanded("");
                  }}
                >
                  Zurück
                </button>
                <span>
                  Seite {currentPage + 1} von {pageCount}
                </span>
                <button
                  className="button small outline"
                  disabled={currentPage === pageCount - 1}
                  onClick={() => {
                    setPage(currentPage + 1);
                    setExpanded("");
                  }}
                >
                  Weiter
                </button>
              </div>
            )}
          </>
        )}
      </fieldset>
      <div className="catalog-savebar">
        <div>
          <strong>
            {dirty ? "Ungespeicherte Änderungen" : "Aktueller Katalog"}
          </strong>
          <small>
            Speichern veröffentlicht die Änderungen auf der Website.
          </small>
        </div>
        <div className="actions">
          {mode === "services" && (
            <button
              className="button outline"
              disabled={!ready || busy}
              onClick={() => {
                const id = "service_" + Date.now();
                setCatalog({
                  ...catalog,
                  services: [
                    ...catalog.services,
                    {
                      id,
                      group: "Weitere Leistungen",
                      label: "Neue Leistung",
                      unit: "Einheiten",
                      description: "Leistungsumfang beschreiben.",
                      quantities: catalog.points.map(() => 0),
                    },
                  ],
                });
                setGroup("Weitere Leistungen");
                setQuery("");
                setPage(
                  Math.floor(
                    catalog.services.filter(
                      (s) => s.group === "Weitere Leistungen",
                    ).length / 8,
                  ),
                );
                setExpanded(id);
              }}
            >
              <Plus size={16} />
              Leistung ergänzen
            </button>
          )}
          <button
            className="button"
            disabled={!ready || busy || !dirty}
            onClick={save}
          >
            {busy ? "Wird gespeichert …" : "Änderungen veröffentlichen"}
          </button>
        </div>
      </div>
      {failure && (
        <p className="alert error" role="alert">
          {failure}
        </p>
      )}
      {notice && (
        <p className="info-box" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
