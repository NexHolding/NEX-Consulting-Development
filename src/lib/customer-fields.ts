export type CustomerField = {
  name: string;
  label: string;
  max: number;
  type?: string;
  placeholder?: string;
  wide?: boolean;
  suggestions?: string[];
};
export type CustomerGroup = {
  title: string;
  hint?: string;
  area: "master" | "billing";
  fields: CustomerField[];
};
const addressFields = (prefix = ""): CustomerField[] => [
  { name: prefix + "street", label: "Straße", max: 160 },
  { name: prefix + "house_number", label: "Hausnummer", max: 30 },
  {
    name: prefix + "address_extra",
    label: "Adresszusatz / c/o",
    max: 160,
    wide: true,
  },
  { name: prefix + "postal_code", label: "Postleitzahl", max: 30 },
  { name: prefix + "city", label: "Ort", max: 160 },
  {
    name: prefix + "country",
    label: "Land",
    max: 80,
    suggestions: ["Deutschland", "Österreich", "Schweiz"],
  },
];
export const customerGroups: CustomerGroup[] = [
  {
    title: "Unternehmen & Rechtsform",
    area: "master",
    hint: "Offizielle Angaben laut Register bzw. bei Einzelunternehmen der vollständige Name des Inhabers.",
    fields: [
      {
        name: "legal_name",
        label: "Vollständiger rechtlicher Firmenname",
        max: 240,
        wide: true,
        placeholder: "z. B. Muster Beratung GmbH",
      },
      {
        name: "legal_form",
        label: "Rechtsform",
        max: 100,
        suggestions: [
          "Einzelunternehmen",
          "e.K.",
          "e.U.",
          "GbR",
          "eGbR",
          "OG",
          "OHG",
          "KG",
          "GmbH",
          "UG (haftungsbeschränkt)",
          "GmbH & Co. KG",
          "AG",
          "SE",
          "e.V.",
          "eG",
          "FlexCo",
        ],
      },
      { name: "registered_office", label: "Rechtlicher Sitz (Ort)", max: 160 },
      {
        name: "representative",
        label: "Vertretungsberechtigte Person(en) / Inhaber",
        max: 500,
        wide: true,
      },
    ],
  },
  { title: "Geschäftsanschrift", area: "master", fields: addressFields() },
  {
    title: "Kontakt & Zuordnung",
    area: "master",
    fields: [
      { name: "contact", label: "Ansprechpartner", max: 160 },
      { name: "contact_role", label: "Funktion / Abteilung", max: 160 },
      { name: "email", label: "E-Mail", type: "email", max: 200 },
      { name: "phone", label: "Telefon", type: "tel", max: 80 },
      {
        name: "website",
        label: "Unternehmenswebseite",
        max: 300,
        placeholder: "www.beispiel.de",
      },
      { name: "source", label: "Herkunft / betreuende Marke", max: 160 },
    ],
  },
  {
    title: "Register & Steuerangaben",
    area: "master",
    hint: "Soweit vorhanden und für die Zusammenarbeit relevant. Diese Angaben sind nicht bei jeder Firma oder Rechnung erforderlich.",
    fields: [
      {
        name: "register_number",
        label: "Handelsregister- / Firmenbuchnummer",
        max: 100,
      },
      {
        name: "register_court",
        label: "Registergericht / Registerbehörde",
        max: 200,
      },
      { name: "vat_id", label: "USt-IdNr. / UID-Nummer", max: 80 },
      {
        name: "tax_number",
        label: "Steuernummer (intern, falls benötigt)",
        max: 80,
      },
    ],
  },
  {
    title: "Rechnungsempfänger & Versand",
    area: "billing",
    hint: "Ohne abweichende Angaben werden der rechtliche Firmenname und die Geschäftsanschrift verwendet.",
    fields: [
      {
        name: "billing_name",
        label: "Abweichender Rechnungsempfänger",
        max: 240,
        wide: true,
      },
      {
        name: "billing_contact",
        label: "Ansprechpartner Buchhaltung",
        max: 160,
      },
      {
        name: "billing_email",
        label: "Rechnungs-E-Mail",
        type: "email",
        max: 200,
      },
      {
        name: "payment_terms_days",
        label: "Zahlungsziel in Tagen",
        type: "number",
        max: 365,
      },
      {
        name: "buyer_reference",
        label: "Bestellreferenz / Kostenstelle",
        max: 200,
      },
      {
        name: "e_invoice_address",
        label: "E-Rechnungsadresse / Leitweg-ID",
        max: 200,
        wide: true,
      },
    ],
  },
  {
    title: "Abweichende Rechnungsanschrift",
    area: "billing",
    hint: "Nur ausfüllen, wenn die Rechnung an eine andere Anschrift gehen soll. Die Anschrift wird als Ganzes übernommen.",
    fields: addressFields("billing_"),
  },
];
export type CustomerValues = Partial<Record<string, string | number>>;
export const structuredAddressKeys = (prefix = "") =>
  addressFields(prefix).map((f) => f.name);
export function structuredAddress(values: CustomerValues, prefix = "") {
  const get = (key: string) => String(values[prefix + key] ?? "").trim();
  return [
    get("address_extra"),
    [get("street"), get("house_number")].filter(Boolean).join(" "),
    [get("postal_code"), get("city")].filter(Boolean).join(" "),
    get("country"),
  ]
    .filter(Boolean)
    .join("\n");
}
export function customerAddressPatch(
  fields: CustomerValues,
  previous: CustomerValues = {},
) {
  const result = { ...fields };
  for (const prefix of ["", "billing_"]) {
    const keys = structuredAddressKeys(prefix);
    if (
      keys.some((key) => key in fields) &&
      (keys.some((key) => String(fields[key] ?? "").trim()) ||
        keys.some((key) => String(previous[key] ?? "").trim()))
    ) {
      result[prefix + "address"] = structuredAddress(
        { ...previous, ...fields },
        prefix,
      );
    }
  }
  return result;
}
