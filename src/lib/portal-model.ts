export const orderStatuses = [
  "Auftrag eingegangen",
  "Angebot beziehungsweise Vertrag ausstehend",
  "Warten auf Unterlagen",
  "Planung und Konzeption",
  "Design in Bearbeitung",
  "Entwicklung in Bearbeitung",
  "Interne Prüfung",
  "Kundenfreigabe erforderlich",
  "Korrekturen werden umgesetzt",
  "Veröffentlichung wird vorbereitet",
  "Auftrag abgeschlossen",
  "Auftrag pausiert",
] as const;
export type Row = { id: string; [key: string]: unknown };
export type PortalData = Record<string, Row[]>;
export const display = (v: unknown) => (v == null ? "" : String(v));
export const euro = (v: unknown) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    Number(v || 0) / 100,
  );
export const date = (v: unknown) =>
  v ? new Date(String(v)).toLocaleDateString("de-DE") : "Noch offen";
