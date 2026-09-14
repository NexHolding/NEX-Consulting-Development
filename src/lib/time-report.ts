export type ReportTime = {
  id: string;
  project_id: string;
  kind: string;
  category: string;
  description: string;
  started_at: string;
  stopped_at: string | null;
  approved_at: string | null;
};
// Berlin calendar boundaries, including changes between summer and winter time.
export function berlinMidnight(day: string) {
  const utc = Date.parse(day + "T00:00:00Z");
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(utc)),
  );
  return utc - hour * 3600000;
}
export function reportWindow(month: string, now: number): [number, number] {
  if (!month) return [0, now];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("Ungültiger Monat");
  const [year, m] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, m, 1)).toISOString().slice(0, 10);
  return [berlinMidnight(month + "-01"), Math.min(now, berlinMidnight(next))];
}
export function reportSeconds(t: ReportTime, window: [number, number]) {
  return Math.max(
    0,
    Math.floor(
      (Math.min(
        t.stopped_at ? Date.parse(t.stopped_at) : window[1],
        window[1],
      ) -
        Math.max(Date.parse(t.started_at), window[0])) /
        1000,
    ),
  );
}
export function timeDuration(s: number) {
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), Math.floor(s % 60)]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
