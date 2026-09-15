"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  Globe,
  X,
} from "lucide-react";
import {
  accessServices,
  hostingProviders,
  mailProviders,
  twoFactorOptions,
  approvalOptions,
  type AccessEntry,
  type InfrastructureEntry,
} from "@/lib/access-catalog";
import { withLoading } from "@/lib/loading-state";
async function accessRequest(
  customer_id: string,
  body?: Record<string, unknown>,
  signal?: AbortSignal,
) {
  return withLoading(async () => {
    const response = await fetch(
      body
        ? "/api/customer-access"
        : "/api/customer-access?customer=" + encodeURIComponent(customer_id),
      body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, customer_id }),
            cache: "no-store",
            signal,
          }
        : { cache: "no-store", signal },
    );
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "Anfrage fehlgeschlagen.");
    return result;
  });
}
function AccessCard({
  entry,
  onEdit,
  onDelete,
  disabled,
}: {
  entry: AccessEntry;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [secret, setSecret] = useState<string | null>(null),
    [pending, setPending] = useState(false),
    [copied, setCopied] = useState(""),
    [error, setError] = useState("");
  const generation = useRef(0),
    controller = useRef<AbortController | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useCallback(() => {
    generation.current++;
    controller.current?.abort();
    setSecret(null);
    setPending(false);
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) hide();
    };
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      generation.current++;
      controller.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [hide]);
  useEffect(() => {
    hide();
  }, [entry.updated_at, hide]);
  async function password(purpose: "view" | "copy") {
    controller.current = new AbortController();
    return (
      await accessRequest(
        entry.customer_id,
        { action: "reveal", id: entry.id, purpose },
        controller.current.signal,
      )
    ).password as string;
  }
  async function reveal() {
    if (secret !== null) {
      hide();
      return;
    }
    setError("");
    setPending(true);
    const current = generation.current;
    try {
      const value = await password("view");
      if (current !== generation.current) return;
      setSecret(value);
      timer.current = setTimeout(hide, 30000);
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : "Anzeigen fehlgeschlagen.");
    } finally {
      if (current === generation.current) setPending(false);
    }
  }
  async function copy(kind: "username" | "password") {
    setError("");
    setPending(true);
    const current = generation.current;
    try {
      if (!navigator.clipboard)
        throw Error(
          "Kopieren ist hier nicht verfügbar. Bitte den Zugang über das Auge anzeigen.",
        );
      if (
        kind === "password" &&
        navigator.clipboard.write &&
        typeof ClipboardItem !== "undefined"
      ) {
        const value = password("copy").then((text) => {
          if (current !== generation.current)
            throw Error("Kopieren abgebrochen.");
          return new Blob([text], { type: "text/plain" });
        });
        await navigator.clipboard.write([
          new ClipboardItem({ "text/plain": value }),
        ]);
      } else {
        const value =
          kind === "password" ? await password("copy") : entry.username;
        if (current !== generation.current) return;
        await navigator.clipboard.writeText(value);
      }
      if (current === generation.current) {
        setCopied(kind);
        copyTimer.current = setTimeout(() => setCopied(""), 2000);
      }
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : "Kopieren fehlgeschlagen.");
    } finally {
      if (current === generation.current) setPending(false);
    }
  }
  return (
    <article className="access-card">
      <header>
        <span className="access-icon">
          <KeyRound size={20} />
        </span>
        <div>
          <h3>{entry.service}</h3>
          {entry.label && <p>{entry.label}</p>}
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={`${entry.service} bearbeiten`}
          onClick={() => {
            hide();
            onEdit();
          }}
          disabled={disabled}
        >
          <Pencil size={16} />
        </button>
      </header>
      {entry.login_url && (
        <a
          className="text-link"
          href={entry.login_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Login öffnen ↗
        </a>
      )}
      <div className="access-value">
        <div>
          <small>Benutzername / E-Mail</small>
          <span>{entry.username}</span>
        </div>
        <button
          className="icon-button"
          aria-label="Benutzername kopieren"
          disabled={pending || disabled}
          onClick={() => copy("username")}
        >
          {copied === "username" ? <Check size={17} /> : <Copy size={17} />}
        </button>
      </div>
      <div className="access-value">
        <div>
          <small>Passwort</small>
          <span className={secret === null ? "access-mask" : "access-secret"}>
            {secret === null ? "••••••••••••" : secret}
          </span>
        </div>
        <button
          className="icon-button"
          aria-label={
            secret === null ? "Passwort anzeigen" : "Passwort verbergen"
          }
          aria-pressed={secret !== null}
          disabled={pending || disabled}
          onClick={reveal}
        >
          {secret === null ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button
          className="icon-button"
          aria-label="Passwort kopieren"
          disabled={pending || disabled}
          onClick={() => copy("password")}
        >
          {copied === "password" ? <Check size={17} /> : <Copy size={17} />}
        </button>
      </div>
      <p className="access-copy-status" role="status">
        {copied
          ? "Kopiert."
          : pending
            ? "Wird abgerufen …"
            : secret !== null
              ? "Wird nach 30 Sekunden wieder verdeckt."
              : "Passwort verdeckt"}
      </p>
      <div className="access-tags">
        <span>2FA: {entry.two_factor}</span>
        <span>{entry.approval}</span>
      </div>
      {entry.notes && <p className="preline access-notes">{entry.notes}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button
        className="text-link access-delete"
        disabled={disabled || pending}
        onClick={() => {
          hide();
          onDelete();
        }}
      >
        <Trash2 size={14} /> Zugang entfernen
      </button>
    </article>
  );
}
function Provider({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: string[];
  value?: string;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        list={"providers-" + name}
        defaultValue={value || ""}
        maxLength={120}
      />
      <datalist id={"providers-" + name}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}
export default function CustomerAccess({ customerId }: { customerId: string }) {
  const [data, setData] = useState<{
      credentials: AccessEntry[];
      infrastructure: InfrastructureEntry[];
      configured: boolean;
    } | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{
      kind: "credential" | "infrastructure";
      entry?: AccessEntry | InfrastructureEntry;
    } | null>(null),
    [service, setService] = useState(""),
    [remove, setRemove] = useState<{
      id: string;
      kind: "credential" | "infrastructure";
      name: string;
    } | null>(null);
  const editorRef = useRef<HTMLElement>(null),
    previousFocus = useRef<HTMLElement | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const result = await accessRequest(customerId, undefined, signal);
      setData(result);
    },
    [customerId],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (editor) {
      editorRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      editorRef.current?.querySelector<HTMLElement>("input,select")?.focus();
    }
  }, [editor]);
  function edit(
    kind: "credential" | "infrastructure",
    entry?: AccessEntry | InfrastructureEntry,
  ) {
    previousFocus.current = document.activeElement as HTMLElement;
    setRemove(null);
    setEditor({ kind, entry });
    setService(
      kind === "credential"
        ? (entry as AccessEntry)?.service || Object.values(accessServices)[0][0]
        : "",
    );
    setError("");
    setNotice("");
  }
  function close() {
    setEditor(null);
    previousFocus.current?.focus();
  }
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      if (editor?.kind === "credential") {
        const { password, ...fields } = values;
        await accessRequest(customerId, {
          action: editor.entry ? "update" : "create",
          id: editor.entry?.id,
          fields: {
            ...fields,
            service: service === "__custom" ? values.custom_service : service,
          },
          password,
        });
        (form.elements.namedItem("password") as HTMLInputElement).value = "";
      } else {
        await accessRequest(customerId, {
          action: "infrastructure_save",
          id: editor?.entry?.id,
          fields: {
            ...values,
            smtp_port: values.smtp_port ? Number(values.smtp_port) : null,
            credential_id: values.credential_id || null,
          },
        });
      }
      close();
      setNotice("Gespeichert.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function deleteEntry() {
    if (!remove || busy) return;
    setBusy(true);
    setError("");
    try {
      await accessRequest(customerId, {
        action:
          remove.kind === "credential" ? "delete" : "infrastructure_delete",
        id: remove.id,
      });
      setRemove(null);
      setNotice("Eintrag entfernt.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Entfernen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  const credentials =
    data?.credentials.filter((c) =>
      `${c.service} ${c.label} ${c.username}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    ) || [];
  const account =
    editor?.kind === "credential"
      ? (editor.entry as AccessEntry | undefined)
      : undefined;
  const infra =
    editor?.kind === "infrastructure"
      ? (editor.entry as InfrastructureEntry | undefined)
      : undefined;
  return (
    <div className="customer-access">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ZUGÄNGE & INFRASTRUKTUR</p>
            <h2>Alles für die Zusammenarbeit.</h2>
          </div>
        </div>
        <p>
          Dienste, Login-Daten, Freigaben und Versandkonfiguration für diesen
          Kunden.
        </p>
        <div className="actions">
          <button
            className="button"
            disabled={!data?.configured || busy}
            onClick={() => edit("credential")}
          >
            <Plus size={17} /> Zugang hinterlegen
          </button>
          <button
            className="button outline"
            disabled={!data || busy}
            onClick={() => edit("infrastructure")}
          >
            <Globe size={17} /> Domain & E-Mail ergänzen
          </button>
        </div>
        {data && !data.configured && (
          <p role="status" className="info-box">
            Der verschlüsselte Passwortspeicher muss vor der ersten Nutzung
            eingerichtet werden.
          </p>
        )}
        {!data && !error && <p role="status">Zugänge werden geladen …</p>}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
      {editor && (
        <section ref={editorRef} className="panel access-editor">
          <div className="panel-heading">
            <h2>
              {editor.entry
                ? "Eintrag bearbeiten"
                : editor.kind === "credential"
                  ? "Zugang hinterlegen"
                  : "Domain & E-Mail ergänzen"}
            </h2>
            <button
              className="icon-button"
              aria-label="Bearbeitung schließen"
              disabled={busy}
              onClick={close}
            >
              <X size={18} />
            </button>
          </div>
          <form
            key={editor.kind + (editor.entry?.id || "new")}
            className="access-form"
            onSubmit={save}
            autoComplete="off"
          >
            {editor.kind === "credential" ? (
              <>
                <label>
                  Dienst / Anwendung
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                  >
                    {Object.entries(accessServices).map(([group, services]) => (
                      <optgroup key={group} label={group}>
                        {services.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </optgroup>
                    ))}
                    {account &&
                      !Object.values(accessServices)
                        .flat()
                        .includes(account.service) && (
                        <option>{account.service}</option>
                      )}
                    <option value="__custom">Anderer Dienst …</option>
                  </select>
                </label>
                {service === "__custom" && (
                  <label>
                    Eigener Dienst
                    <input
                      name="custom_service"
                      required
                      minLength={2}
                      maxLength={120}
                    />
                  </label>
                )}
                <label>
                  Bezeichnung / Verwendung
                  <input
                    name="label"
                    defaultValue={account?.label || ""}
                    maxLength={160}
                    placeholder="z. B. Hauptkonto oder Kundenwebseite"
                  />
                </label>
                <label className="wide">
                  Login-Adresse
                  <input
                    name="login_url"
                    type="url"
                    defaultValue={account?.login_url || ""}
                    maxLength={500}
                    placeholder="https://…"
                  />
                </label>
                <label>
                  Benutzername / E-Mail *
                  <input
                    name="username"
                    defaultValue={account?.username || ""}
                    required
                    maxLength={320}
                    autoComplete="off"
                  />
                </label>
                <label>
                  {account
                    ? "Neues Passwort (leer = unverändert)"
                    : "Passwort *"}
                  <input
                    name="password"
                    type="password"
                    required={!account}
                    maxLength={4096}
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                </label>
                <label>
                  Zwei-Faktor-Authentifizierung
                  <select
                    name="two_factor"
                    defaultValue={account?.two_factor || "Unbekannt"}
                  >
                    {twoFactorOptions.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Kunden- / Postfachfreigabe
                  <select
                    name="approval"
                    defaultValue={account?.approval || "Unbekannt"}
                  >
                    {approvalOptions.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  Zusatzinformationen
                  <textarea
                    name="notes"
                    rows={3}
                    maxLength={2000}
                    defaultValue={account?.notes || ""}
                    placeholder="Wer bestätigt die Anmeldung? Welches Postfach erhält den Code?"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="wide">
                  Domain *
                  <input
                    name="domain"
                    required
                    minLength={3}
                    maxLength={253}
                    defaultValue={infra?.domain || ""}
                    placeholder="beispiel.de"
                  />
                </label>
                <Provider
                  name="registrar"
                  label="Domainregistrar"
                  options={hostingProviders}
                  value={infra?.registrar}
                />
                <Provider
                  name="dns_provider"
                  label="DNS-Anbieter"
                  options={hostingProviders}
                  value={infra?.dns_provider}
                />
                <Provider
                  name="hosting_provider"
                  label="Webhosting / Deployment"
                  options={hostingProviders}
                  value={infra?.hosting_provider}
                />
                <Provider
                  name="email_provider"
                  label="E-Mail- / Postfachanbieter"
                  options={mailProviders}
                  value={infra?.email_provider}
                />
                <Provider
                  name="sending_provider"
                  label="Versanddienst / SMTP-Anbieter"
                  options={mailProviders}
                  value={infra?.sending_provider}
                />
                <label>
                  Absendername
                  <input
                    name="from_name"
                    maxLength={160}
                    defaultValue={infra?.from_name || ""}
                  />
                </label>
                <label>
                  Absender-E-Mail für Postversand
                  <input
                    name="from_email"
                    type="email"
                    maxLength={200}
                    defaultValue={infra?.from_email || ""}
                  />
                </label>
                <label>
                  Antwortadresse (Reply-To)
                  <input
                    name="reply_to_email"
                    type="email"
                    maxLength={200}
                    defaultValue={infra?.reply_to_email || ""}
                  />
                </label>
                <label>
                  SMTP-Server
                  <input
                    name="smtp_host"
                    maxLength={253}
                    defaultValue={infra?.smtp_host || ""}
                  />
                </label>
                <label>
                  SMTP-Port
                  <input
                    name="smtp_port"
                    type="number"
                    min={1}
                    max={65535}
                    defaultValue={infra?.smtp_port ?? ""}
                  />
                </label>
                <label>
                  SMTP-Verschlüsselung
                  <select
                    name="smtp_security"
                    defaultValue={infra?.smtp_security || "Unbekannt"}
                  >
                    {["Unbekannt", "STARTTLS", "TLS", "Keine"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Zugehöriger Zugang
                  <select
                    name="credential_id"
                    defaultValue={infra?.credential_id || ""}
                  >
                    <option value="">Noch nicht zugeordnet</option>
                    {data?.credentials.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.service} · {c.label || c.username}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  Zusatzinformationen
                  <textarea
                    name="notes"
                    rows={3}
                    maxLength={2000}
                    defaultValue={infra?.notes || ""}
                    placeholder="z. B. Freigabe des Absenders, SPF/DKIM-Status oder Ansprechpartner"
                  />
                </label>
              </>
            )}
            <div className="wide actions">
              <button className="button" disabled={busy}>
                {busy ? "Wird gespeichert …" : "Speichern"}
              </button>
              <button
                className="button outline"
                type="button"
                onClick={close}
                disabled={busy}
              >
                Abbrechen
              </button>
            </div>
          </form>
        </section>
      )}
      {remove && (
        <section className="panel access-confirm" role="alert">
          <p>
            „{remove.name}“ wirklich entfernen?
            {remove.kind === "credential"
              ? " Das Passwort wird gelöscht; Domainzuordnungen werden aufgehoben."
              : ""}
          </p>
          <div className="actions">
            <button className="button" onClick={deleteEntry} disabled={busy}>
              Jetzt entfernen
            </button>
            <button
              className="button outline"
              onClick={() => setRemove(null)}
              disabled={busy}
            >
              Behalten
            </button>
          </div>
        </section>
      )}
      {data && (
        <>
          <section className="panel">
            <div className="panel-heading">
              <h2>
                Zugänge <span className="badge">{data.credentials.length}</span>
              </h2>
              <label className="access-search">
                Dienst oder Benutzer suchen
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="search"
                />
              </label>
            </div>
            <div className="access-grid">
              {credentials.map((entry) => (
                <AccessCard
                  key={entry.id}
                  entry={entry}
                  disabled={busy}
                  onEdit={() => edit("credential", entry)}
                  onDelete={() =>
                    setRemove({
                      id: entry.id,
                      kind: "credential",
                      name: entry.service,
                    })
                  }
                />
              ))}
            </div>
            {!credentials.length && (
              <p>
                {query
                  ? "Keine passenden Zugänge gefunden."
                  : "Noch keine Zugänge hinterlegt."}
              </p>
            )}
          </section>
          <section className="panel">
            <h2>Domains & E-Mail-Versand</h2>
            <div className="infrastructure-grid">
              {data.infrastructure.map((row) => (
                <article className="access-card" key={row.id}>
                  <header>
                    <span className="access-icon">
                      <Globe size={20} />
                    </span>
                    <h3>{row.domain}</h3>
                    <button
                      className="icon-button"
                      aria-label={`${row.domain} bearbeiten`}
                      disabled={busy}
                      onClick={() => edit("infrastructure", row)}
                    >
                      <Pencil size={16} />
                    </button>
                  </header>
                  <dl>
                    {[
                      ["Domainregistrar", row.registrar],
                      ["DNS", row.dns_provider],
                      ["Webhosting", row.hosting_provider],
                      ["Postfächer", row.email_provider],
                      ["Versanddienst", row.sending_provider],
                      [
                        "Absender",
                        [row.from_name, row.from_email]
                          .filter(Boolean)
                          .join(" · "),
                      ],
                      ["Antwortadresse", row.reply_to_email],
                      [
                        "SMTP",
                        [
                          row.smtp_host,
                          row.smtp_port,
                          row.smtp_security !== "Unbekannt"
                            ? row.smtp_security
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · "),
                      ],
                      [
                        "Zugang",
                        data.credentials.find((c) => c.id === row.credential_id)
                          ?.service,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value || "Noch offen"}</dd>
                      </div>
                    ))}
                  </dl>
                  {row.notes && <p className="preline">{row.notes}</p>}
                  <button
                    className="text-link access-delete"
                    disabled={busy}
                    onClick={() =>
                      setRemove({
                        id: row.id,
                        kind: "infrastructure",
                        name: row.domain,
                      })
                    }
                  >
                    <Trash2 size={14} /> Eintrag entfernen
                  </button>
                </article>
              ))}
            </div>
            {!data.infrastructure.length && (
              <p>Noch keine Domain- oder Versandkonfiguration hinterlegt.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
