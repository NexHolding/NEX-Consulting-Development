"use client";
import Link from "./app-link";
import {
  ArrowUpRight,
  Layers3,
  SlidersHorizontal,
  UserRound,
  Landmark,
} from "lucide-react";
import CatalogAdmin from "./catalog-admin";
export default function WorkspaceSettings({
  section,
  username,
  onSelect,
}: {
  section: string;
  username: string;
  onSelect: (section: string) => void;
}) {
  return (
    <div className="workspace-settings">
      {section === "Übersicht" && (
        <>
          <div className="settings-intro">
            <h2>Was möchten Sie verwalten?</h2>
            <p>
              Wählen Sie einen Bereich. Preise und Leistungen bearbeiten Sie
              gezielt im jeweiligen Untermenü.
            </p>
          </div>
          <div className="settings-card-grid">
            {[
              {
                title: "Preise & Pakete",
                text: "Projektbudgets und monatliche Betreuungspreise festlegen.",
                Icon: SlidersHorizontal,
              },
              {
                title: "Leistungen",
                text: "Den Katalog nach Kategorien durchsuchen und einzelne Leistungen bearbeiten.",
                Icon: Layers3,
              },
              {
                title: "Mein Zugang",
                text: "Ihr angemeldetes Konto und den Zugang zum Kundenportal ansehen.",
                Icon: UserRound,
              },
            ].map(({ title, text, Icon }) => (
              <button
                className="settings-card"
                key={title}
                onClick={() => onSelect(title)}
              >
                <Icon size={23} />
                <h3>{title}</h3>
                <p>{text}</p>
                <span>
                  Öffnen <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
            <Link href="/crm/finance/settings" className="settings-card">
              <Landmark size={23} />
              <h3>Buchhaltung</h3>
              <p>
                Marken, Allgemeinkosten und verbundene Buchhaltungen verwalten.
              </p>
              <span>
                Zur Finanzverwaltung <ArrowUpRight size={16} />
              </span>
            </Link>
          </div>
        </>
      )}
      <CatalogAdmin
        mode={
          section === "Preise & Pakete"
            ? "prices"
            : section === "Leistungen"
              ? "services"
              : "hidden"
        }
      />
      {section === "Mein Zugang" && (
        <section className="panel settings-account">
          <p className="eyebrow">IHR KONTO</p>
          <h2>{username}</h2>
          <p>Sie sind als Administrator angemeldet.</p>
          <dl>
            <dt>Zugriff</dt>
            <dd>CRM und zentrale Buchhaltung</dd>
            <dt>Kundenzugänge</dt>
            <dd>Im Kundenportal verwalten</dd>
          </dl>
          <Link className="button outline" href="/crm/portal">
            Kundenportal öffnen <ArrowUpRight size={16} />
          </Link>
        </section>
      )}
    </div>
  );
}
