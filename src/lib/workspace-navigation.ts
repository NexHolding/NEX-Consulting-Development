export const workspaceTabs = [
  "Dashboard",
  "Kunden",
  "Anfragen",
  "Projekte",
  "Zeiterfassung",
  "Aufgaben",
  "Rechnungen",
  "Betreuung",
  "Einstellungen",
];
export const settingsSections = [
  "Übersicht",
  "Preise & Pakete",
  "Leistungen",
  "Mein Zugang",
];
export const customerSections = [
  "Übersicht",
  "Stammdaten",
  "Rechnungsdaten",
  "Zugänge & Infrastruktur",
  "Projekte",
  "Zeiten & Auszüge",
  "Rechnungen",
];
export function workspaceView(query: {
  tab?: string | string[];
  customer?: string | string[];
  section?: string | string[];
}) {
  const tab =
    typeof query.tab === "string" && workspaceTabs.includes(query.tab)
      ? query.tab
      : "Dashboard";
  const sections =
    tab === "Einstellungen"
      ? settingsSections
      : tab === "Kunden"
        ? customerSections
        : ["Übersicht"];
  return {
    tab,
    customer:
      tab === "Kunden" && typeof query.customer === "string"
        ? query.customer
        : "",
    section:
      typeof query.section === "string" && sections.includes(query.section)
        ? query.section
        : "Übersicht",
  };
}
