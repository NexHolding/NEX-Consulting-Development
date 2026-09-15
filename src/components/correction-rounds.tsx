"use client";
import { useId, useState } from "react";
import {
  correctionLabel,
  usedCorrectionRounds,
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
  const rounds = project ? usedCorrectionRounds(times, project.id) : [];
  return (
    <div className="correction-fields">
      <label>
        Leistungszuordnung
        <select
          disabled={disabled || !project}
          value={isChange ? "change" : value == null ? "regular" : "correction"}
          onChange={(e) =>
            onChange(
              e.target.value === "change"
                ? { correction_round: null, change_request: "" }
                : {
                    correction_round:
                      e.target.value === "regular" ? null : rounds.at(-1) || 1,
                    change_request: null,
                  },
            )
          }
        >
          <option value="regular">Reguläre Projektarbeit</option>
          <option value="correction">Korrekturrunde</option>
          <option value="change">Abänderung durch Kunden</option>
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
          })
        }
      >
        Abänderung
      </button>
      {isChange && (
        <>
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
                  correction_round: null,
                  change_request: e.target.value,
                })
              }
            />
          </label>
          <p className="correction-hint">
            Außerhalb des normalen Projektumfangs. Wird separat dokumentiert und
            zur gesonderten Abrechnung vorgemerkt. Enthaltene Korrekturrunden
            werden nicht verbraucht.
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
        Korrekturrunden ·{" "}
        {included == null ? "Paketumfang offen" : `${included} im Paket`}
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const v = String(f.get("included_correction_rounds") || "");
          setSaved(
            await mutate("correction_settings", {
              id: project.id,
              included_correction_rounds: v === "" ? null : Number(v),
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
