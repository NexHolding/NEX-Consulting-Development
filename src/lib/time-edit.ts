// Editors use the same time zone as monthly statements, regardless of device location.
export function berlinDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
}
export function berlinInputToIso(value: string, original?: string | null) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value))
    throw Error("Bitte Datum und Uhrzeit vollständig angeben.");
  const normalized = value.length === 16 ? value + ":00" : value;
  // Keep exact stored precision (and the original DST offset) when untouched.
  if (original && berlinDateTime(original) === normalized) return original;
  const wall = Date.parse(normalized + "Z");
  if (!Number.isFinite(wall)) throw Error("Ungültiges Datum.");
  const candidates = [60, 120]
    .map((offset) => new Date(wall - offset * 60000).toISOString())
    .filter((iso) => berlinDateTime(iso) === normalized);
  if (candidates.length !== 1)
    throw Error(
      candidates.length
        ? "Diese Uhrzeit ist wegen der Zeitumstellung doppeldeutig. Bitte eine eindeutige Uhrzeit wählen."
        : "Diese Uhrzeit existiert nicht. Bitte Datum und Zeitumstellung prüfen.",
    );
  return candidates[0];
}
