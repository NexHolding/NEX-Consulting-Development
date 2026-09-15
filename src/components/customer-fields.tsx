"use client";

import {
  customerGroups,
  structuredAddress,
  type CustomerValues,
} from "@/lib/customer-fields";
export default function CustomerFields({
  values = {},
  mode = "create",
}: {
  values?: CustomerValues;
  mode?: "create" | "master" | "billing";
}) {
  return (
    <div
      className="customer-fields"
      onInvalidCapture={(event) => {
        (event.target as HTMLElement)
          .closest("details")
          ?.setAttribute("open", "");
      }}
    >
      <p className="customer-form-hint">
        {mode === "create"
          ? "Nur der Kundenname ist erforderlich. Alle weiteren Angaben können Sie jetzt erfassen oder später im Kundenprofil ergänzen."
          : "Zusätzliche Firmen- und Rechnungsangaben sind optional. Bereits erfasste Daten können Sie hier ergänzen oder korrigieren."}
      </p>
      {mode !== "billing" && (
        <label className="customer-name-field">
          Kundenname / Anzeigename *
          <input
            name="name"
            required
            minLength={2}
            maxLength={160}
            defaultValue={values.name ?? ""}
            autoFocus={mode === "create"}
          />
        </label>
      )}
      {customerGroups
        .filter((g) => mode === "create" || g.area === mode)
        .map((group, index) => (
          <details
            className="customer-field-group"
            key={group.title}
            open={mode !== "create" || index < 2}
          >
            <summary>
              <span>{group.title}</span>
              <small>Optional</small>
            </summary>
            {group.hint && <p>{group.hint}</p>}
            <div className="customer-field-grid">
              {group.fields.map((field) => (
                <label className={field.wide ? "wide" : ""} key={field.name}>
                  {field.label}
                  <input
                    name={field.name}
                    type={field.type || "text"}
                    defaultValue={
                      values[field.name] ??
                      (field.name === "payment_terms_days"
                        ? 14
                        : field.name === "source"
                          ? "NEX Consulting"
                          : "")
                    }
                    maxLength={field.type === "number" ? undefined : field.max}
                    min={field.type === "number" ? 0 : undefined}
                    max={field.type === "number" ? field.max : undefined}
                    placeholder={field.placeholder}
                    list={
                      field.suggestions ? "customer-" + field.name : undefined
                    }
                  />
                  {field.suggestions && (
                    <datalist id={"customer-" + field.name}>
                      {field.suggestions.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  )}
                </label>
              ))}
            </div>
            {group.title === "Geschäftsanschrift" &&
              values.address &&
              !structuredAddress(values) && (
                <label className="customer-legacy-address">
                  Bisherige Anschrift (Freitext)
                  <textarea
                    name="address"
                    rows={3}
                    maxLength={1000}
                    defaultValue={values.address}
                  />
                  <small>
                    Bleibt erhalten, bis Sie die Anschrift in den einzelnen
                    Feldern erfassen.
                  </small>
                </label>
              )}
            {group.title === "Abweichende Rechnungsanschrift" &&
              values.billing_address &&
              !structuredAddress(values, "billing_") && (
                <label className="customer-legacy-address">
                  Bisherige Rechnungsanschrift (Freitext)
                  <textarea
                    name="billing_address"
                    rows={3}
                    maxLength={1000}
                    defaultValue={values.billing_address}
                  />
                  <small>
                    Bleibt erhalten, bis Sie die Anschrift in den einzelnen
                    Feldern erfassen.
                  </small>
                </label>
              )}
          </details>
        ))}
      {mode !== "billing" && (
        <label>
          Interne Notizen
          <textarea
            name="notes"
            rows={3}
            maxLength={4000}
            defaultValue={values.notes ?? ""}
          />
        </label>
      )}
    </div>
  );
}
