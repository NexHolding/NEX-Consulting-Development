export type CorrectionProject = {
  id: string;
  name: string;
  included_correction_rounds?: number | null;
  included_change_rounds?: number | null;
  hourly_rate_cents?: number;
  waiting_billable?: boolean;
  offer_snapshot?: unknown;
};
export type CorrectionTime = {
  project_id: string;
  correction_round?: number | null;
  change_request?: string | null;
  change_round?: number | null;
  extra_work?: string | null;
};
export function correctionStatus(
  round: number | null | undefined,
  included: number | null | undefined,
) {
  if (round == null) return "regular";
  if (included == null) return "open";
  return round <= included ? "included" : "additional";
}
export function correctionLabel(
  round: number | null | undefined,
  included: number | null | undefined,
) {
  const status = correctionStatus(round, included);
  if (status === "regular") return "Reguläre Projektarbeit";
  return `Korrekturrunde ${round} · ${status === "open" ? "Paketumfang offen" : status === "included" ? "Im Paket enthalten" : "Zusatzzeit"}`;
}
export function usedCorrectionRounds(
  times: CorrectionTime[],
  projectId: string,
) {
  return [
    ...new Set(
      times
        .filter(
          (t) =>
            t.project_id === projectId &&
            t.correction_round != null &&
            t.change_request == null,
        )
        .map((t) => t.correction_round as number),
    ),
  ].sort((a, b) => a - b);
}

export type TimeAssignment = {
  correction_round: number | null;
  change_request: string | null;
  change_round?: number | null;
  extra_work?: string | null;
};
export function assignmentStatus(
  entry: Partial<TimeAssignment>,
  project?: CorrectionProject,
) {
  if (entry.extra_work != null) return "additional";
  if (entry.change_request != null)
    return entry.change_round == null
      ? "open"
      : correctionStatus(entry.change_round, project?.included_change_rounds);
  return correctionStatus(
    entry.correction_round,
    project?.included_correction_rounds,
  );
}
export function assignmentLabel(
  entry: Partial<TimeAssignment>,
  included?: number | null,
  changes?: number | null,
) {
  if (entry.extra_work != null)
    return "Zusatzleistung · Zusätzlich abzurechnen";
  if (entry.change_request != null) {
    if (entry.change_round == null) return "Abänderung · Separat abzurechnen";
    const status = correctionStatus(entry.change_round, changes);
    return `Abänderung ${entry.change_round} · ${status === "open" ? "Paketumfang offen" : status === "included" ? "Im Paket enthalten" : "Zusatzzeit"}`;
  }
  return correctionLabel(entry.correction_round, included);
}
export function validTimeAssignment(entry: TimeAssignment) {
  const validRound = (n: number | null | undefined) =>
    n == null || (Number.isInteger(n) && n >= 1 && n <= 999);
  const validText = (s: string | null | undefined) =>
    s == null || (s.trim().length >= 3 && s.trim().length <= 2000);
  return (
    validRound(entry.correction_round) &&
    validRound(entry.change_round) &&
    validText(entry.change_request) &&
    validText(entry.extra_work) &&
    [entry.correction_round, entry.change_request, entry.extra_work].filter(
      (v) => v != null,
    ).length <= 1 &&
    (entry.change_round == null || entry.change_request != null)
  );
}

export function usedChangeRounds(times: CorrectionTime[], projectId: string) {
  return [
    ...new Set(
      times
        .filter(
          (t) =>
            t.project_id === projectId &&
            t.change_request != null &&
            t.change_round != null,
        )
        .map((t) => t.change_round as number),
    ),
  ].sort((a, b) => a - b);
}
