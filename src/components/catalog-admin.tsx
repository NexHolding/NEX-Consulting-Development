"use client";
import { useState } from "react";
import { useOfferCatalog } from "./offer-configurator";
export default function CatalogAdmin() {
  const { catalog, setCatalog, ready, error } = useOfferCatalog();
  const [point, setPoint] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  return (
    <section className="panel catalog-admin">
      <p className="eyebrow">ANGEBOTE & LEISTUNGEN</p>
      <h2>Leistungskatalog</h2>
      <p>
        Hier pflegen Sie die öffentlich sichtbaren Mengen und monatlichen
        Preise. Bereits gespeicherte Anfragen und vereinbarte Projektumfänge
        bleiben unverändert.
      </p>
      {error && <p role="alert">{error}</p>}
      <label>
        Preisstufe
        <select
          value={point}
          onChange={(e) => setPoint(Number(e.target.value))}
        >
          {catalog.points.map((p, i) => (
            <option value={i} key={p.budget}>
              {p.budget.toLocaleString("de-DE")} € Projektbudget
            </option>
          ))}
        </select>
      </label>
      <label>
        Projektbudget dieser Preisstufe (€)
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
                i === point ? { ...p, budget: Number(e.target.value) } : p,
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
                i === point ? { ...p, monthly: Number(e.target.value) } : p,
              ),
            })
          }
        />
      </label>
      <p className="footnote">
        Einstieg 49 €, Obergrenze 5.000 €. Preise und Mengen müssen über die
        Stufen aufsteigen. Mengenänderungen werden bei Bedarf auch in höheren
        Stufen angehoben.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Leistung / Beschreibung</th>
              <th>Gruppe / Einheit</th>
              <th>Menge dieser Stufe</th>
            </tr>
          </thead>
          <tbody>
            {catalog.services.map((s, index) => (
              <tr key={s.id}>
                <td>
                  <input
                    aria-label={"Leistungsname " + s.id}
                    value={s.label}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        services: catalog.services.map((v, i) =>
                          i === index ? { ...v, label: e.target.value } : v,
                        ),
                      })
                    }
                  />
                  <textarea
                    aria-label={"Beschreibung " + s.id}
                    value={s.description}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        services: catalog.services.map((v, i) =>
                          i === index
                            ? { ...v, description: e.target.value }
                            : v,
                        ),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={"Gruppe " + s.id}
                    value={s.group}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        services: catalog.services.map((v, i) =>
                          i === index ? { ...v, group: e.target.value } : v,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={"Einheit " + s.id}
                    value={s.unit}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        services: catalog.services.map((v, i) =>
                          i === index ? { ...v, unit: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={"Menge " + s.label}
                    type="number"
                    min="0"
                    max="100000"
                    value={s.quantities[point]}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setCatalog({
                        ...catalog,
                        services: catalog.services.map((v, i) =>
                          i === index
                            ? {
                                ...v,
                                quantities: v.quantities.map((q, j) =>
                                  j === point
                                    ? n
                                    : j > point
                                      ? Math.max(q, n)
                                      : q,
                                ),
                              }
                            : v,
                        ),
                      });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions">
        <button
          className="button outline"
          onClick={() =>
            setCatalog({
              ...catalog,
              services: [
                ...catalog.services,
                {
                  id: "service_" + Date.now(),
                  group: "Weitere Leistungen",
                  label: "Neue Leistung",
                  unit: "Einheiten",
                  description: "Leistungsumfang beschreiben.",
                  quantities: catalog.points.map(() => 0),
                },
              ],
            })
          }
        >
          Leistung ergänzen
        </button>
        <button
          className="button"
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true);
            setNotice("");
            try {
              const r = await fetch("/api/offer-catalog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(catalog),
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              setCatalog(d);
              setNotice(
                "Katalog veröffentlicht. Neue Anfragen verwenden Version " +
                  d.version +
                  ".",
              );
            } catch (e) {
              setNotice(
                e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Katalog speichern & veröffentlichen
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
