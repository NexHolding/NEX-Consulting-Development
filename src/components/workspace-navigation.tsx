"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "./app-link";
import { Brand } from "./brand";
import {
  LayoutDashboard,
  Users,
  Inbox,
  FolderKanban,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { financeViews } from "@/lib/finance/model";
import { withLoading } from "@/lib/loading-state";

export const mainNavigation = [
  { label: "Dashboard", href: "/crm?tab=Dashboard", Icon: LayoutDashboard },
  { label: "Kunden", href: "/crm?tab=Kunden", Icon: Users },
  { label: "Interessenten", href: "/crm?tab=Anfragen", Icon: Inbox },
  { label: "Projekte", href: "/crm?tab=Projekte", Icon: FolderKanban },
  { label: "Finanzen", href: "/crm/finance", Icon: Receipt },
  { label: "Einstellungen", href: "/crm?tab=Einstellungen", Icon: Settings },
];
export const financeNavigation = [
  ...financeViews.map(([id, label, description]) => ({
    id,
    label,
    description,
    href: "/crm/finance/" + id,
  })),
  {
    id: "invoices",
    label: "Kundenrechnungen",
    description: "Projektleistungen abrechnen",
    href: "/crm?tab=Rechnungen",
  },
  {
    id: "care",
    label: "Betreuungsverträge",
    description: "Wiederkehrende Leistungen",
    href: "/crm?tab=Betreuung",
  },
];
export type SectionItem = {
  id: string;
  label: string;
  description?: string;
  href: string;
};
export function WorkspaceNavigation({
  active,
  user,
  mobile,
  onMobileChange,
  onNavigate,
  leadCount = 0,
}: {
  active: string;
  user: { username: string };
  mobile: boolean;
  onMobileChange: (open: boolean) => void;
  onNavigate?: (label: string) => void;
  leadCount?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!mobile) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileChange(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobile, onMobileChange]);
  return (
    <>
      <div className="workspace-mobile-bar">
        <Brand />
        <button
          className="button small outline"
          aria-label="Hauptmenü öffnen"
          aria-controls="crm-main-navigation"
          aria-expanded={mobile}
          onClick={() => onMobileChange(!mobile)}
        >
          <Menu size={18} />
          Menü
        </button>
      </div>
      {mobile && (
        <button
          className="crm-nav-scrim"
          aria-label="Hauptmenü schließen"
          onClick={() => onMobileChange(false)}
        />
      )}
      <aside
        id="crm-main-navigation"
        className={"sidebar " + (mobile ? "visible" : "")}
      >
        <button
          className="icon-button crm-nav-close"
          aria-label="Menü schließen"
          onClick={() => onMobileChange(false)}
        >
          <X size={18} />
        </button>
        <Brand />
        <p className="sidebar-label">NEX CONSULTING</p>
        <nav aria-label="Hauptnavigation">
          {mainNavigation.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className={active === label ? "active" : ""}
              aria-current={active === label ? "page" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate(label);
                }
                onMobileChange(false);
              }}
            >
              <Icon size={18} />
              {label}
              {label === "Interessenten" && leadCount > 0 && (
                <span className="nav-count">{leadCount}</span>
              )}
            </Link>
          ))}
        </nav>
        <Link className="workspace-portal-link" href="/crm/portal">
          Kundenportal verwalten
        </Link>
        <div className="sidebar-bottom">
          <div className="avatar">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <strong>{user.username}</strong>
            <small>Administrator</small>
          </div>
          <button
            className="icon-button"
            aria-label="Abmelden"
            onClick={async () => {
              await withLoading(() => fetch("/api/auth", { method: "DELETE" }));
              router.replace("/login");
              router.refresh();
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
export function SectionNavigation({
  title,
  eyebrow = "Bereiche",
  items,
  active,
  onSelect,
  back,
}: {
  title: string;
  eyebrow?: string;
  items: SectionItem[];
  active: string;
  onSelect?: (id: string) => void;
  back?: { label: string; href: string; onClick: () => void };
}) {
  return (
    <aside className="secondary-sidebar">
      <div className="secondary-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <nav aria-label={title + " – Untermenü"}>
        {back && (
          <button className="text-link" onClick={back.onClick}>
            ← {back.label}
          </button>
        )}
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={active === item.id ? "active" : ""}
            aria-current={active === item.id ? "page" : undefined}
            onClick={(e) => {
              if (
                onSelect &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.shiftKey &&
                !e.altKey
              ) {
                e.preventDefault();
                onSelect(item.id);
              }
            }}
          >
            <strong>{item.label}</strong>
            {item.description && <small>{item.description}</small>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
