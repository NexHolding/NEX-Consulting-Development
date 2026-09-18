"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";
import { CorrectionFields } from "./correction-rounds";
import {
  validTimeAssignment,
  type CorrectionProject,
  type TimeAssignment,
} from "@/lib/correction-rounds";
import { berlinDateTime, berlinInputToIso } from "@/lib/time-edit";
import { timeDuration, type ReportTime } from "@/lib/time-report";
type Project = CorrectionProject & { name: string; status?: string };
type Mutate = (
  action: string,
  payload: Record<string, unknown>,
  onError?: (message: string) => void,
) => Promise<boolean>;
export default function TimeEntryEditor(props: {
  entry: ReportTime;
  projects: Project[];
  times: ReportTime[];
  mutate: Mutate;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (props.entry.invoiced)
    return (
      <small className="time-edit-locked">
        Abgerechnet · Eintrag geschützt
      </small>
    );
  return (
    <>
      <button
        type="button"
        className="button small outline time-edit-button"
        disabled={props.busy}
        onClick={() => setOpen(true)}
      >
        <Pencil size={14} /> Eintrag bearbeiten
      </button>
      {open &&
        createPortal(
          <EditDialog {...props} close={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}
function EditDialog({
  entry,
  projects,
  times,
  mutate,
  close,
}: {
  entry: ReportTime;
  projects: Project[];
  times: ReportTime[];
  mutate: Mutate;
  close: () => void;
  busy: boolean;
}) {
  // Freeze the version and original timestamps for this editing session. Background
  // refreshes must not silently replace unsaved input or bypass conflict detection.
  const [original] = useState(entry);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [project, setProject] = useState(original.project_id);
  const [start, setStart] = useState(berlinDateTime(original.started_at));
  const [stop, setStop] = useState(
    original.stopped_at ? berlinDateTime(original.stopped_at) : "",
  );
  const [assignment, setAssignment] = useState<TimeAssignment>({
    correction_round: original.correction_round ?? null,
    change_request: original.change_request ?? null,
    change_round: original.change_round ?? null,
    extra_work: original.extra_work ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const node = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    node.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  let preview = "Beginn und Ende angeben";
  try {
    if (stop) {
      const seconds =
        (Date.parse(berlinInputToIso(stop, original.stopped_at)) -
          Date.parse(berlinInputToIso(start, original.started_at))) /
        1000;
      preview =
        seconds > 0
          ? timeDuration(Math.floor(seconds))
          : "Ende muss nach Beginn liegen";
    }
  } catch {
    preview = "Datum und Uhrzeit prüfen";
  }
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const started_at = berlinInputToIso(start, original.started_at),
        stopped_at = berlinInputToIso(stop, original.stopped_at);
      const duration = Date.parse(stopped_at) - Date.parse(started_at);
      if (
        duration <= 0 ||
        duration > 86400000 ||
        Date.parse(stopped_at) > Date.now()
      )
        throw Error(
          "Bitte einen vergangenen Zeitraum von höchstens 24 Stunden angeben.",
        );
      setSaving(true);
      const saved = await mutate(
        "time_edit",
        {
          id: original.id,
          version: original.version ?? 0,
          project_id: project,
          kind: form.get("kind"),
          category: form.get("category"),
          description: form.get("description"),
          reason: form.get("reason"),
          started_at,
          stopped_at,
          ...assignment,
        },
        setError,
      );
      if (saved) close();
      else
        setError(
          (current) =>
            current ||
            "Nicht gespeichert. Bitte Angaben prüfen und gegebenenfalls den Eintrag neu öffnen.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung nicht gespeichert.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="time-edit-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) close();
      }}
    >
      <header>
        <div>
          <p className="eyebrow">ZEITERFASSUNG · KORREKTUR</p>
          <h2 id={titleId}>Zeiteintrag bearbeiten</h2>
        </div>
        <button
          type="button"
          aria-label="Bearbeitung schließen"
          className="icon-button"
          disabled={saving}
          onClick={close}
        >
          <X size={20} />
        </button>
      </header>
      <form onSubmit={save}>
        <p className="time-edit-note">
          Datum und Uhrzeit in <strong>Europe/Berlin</strong>. Änderungen werden
          mit Begründung protokolliert.
        </p>
        {!original.stopped_at && (
          <p className="time-edit-notice">
            Dieser Timer läuft noch. Mit dem tatsächlichen Ende wird er
            rückwirkend gestoppt.
          </p>
        )}
        {original.approved_at && (
          <p className="time-edit-notice">
            Beim Speichern wird die bisherige Freigabe aufgehoben. Der
            korrigierte Eintrag muss anschließend erneut zur Abrechnung
            freigegeben werden.
          </p>
        )}
        <fieldset disabled={saving}>
          <label>
            Projekt
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              required
            >
              {projects
                .filter(
                  (p) =>
                    p.status !== "Archiviert" || p.id === original.project_id,
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.status === "Archiviert" ? " · archiviert" : ""}
                  </option>
                ))}
            </select>
          </label>
          <div className="time-edit-grid">
            <label>
              Beginn
              <input
                type="datetime-local"
                required
                step="1"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Ende
              <input
                type="datetime-local"
                required
                step="1"
                value={stop}
                onChange={(e) => setStop(e.target.value)}
              />
            </label>
          </div>
          <div className="time-edit-duration">
            <span>Korrigierte Dauer</span>
            <strong aria-live="polite">{preview}</strong>
          </div>
          <div className="time-edit-grid">
            <label>
              Zeitart
              <select name="kind" defaultValue={original.kind}>
                <option value="internal">Intern</option>
                <option value="external">Extern</option>
              </select>
            </label>
            <label>
              Kategorie
              <select name="category" defaultValue={original.category}>
                <option value="active">Aktive Leistung</option>
                <option value="processing">Betreute Verarbeitung</option>
                <option value="waiting">Vereinbarte Wartezeit</option>
                <option value="break">Nicht abrechenbare Pause</option>
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
              defaultValue={original.description}
            />
          </label>
          <CorrectionFields
            project={projects.find((p) => p.id === project)}
            times={times}
            assignment={assignment}
            onChange={setAssignment}
            disabled={saving}
          />
          <label>
            Grund der Änderung
            <textarea
              name="reason"
              required
              minLength={3}
              maxLength={1000}
              placeholder="Zum Beispiel: Timer nicht gestoppt; tatsächliches Arbeitsende war 18:45 Uhr."
            />
          </label>
        </fieldset>
        {error && (
          <p className="time-edit-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="button outline"
            disabled={saving}
            onClick={close}
          >
            Abbrechen
          </button>
          <button
            className="button"
            disabled={saving || !validTimeAssignment(assignment)}
          >
            {saving ? "Wird gespeichert …" : "Änderungen speichern"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
