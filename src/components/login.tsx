"use client";
import { withLoading } from "@/lib/loading-state";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "./app-link";
import { Brand } from "./brand";
import { ArrowUpRight, LockKeyhole, ArrowLeft } from "lucide-react";
export default function Login() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="login-page">
      <Link className="back-link" href="/">
        <ArrowLeft size={16} />
        Zur Website
      </Link>
      <section className="login-story">
        <p className="eyebrow">NEX CONSULTING / WORKSPACE</p>
        <h1>
          Alles im Blick.
          <br />
          <em>Mehr bewegen.</em>
        </h1>
        <p>
          Ihr Auftrag, Ihr Kontakt, Ihr nächster Schritt.
          <br />
          Ein Ort für die Arbeit dahinter.
        </p>
      </section>
      <section className="login-panel">
        <Brand className="login-brand" />
        <div className="lock-mark">
          <LockKeyhole />
        </div>
        <p className="eyebrow">GESCHÜTZTER ZUGANG</p>
        <h2>Willkommen zurück.</h2>
        <p>Melden Sie sich in Ihrem Workspace an.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError("");
            const data = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const [r, d] = await withLoading(async () => {
                const r = await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                return [r, await r.json()] as const;
              });
              if (!r.ok) throw new Error(d.error);
              router.replace(
                ["/portal", "/crm/portal"].includes(d.redirect)
                  ? d.redirect
                  : "/crm",
              );
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Anmeldung fehlgeschlagen.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            Benutzername
            <input
              name="username"
              required
              autoComplete="username"
              maxLength={80}
            />
          </label>
          <label>
            Passwort
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              maxLength={256}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={pending}>
            {pending ? "Anmeldung wird geprüft …" : "Workspace öffnen"}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <small>Zugang für freigeschaltete Kunden und Mitarbeiter.</small>
      </section>
    </main>
  );
}
