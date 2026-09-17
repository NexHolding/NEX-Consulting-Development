export type OfferService = {
  id: string;
  group: string;
  label: string;
  unit: string;
  description: string;
  quantities: number[];
};
export type OfferCatalog = {
  monthlyPricing?: "linear" | "commercial";
  version: number;
  points: { budget: number; monthly: number }[];
  services: OfferService[];
};
export type OfferSelection = {
  budget: number;
  logo: boolean;
  domains: number;
  domainFee: number;
  catalogVersion: number;
};
export type OfferQuote = {
  catalog_version: number;
  package: string;
  selection: OfferSelection;
  project_cents: number;
  logo_cents: number;
  one_time_cents: number;
  care_cents: number;
  domain_cents: number;
  monthly_cents: number;
  extra_hourly_cents: number;
  items: {
    id: string;
    group: string;
    label: string;
    unit: string;
    description: string;
    quantity: number;
  }[];
};
export const packageForBudget = (budget: number) =>
  budget < 10000 ? "Basic" : budget < 35000 ? "Business" : "Enterprise";
export function calculateOffer(
  catalog: OfferCatalog,
  selection: OfferSelection,
): OfferQuote {
  const { budget, logo, domains, domainFee } = selection;
  if (
    !Number.isInteger(budget) ||
    budget < 1000 ||
    budget > 100000 ||
    !Number.isInteger(domains) ||
    domains < 0 ||
    domains > 50 ||
    ![2, 3, 4, 5].includes(domainFee) ||
    selection.catalogVersion !== catalog.version
  )
    throw Error("Konfiguration oder Katalogversion ungültig.");
  const upper = catalog.points.findIndex((p) => p.budget >= budget);
  const hi = upper < 0 ? catalog.points.length - 1 : upper,
    lo = Math.max(0, hi - 1);
  const span = catalog.points[hi].budget - catalog.points[lo].budget;
  const ratio = span ? (budget - catalog.points[lo].budget) / span : 0;
  const interpolate = (a: number, b: number) => a + (b - a) * ratio;
  const rawCare = interpolate(
    catalog.points[lo].monthly,
    catalog.points[hi].monthly,
  );
  const care =
    catalog.monthlyPricing === "commercial" && ratio > 0 && ratio < 1
      ? Math.min(
          catalog.points[hi].monthly,
          Math.max(
            catalog.points[lo].monthly,
            Math.round((rawCare + 1) / 50) * 50 - 1,
          ),
        )
      : Math.round(rawCare);
  const items = catalog.services
    .map((s) => ({
      ...s,
      quantity:
        s.id === "changes" && budget < 10000
          ? 0
          : Math.floor(interpolate(s.quantities[lo], s.quantities[hi]) + 1e-8),
    }))
    .map(({ quantities, ...s }) => {
      void quantities;
      return s;
    });
  const project_cents = budget * 100,
    logo_cents = logo ? 29900 : 0,
    domain_cents = domains * domainFee * 100;
  return {
    catalog_version: catalog.version,
    package: packageForBudget(budget),
    selection: { ...selection },
    project_cents,
    logo_cents,
    one_time_cents: project_cents + logo_cents,
    care_cents: care * 100,
    domain_cents,
    monthly_cents: care * 100 + domain_cents,
    extra_hourly_cents: 15000,
    items,
  };
}
export const offerQuantity = (quote: OfferQuote, id: string) =>
  quote.items.find((s) => s.id === id)?.quantity ?? 0;
export const euros = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);

export const offerTiers = [
  {
    name: "Basic",
    min: 1000,
    max: 9999,
    start: 1000,
    tag: "WEBSITE & DIGITALER EINSTIEG",
    description:
      "Professionell sichtbar. Mit einer Website, die zu Ihrem Unternehmen passt.",
    care: "Care Start",
  },
  {
    name: "Business",
    min: 10000,
    max: 34999,
    start: 10000,
    tag: "WEBSITE, CRM & TEAM",
    description:
      "Mehr erledigen. Kunden, Mitarbeiter und Abläufe in einem verbundenen System.",
    care: "Care Business",
  },
  {
    name: "Enterprise",
    min: 35000,
    max: 100000,
    start: 35000,
    tag: "PLATTFORM, FINANCE & KI",
    description:
      "Größer denken. Portale, Finance und Automatisierung für Ihre Organisation.",
    care: "Care Scale",
  },
] as const;
export function budgetForRequirements(
  catalog: OfferCatalog,
  requirements: Record<string, number>,
): number | null {
  const entries = Object.entries(requirements);
  if (
    entries.some(
      ([id, n]) =>
        !catalog.services.some((s) => s.id === id) ||
        !Number.isInteger(n) ||
        n < 0,
    )
  )
    throw Error("Ungültiger Leistungsbedarf.");
  const fits = (budget: number) => {
    const quote = calculateOffer(catalog, {
      budget,
      logo: false,
      domains: 0,
      domainFee: 3,
      catalogVersion: catalog.version,
    });
    return entries.every(([id, n]) => offerQuantity(quote, id) >= n);
  };
  if (!fits(100000)) return null;
  let lo = 1000,
    hi = 100000;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function serviceAmount(quantity: number, unit: string, id?: string) {
  if (id === "care_minutes" && quantity >= 60) {
    const hours = Math.floor(quantity / 60),
      minutes = quantity % 60;
    return `${hours} Std.${minutes ? ` ${minutes} Min.` : ""}`;
  }
  const singular: Record<string, string> = {
    Seiten: "Seite",
    Layouts: "Layout",
    Sprachen: "Sprache",
    Strecken: "Strecke",
    Anbindungen: "Anbindung",
    Portale: "Portal",
    Module: "Modul",
    Rollen: "Rolle",
    Zugänge: "Zugang",
    Agenten: "Agent",
    Workflows: "Workflow",
    Minuten: "Minute",
    Aufträge: "Auftrag",
    Systeme: "System",
    Checks: "Check",
    Auszüge: "Auszug",
    Termine: "Termin",
    Quellen: "Quelle",
    Vorlagen: "Vorlage",
    Durchläufe: "Durchlauf",
    Prüfdurchläufe: "Prüfdurchlauf",
    Suchbereiche: "Suchbereich",
    Prozesse: "Prozess",
    Bereiche: "Bereich",
    Runden: "Runde",
    Änderungen: "Änderung",
    Einrichtungen: "Einrichtung",
    Exportformate: "Exportformat",
    Weiterleitungen: "Weiterleitung",
    Abläufe: "Ablauf",
  };
  return `${quantity} ${quantity === 1 ? (singular[unit] ?? unit) : unit}`;
}
