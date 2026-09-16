"use client";
import { useId, useState } from "react";
import {
  correctionLabel,
  assignmentLabel,
  usedCorrectionRounds,
  usedChangeRounds,
  type CorrectionProject,
  type CorrectionTime,
  type TimeAssignment,
  validTimeAssignment,
} from "@/lib/correction-rounds";
type Mutate = (
  action: string,
  payload: Record<string, unknown>,
) => Promise<boolean>;
export function CorrectionFields({
  project,
  times,
  assignment,
  onChange,
  disabled = false,
}: {
  project?: CorrectionProject;
  times: CorrectionTime[];
  assignment: TimeAssignment;
  onChange: (value: TimeAssignment) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const value = assignment.correction_round;
  const isChange = assignment.change_request != null;
  const isExtra = assignment.extra_work != null;
  const rounds = project ? usedCorrectionRounds(times, project.id) : [];
  return (
    <div className="correction-fields">
      <label>
        Leistungszuordnung
        <select
          disabled={disabled || !project}
          value={
            isExtra
              ? "extra"
              : isChange
                ? "change"
                : value == null
                  ? "regular"
                  : "correction"
          }
          onChange={(e) =>
            onChange(
              e.target.value === "extra"
                ? {
                    correction_round: null,
                    change_request: null,
                    extra_work: "",
                    change_round: null,
                  }
                : e.target.value === "change"
                  ? {
                      correction_round: null,
                      change_request: "",
                      change_round: 1,
                      extra_work: null,
                    }
                  : {
                      correction_round:
                        e.target.value === "regular"
                          ? null
                          : rounds.at(-1) || 1,
                      change_request: null,
                    },
            )
          }
        >
          <option value="regular">Reguläre Projektarbeit</option>
          <option value="correction">Korrekturrunde</option>
          <option value="change">Abänderung durch Kunden</option>
          <option value="extra">Zusatzleistung außerhalb des Pakets</option>
        </select>
      </label>
      <button
        type="button"
        className={
          "button small outline change-request-button" +
          (isChange ? " active" : "")
        }
        disabled={disabled || !project}
        aria-pressed={isChange}
        onClick={() =>
          onChange({
            correction_round: null,
            change_request: assignment.change_request ?? "",
            change_round: assignment.change_round ?? 1,
            extra_work: null,
          })
        }
      >
        Abänderung
      </button>
      {isExtra && (
        <label>
          Zusätzlicher Umfang / Vereinbarung
          <textarea
            required
            minLength={3}
            maxLength={2000}
            disabled={disabled}
            value={assignment.extra_work ?? ""}
            placeholder="Zum Beispiel: 3 zusätzliche Seiten außerhalb des Pakets; Kundenfreigabe vom …"
            onChange={(e) =>
              onChange({ ...assignment, extra_work: e.target.value })
            }
          />
        </label>
      )}
      {isChange && (
        <>
          <label>
            Komplettänderung Nr.
            <input
              required
              type="number"
              min="1"
              max="999"
              value={assignment.change_round ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...assignment,
                  change_round: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="change-request-field">
            Kundenwunsch / Abweichung vom vereinbarten Umfang
            <textarea
              value={assignment.change_request ?? ""}
              required
              minLength={3}
              maxLength={2000}
              disabled={disabled}
              placeholder="Was war vereinbart? Was soll auf Wunsch des Kunden geändert werden? Anlass, Datum und ggf. Verweis auf die Kundenanfrage festhalten."
              onChange={(e) =>
                onChange({
                  ...assignment,
                  correction_round: null,
                  change_request: e.target.value,
                })
              }
            />
          </label>
          <p className="correction-hint">
            {assignmentLabel(
              assignment,
              project?.included_correction_rounds,
              project?.included_change_rounds,
            )}
            . Mehrere Zeiteinträge derselben Änderungsnummer zählen als eine
            Änderung. Enthaltene Korrekturrunden werden nicht verbraucht.
          </p>
        </>
      )}
      {value != null && (
        <>
          <label>
            Korrekturrunde Nr.
            <input
              type="number"
              min="1"
              max="999"
              step="1"
              required
              value={value || ""}
              disabled={disabled}
              list={listId}
              onChange={(e) =>
                onChange({
                  correction_round: Number(e.target.value),
                  change_request: null,
                })
              }
            />
            <datalist id={listId}>
              {rounds.map((n) => (
                <option key={n} value={n}>
                  Runde {n} · bereits erfasst
                </option>
              ))}
            </datalist>
          </label>
          <p className="correction-hint">
            {value > 0
              ? correctionLabel(value, project?.included_correction_rounds)
              : "Bitte eine Rundennummer von 1 bis 999 angeben."}
            <br />
            Mehrere Einträge derselben Runde zählen einmal. Für eine neue Runde
            die nächste Nummer verwenden.
          </p>
        </>
      )}
    </div>
  );
}
export function CorrectionProjectSettings({
  project,
  times,
  mutate,
  busy,
}: {
  project: CorrectionProject;
  times: CorrectionTime[];
  mutate: Mutate;
  busy: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const rounds = usedCorrectionRounds(times, project.id);
  const included = project.included_correction_rounds;
  return (
    <details className="correction-settings">
      <summary>
        Korrekturen, Änderungen & Stundensatz ·{" "}
        {included == null ? "Paketumfang offen" : `${included} im Paket`}
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const v = String(f.get("included_correction_rounds") || "");
          setSaved(
            await mutate("project_limits", {
              id: project.id,
              included_correction_rounds: v === "" ? null : Number(v),
              included_change_rounds:
                f.get("included_change_rounds") === ""
                  ? null
                  : Number(f.get("included_change_rounds")),
              hourly_rate_cents: Math.round(Number(f.get("hourly_rate")) * 100),
            }),
          );
        }}
      >
        <label>
          Im Paket enthaltene Korrekturrunden
          <input
            name="included_correction_rounds"
            type="number"
            min="0"
            max="999"
            step="1"
            defaultValue={included ?? ""}
            placeholder="Noch nicht vereinbart"
            onChange={() => setSaved(false)}
          />
        </label>
        <label>
          Enthaltene Komplettänderungen
          <input
            name="included_change_rounds"
            type="number"
            min="0"
            max="999"
            step="1"
            defaultValue={project.included_change_rounds ?? ""}
            placeholder="Noch nicht vereinbart"
            onChange={() => setSaved(false)}
          />
        </label>
        <label>
          Vereinbarter Stundensatz für Mehrarbeit (netto €)
          <input
            name="hourly_rate"
            type="number"
            min="0"
            max="10000"
            step="0.01"
            required
            defaultValue={(project.hourly_rate_cents ?? 15000) / 100}
            onChange={() => setSaved(false)}
          />
        </label>
        <p className="footnote">
          Individuelle Vereinbarungen haben Vorrang vor dem gespeicherten
          Katalogumfang. Bereits freigegebene Zeiten behalten ihren Stundensatz.
        </p>
        <p className="footnote">
          Leer = noch offen · 0 = keine enthalten. Die ersten angegebenen Runden
          gehören zum Paket. Weitere Runden werden als Zusatzzeit ausgewiesen;
          daraus entsteht keine automatische Abrechnung.
        </p>
        <p>
          {rounds.length} Runde(n) erfasst
          {included != null
            ? ` · ${rounds.filter((n) => n <= included).length} im Paket genutzt · ${rounds.filter((n) => n > included).length} zusätzlich`
            : ""}
        </p>
        <p>
          {usedChangeRounds(times, project.id).length} Komplettänderung(en)
          erfasst
          {project.included_change_rounds != null
            ? ` · ${usedChangeRounds(times, project.id).filter((n) => n <= project.included_change_rounds!).length} im Paket genutzt · ${usedChangeRounds(times, project.id).filter((n) => n > project.included_change_rounds!).length} zusätzlich`
            : " · Kontingent offen"}
        </p>
        <button className="button small outline" disabled={busy}>
          Paketumfang speichern
        </button>
        {saved && <span role="status">Gespeichert.</span>}
      </form>
    </details>
  );
}
export function CorrectionAssignment({
  entry,
  project,
  times,
  mutate,
  busy,
}: {
  entry: CorrectionTime & {
    id: string;
    approved_at: string | null;
    stopped_at: string | null;
  };
  project?: CorrectionProject;
  times: CorrectionTime[];
  mutate: Mutate;
  busy: boolean;
}) {
  const [assignment, setAssignment] = useState<TimeAssignment>({
    correction_round: entry.correction_round ?? null,
    change_request: entry.change_request ?? null,
    change_round: entry.change_round ?? null,
    extra_work: entry.extra_work ?? null,
  });
  const [saved, setSaved] = useState(false);
  if (entry.approved_at || !entry.stopped_at) return null;
  return (
    <details className="correction-assignment">
      <summary>Leistungszuordnung bearbeiten</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaved(
            await mutate("time_assignment", {
              id: entry.id,
              ...assignment,
            }),
          );
        }}
      >
        <CorrectionFields
          project={project}
          times={times}
          assignment={assignment}
          onChange={(v) => {
            setAssignment(v);
            setSaved(false);
          }}
          disabled={busy}
        />
        <button
          className="button small outline"
          disabled={busy || !validTimeAssignment(assignment)}
        >
          Zuordnung speichern
        </button>
        {saved && <span role="status">Gespeichert.</span>}
      </form>
    </details>
  );
}
