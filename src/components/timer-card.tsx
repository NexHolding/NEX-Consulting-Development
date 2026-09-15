"use client";

import { useRef, useState } from "react";
import { Check, LoaderCircle, Play, Square } from "lucide-react";

type TimerCardProps = {
  label: string;
  running: boolean;
  elapsed: string;
  description: string;
  disabled: boolean;
  overdue: boolean;
  onToggle: () => Promise<boolean>;
};

export default function TimerCard({
  label,
  running,
  elapsed,
  description,
  disabled,
  overdue,
  onToggle,
}: TimerCardProps) {
  const [pending, setPending] = useState<"start" | "stop" | null>(null);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  const state = pending || (running ? "running" : saved ? "saved" : "ready");
  const status =
    pending === "stop"
      ? "Speichert …"
      : pending === "start"
        ? "Startet …"
        : running
          ? "Läuft"
          : saved
            ? "Gespeichert"
            : "Bereit";

  async function toggle() {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    const stopping = running;
    setPending(stopping ? "stop" : "start");
    try {
      if (await onToggle()) setSaved(stopping);
    } finally {
      setPending(null);
      inFlight.current = false;
    }
  }

  return (
    <article
      className={`timer timer-control ${running ? "running" : ""}`}
      data-state={state}
      aria-label={label}
    >
      <div className="timer-topline">
        <span className="timer-label">{label}</span>
        <span className="timer-status" role="status" aria-atomic="true">
          <span className="timer-state-mark" aria-hidden="true">
            {state === "saved" ? (
              <Check size={13} />
            ) : (
              <span className="timer-state-dot" />
            )}
          </span>
          {status}
        </span>
      </div>
      <strong className="timer-digits">{elapsed}</strong>
      <p>{description}</p>
      <button
        type="button"
        className={`button timer-action ${running ? "timer-action-stop" : "timer-action-start"}`}
        disabled={disabled || !!pending}
        aria-busy={!!pending}
        onClick={toggle}
      >
        <span
          key={state}
          className={`timer-action-icon ${pending ? "is-pending" : ""}`}
          aria-hidden="true"
        >
          {pending ? (
            <LoaderCircle size={20} />
          ) : running ? (
            <Square size={17} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
        </span>
        <span className="timer-action-copy">
          <span>
            {pending === "stop"
              ? "Wird gespeichert …"
              : pending === "start"
                ? "Wird gestartet …"
                : running
                  ? "Stopp & speichern"
                  : "Zeit starten"}
          </span>
          <small>
            {running || pending === "stop"
              ? "Abschnitt abschließen"
              : "Neuen Abschnitt erfassen"}
          </small>
        </span>
      </button>
      {overdue && (
        <span className="error">
          Timer läuft seit über 8 Stunden. Bitte prüfen.
        </span>
      )}
    </article>
  );
}
