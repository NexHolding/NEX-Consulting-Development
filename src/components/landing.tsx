"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Globe2,
  Workflow,
  BrainCircuit,
  PanelsTopLeft,
  CalendarDays,
  ShieldCheck,
  Plus,
  Minus,
} from "lucide-react";
import { packages, care, projects } from "@/lib/content";
const services = [
  {
    icon: Globe2,
    title: "Websites mit klarem Ziel.",
    text: "Ein Auftritt, der Ihr Angebot verständlich macht und Interessenten zum nächsten Schritt führt.",
  },
  {
    icon: Workflow,
    title: "Abläufe, die mitdenken.",
    text: "Anfragen, Termine und Datenübergaben. Wir verbinden wiederkehrende Schritte in Ihrem Alltag.",
  },
  {
    icon: BrainCircuit,
    title: "KI mit einer Aufgabe.",
    text: "Informationen strukturieren, Anfragen zusammenfassen und Inhalte vorbereiten. Mit sinnvoller menschlicher Kontrolle.",
  },
  {
    icon: PanelsTopLeft,
    title: "Ihr CRM. Ihre Abläufe.",
    text: "Kunden, Projekte und Aufgaben an einem Ort. Entwickelt für die Arbeit Ihres Teams.",
  },
  {
    icon: CalendarDays,
    title: "Einfach besser buchen.",
    text: "Von der Terminvereinbarung bis zum Buchungssystem: ein durchgängiger Ablauf für Ihr Angebot.",
  },
  {
    icon: ShieldCheck,
    title: "Auch nach dem Start da.",
    text: "Technische Pflege, vereinbarte Änderungen und persönliche Betreuung. Monatlich planbar.",
  },
];
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Next Consulting Startseite">
      <span className="brand-symbol">
        n<span>↗</span>
      </span>
      <span>
        next<span className="brand-small">CONSULTING</span>
      </span>
    </Link>
  );
}
export default function Landing() {
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState("Noch offen");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);
  async function contact(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSuccess(true);
      setNotice(
        "Vielen Dank. Ihre Anfrage ist gespeichert. Wir melden uns, um die nächsten Schritte zu besprechen.",
      );
      form.reset();
    } catch (e) {
      setSuccess(false);
      setNotice(e instanceof Error ? e.message : "Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }
  function choose(name: string) {
    setSelected(name);
    document.getElementById("kontakt")?.scrollIntoView({ behavior: "smooth" });
  }
  return (
    <>
      <div className="preview-strip">
        DESIGNVORSCHAU{" "}
        <span>Next Consulting · Ihr nächster Schritt beginnt hier.</span>
      </div>
      <header className="site-header wrap">
        <Brand />
        <nav className={menu ? "open" : ""}>
          <a onClick={() => setMenu(false)} href="#leistungen">
            Leistungen
          </a>
          <a onClick={() => setMenu(false)} href="#projekte">
            Projekte
          </a>
          <a onClick={() => setMenu(false)} href="#pakete">
            Pakete
          </a>
          <a onClick={() => setMenu(false)} href="#betreuung">
            Betreuung
          </a>
          <Link href="/login">
            Login <ArrowUpRight size={14} />
          </Link>
        </nav>
        <a href="#kontakt" className="button small header-cta">
          Projekt besprechen <ArrowUpRight size={15} />
        </a>
        <button
          className="menu-toggle ghost"
          onClick={() => setMenu(!menu)}
          aria-label="Menü öffnen"
          aria-expanded={menu}
        >
          {menu ? <Minus /> : <Plus />}
        </button>
      </header>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="dot" />
              DIGITALE LÖSUNGEN. PERSÖNLICH ENTWICKELT.
            </p>
            <h1>
              Ihre nächste
              <br />
              Website
              <br />
              <em>kann mehr.</em>
            </h1>
            <p className="lead">
              Wir verbinden Ihren digitalen Auftritt mit den Abläufen dahinter.
              Websites, Automatisierung, KI und CRM — passend zu Ihrem
              Unternehmen.
            </p>
            <div className="actions">
              <a href="#kontakt" className="button">
                Lassen Sie uns starten <ArrowUpRight size={18} />
              </a>
              <a href="#projekte" className="text-link">
                Unsere Arbeit entdecken <ArrowRight size={17} />
              </a>
            </div>
            <p className="hero-note">
              Individuell entwickelt. Verständlich erklärt. Persönlich betreut.
            </p>
          </div>
          <div className="hero-system">
            <div className="system-top">
              <span>VON DER ANFRAGE ZUM ABSCHLUSS</span>
              <span className="live-label">
                <span className="dot" />
                Alles verbunden
              </span>
            </div>
            <div className="system-main">
              <span className="system-icon">
                <Globe2 size={34} />
              </span>
              <div>
                <small>DER ANFANG</small>
                <h3>Ihre Website.</h3>
                <p>Der erste Kontakt. Ein guter Eindruck.</p>
              </div>
              <ArrowUpRight className="gold" />
            </div>
            <div className="system-flow">
              <span />
              <p>Eine Anfrage. Viele Möglichkeiten.</p>
              <span />
            </div>
            <div className="system-grid">
              <div>
                <Workflow />
                <strong>Automatisierung</strong>
                <span>Weniger Handgriffe.</span>
              </div>
              <div>
                <BrainCircuit />
                <strong>Künstliche Intelligenz</strong>
                <span>Mehr Unterstützung.</span>
              </div>
            </div>
            <div className="system-flow">
              <span />
              <p>Informationen am richtigen Ort.</p>
              <span />
            </div>
            <div className="system-bottom">
              <PanelsTopLeft size={25} />
              <div>
                <small>IHR EIGENES CRM</small>
                <strong>Kunden. Projekte. Überblick.</strong>
              </div>
              <span className="round-check">
                <Check size={19} />
              </span>
            </div>
            <p className="system-caption">
              Ein durchdachter Ablauf statt einzelner Insellösungen.
            </p>
          </div>
        </section>
        <div className="word-band">
          <div className="wrap">
            <span>STRATEGIE</span>
            <i>✦</i>
            <span>DESIGN</span>
            <i>✦</i>
            <span>ENTWICKLUNG</span>
            <i>✦</i>
            <span>AUTOMATISIERUNG</span>
            <i>✦</i>
            <span>BETREUUNG</span>
          </div>
        </div>
        <section id="leistungen" className="section wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / WAS WIR FÜR SIE TUN</p>
              <h2>
                Ein guter Auftritt
                <br />
                ist <em>der Anfang.</em>
              </h2>
            </div>
            <p>
              Wir denken Ihre Website weiter. Damit aus einem schönen Auftritt
              ein Werkzeug wird, das Ihr Unternehmen im Alltag unterstützt.
            </p>
          </div>
          <div className="service-grid">
            {services.map(({ icon: Icon, title, text }, i) => (
              <article key={title}>
                <div className="service-top">
                  <Icon size={26} />
                  <small>0{i + 1}</small>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="projekte" className="section projects-section">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">02 / AUS UNSERER ARBEIT</p>
                <h2>
                  Ideen werden
                  <br />
                  <em>digitale Realität.</em>
                </h2>
              </div>
              <p>
                Serviceplattformen, individuelle Websites und Buchungslösungen.
                Ein erster Einblick in unsere Projektwelt.
              </p>
            </div>
            <div className="portfolio-grid">
              {projects.map((p, i) => (
                <article className={"portfolio p" + i} key={p.name}>
                  <div className="portfolio-art">
                    <span>{p.type}</span>
                    <h3>{p.name}</h3>
                    <div className="portfolio-tags">
                      {p.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    <span className="portfolio-number">0{i + 1}</span>
                  </div>
                  <div className="portfolio-copy">
                    <span className="subtle-status">{p.status}</span>
                    <p>{p.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="footnote">
              Portfolio-Vorschau: Projekttexte und Bildmaterial werden vor der
              öffentlichen Veröffentlichung final abgestimmt.
            </p>
          </div>
        </section>
        <section id="pakete" className="section wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 / KLARER UMFANG. KLARER EINSTIEG.</p>
              <h2>
                Große Möglichkeiten.
                <br />
                <em>Ihr passender Start.</em>
              </h2>
            </div>
            <p>
              Von der ersten Website bis zur eigenen Plattform. Wir definieren
              gemeinsam, was Ihr Unternehmen wirklich braucht.
            </p>
          </div>
          <div className="pricing-grid">
            {packages.map((p, i) => (
              <article
                className={"price-card " + (i === 1 ? "featured" : "")}
                key={p.name}
              >
                {i === 1 && (
                  <span className="featured-label">WEBSITE + CRM</span>
                )}
                <p className="eyebrow">{p.tag}</p>
                <h3>{p.name}</h3>
                <p>{p.text}</p>
                <div className="price">
                  {p.price ? (
                    <>
                      <small>ab</small> {p.price}
                      <span> €</span>
                    </>
                  ) : (
                    <span className="request-price">Auf Anfrage</span>
                  )}
                </div>
                <small className="price-sub">
                  {p.price
                    ? "einmalige Entwicklung · netto"
                    : "individuell nach Projektumfang"}
                </small>
                <button
                  className={"button " + (i === 1 ? "" : "outline")}
                  onClick={() => choose(p.name)}
                >
                  {p.name === "Enterprise"
                    ? "Projekt besprechen"
                    : p.name + " planen"}
                  <ArrowUpRight size={17} />
                </button>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}>
                      <Check size={16} />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="footnote">
            Alle Preise zzgl. gesetzlicher Umsatzsteuer. Verbindlicher Umfang
            nach Projektaufnahme. Hosting, Softwarelizenzen und Verbrauchskosten
            separat. Ein vollständiges Unternehmenssystem wird individuell
            kalkuliert.
          </p>
        </section>
        <section id="betreuung" className="section care-section">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">04 / WIR BLEIBEN AN IHRER SEITE</p>
                <h2>
                  Online bleiben.
                  <br />
                  <em>Weiterkommen.</em>
                </h2>
              </div>
              <p>
                Technische Pflege und planbare Anpassungen nach dem Start. Mit
                festen Kontingenten und einem direkten Ansprechpartner.
              </p>
            </div>
            <div className="care-grid">
              {care.map((p) => (
                <article key={p.name}>
                  <h3>{p.name}</h3>
                  <p>{p.text}</p>
                  <div className="price">
                    {p.name === "Care Dedicated" && <small>ab </small>}
                    {p.price}
                    <span> €</span>
                    <small> / Monat</small>
                  </div>
                  <ul>
                    <li>
                      <Check size={15} />
                      Bis zu {p.changes} Änderungsaufträge
                    </li>
                    <li>
                      <Check size={15} />
                      {p.hours} gemeinsames Änderungsbudget
                    </li>
                    <li>
                      <Check size={15} />
                      Rückmeldung in {p.response}
                    </li>
                    <li>
                      <Check size={15} />
                      Monitoring & technische Pflege
                    </li>
                  </ul>
                  <button
                    className="text-link"
                    onClick={() => choose("Noch offen")}
                  >
                    Betreuung besprechen <ArrowRight size={16} />
                  </button>
                </article>
              ))}
            </div>
            <p className="footnote">
              Netto, zzgl. Anbietergebühren. Auftragsanzahl und Gesamtzeit
              gelten gemeinsam. Zusätzliche Arbeiten nach Freigabe: 140
              €/Stunde. Rückmeldung während der Servicezeiten Mo–Fr, 9–17 Uhr;
              keine garantierte Behebungszeit. Details werden im Angebot
              vereinbart.
            </p>
          </div>
        </section>
        <section className="section wrap">
          <p className="eyebrow">05 / GEMEINSAM ZUM ERGEBNIS</p>
          <h2>
            Ein klarer Weg.
            <br />
            <em>Von Anfang an.</em>
          </h2>
          <div className="steps">
            {[
              [
                "Verstehen",
                "Wir sprechen über Ihr Angebot, Ihre Kunden und Ihre Abläufe.",
              ],
              [
                "Planen",
                "Sie erhalten einen klaren Umfang, ein Angebot und nachvollziehbare Meilensteine.",
              ],
              [
                "Entwickeln",
                "Sie sehen den Fortschritt. Wir setzen um und stimmen uns gezielt mit Ihnen ab.",
              ],
              [
                "Begleiten",
                "Nach Prüfung und Freigabe geht Ihr Projekt online. Wir bleiben an Ihrer Seite.",
              ],
            ].map(([h, t], i) => (
              <div key={h}>
                <span>0{i + 1}</span>
                <h3>{h}</h3>
                <p>{t}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="kontakt" className="section wrap contact-section">
          <div>
            <p className="eyebrow">DER NÄCHSTE SCHRITT</p>
            <h2>
              Was soll Ihr
              <br />
              Unternehmen
              <br />
              <em>als Nächstes können?</em>
            </h2>
            <p className="lead">
              Erzählen Sie uns von Ihrer Idee. Wir klären gemeinsam, welcher Weg
              dazu passt.
            </p>
            <p className="hero-note">
              Für eine erste Einschätzung brauchen Sie kein fertiges
              Pflichtenheft.
            </p>
          </div>
          <form onSubmit={contact} className="contact-form">
            <div className="form-pair">
              <label>
                Ihr Name
                <input
                  required
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={160}
                />
              </label>
              <label>
                Unternehmen
                <input
                  name="company"
                  autoComplete="organization"
                  maxLength={160}
                />
              </label>
            </div>
            <label>
              Geschäftliche E-Mail
              <input required name="email" type="email" autoComplete="email" />
            </label>
            <label>
              Was interessiert Sie?
              <select
                name="package"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {["Noch offen", "Launch", "Business", "Enterprise"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Ihr Vorhaben
              <textarea
                name="message"
                required
                minLength={15}
                maxLength={5000}
                rows={4}
                placeholder="Was möchten Sie verändern oder aufbauen?"
              />
            </label>
            <label className="honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <p className="footnote">
              Vorschau: Ihre Anfrage wird im Next-Consulting-CRM gespeichert.
              Bitte noch keine sensiblen Projektdaten übermitteln.
            </p>
            <button className="button" disabled={pending}>
              {pending ? "Wird gespeichert …" : "Projektanfrage senden"}
              <ArrowUpRight size={18} />
            </button>
            {notice && (
              <p role="status" className={success ? "success" : "error"}>
                {notice}
              </p>
            )}
          </form>
        </section>
        <section className="section wrap faq">
          <p className="eyebrow">GUT ZU WISSEN</p>
          {[
            [
              "Brauchen wir sofort ein eigenes CRM?",
              "Nicht immer. Oft reicht es, Ihre Website mit vorhandenen Werkzeugen zu verbinden. Ein eigenes CRM lohnt sich, wenn Standardlösungen Ihre Abläufe nicht ausreichend abbilden.",
            ],
            [
              "Können wir später erweitern?",
              "Ja. Absehbare nächste Schritte berücksichtigen wir in der Planung. Neue Funktionen bieten wir mit einem eigenen Leistungsumfang an.",
            ],
            [
              "Sind KI- und Softwarekosten enthalten?",
              "Die vereinbarte Einrichtung ist Teil des Projektangebots. Laufende Anbieter- und Verbrauchskosten werden gesondert ausgewiesen.",
            ],
            [
              "Wie lange dauert die Umsetzung?",
              "Das hängt von Funktionen, Schnittstellen und verfügbaren Inhalten ab. Den verbindlichen Zeitplan legen wir nach der Projektaufnahme gemeinsam fest.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </main>
      <footer className="wrap site-footer">
        <Brand />
        <p>Digitale Lösungen. Persönlich entwickelt.</p>
        <Link href="/login">
          Mitarbeiterlogin <ArrowUpRight size={14} />
        </Link>
        <small>
          © {new Date().getFullYear()} Next Consulting · Interne Vorschau, noch
          kein öffentlicher Unternehmensauftritt.
        </small>
      </footer>
    </>
  );
}
