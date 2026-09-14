"use client";
import { useState, type ReactNode } from "react";
import { Brand } from "./brand";
import { useRouter } from "next/navigation";
import { display, type Row } from "@/lib/portal-model";
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  default?: unknown;
};
export function Editor({
  fields,
  initial = {},
  submit,
  label = "Speichern",
}: {
  fields: Field[];
  initial?: Partial<Row>;
  submit: (p: Record<string, unknown>) => Promise<void>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <form
      className="portal-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const data = new FormData(f);
        const values = Object.fromEntries(
          fields.map((x) => [
            x.key,
            x.type === "checkbox"
              ? data.has(x.key)
              : x.type === "number"
                ? Number(data.get(x.key))
                : x.type === "ref"
                  ? data.get(x.key) || null
                  : x.type === "date"
                    ? data.get(x.key) || null
                    : data.get(x.key),
          ]),
        );
        setBusy(true);
        setError("");
        setNotice("");
        try {
          await submit(values);
          setNotice("Gespeichert.");
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((f) => (
        <label key={f.key} className={f.type === "textarea" ? "wide" : ""}>
          {f.label}
          {f.type === "checkbox" ? (
            <input
              type="checkbox"
              name={f.key}
              defaultChecked={Boolean(initial[f.key] ?? f.default)}
            />
          ) : f.options ? (
            <select
              aria-label={f.label}
              name={f.key}
              required={f.required}
              defaultValue={display(initial[f.key] ?? f.default)}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              name={f.key}
              rows={4}
              required={f.required}
              defaultValue={display(initial[f.key] ?? f.default)}
            />
          ) : (
            <input
              name={f.key}
              type={f.type || "text"}
              required={f.required}
              min={f.type === "number" ? 0 : undefined}
              max={f.key === "progress" ? 100 : undefined}
              minLength={f.type === "password" ? 12 : undefined}
              autoComplete={f.type === "password" ? "new-password" : undefined}
              defaultValue={display(initial[f.key] ?? f.default)}
            />
          )}
        </label>
      ))}
      <div className="wide">
        <button className="button small" disabled={busy}>
          {busy ? "Wird gespeichert …" : label}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
      </div>
    </form>
  );
}
export function Shell({
  admin = false,
  children,
}: {
  admin?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Brand href={admin ? "/crm" : "/portal"} className="portal-brand" />
        <span>{admin ? "Portalverwaltung" : "Ihr Kundenportal"}</span>
        <button
          className="text-link"
          onClick={async () => {
            const r = await fetch("/api/auth", { method: "DELETE" });
            if (r.ok) {
              router.replace("/login");
              router.refresh();
            }
          }}
        >
          Abmelden
        </button>
      </header>
      {children}
    </div>
  );
}
export function Blank({ children }: { children: ReactNode }) {
  return <p className="portal-empty">{children}</p>;
}
