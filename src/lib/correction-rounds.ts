export type CorrectionProject = {
  id: string;
  name: string;
  included_correction_rounds?: number | null;
};
export type CorrectionTime = {
  project_id: string;
  correction_round?: number | null;
  change_request?: string | null;
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
};
export function assignmentLabel(
  entry: { correction_round?: number | null; change_request?: string | null },
  included?: number | null,
) {
  return entry.change_request != null
    ? "Abänderung · Separat abzurechnen"
    : correctionLabel(entry.correction_round, included);
}
export function validTimeAssignment(entry: TimeAssignment) {
  if (entry.change_request != null)
    return (
      entry.correction_round == null &&
      entry.change_request.trim().length >= 3 &&
      entry.change_request.trim().length <= 2000
    );
  return (
    entry.correction_round == null ||
    (Number.isInteger(entry.correction_round) &&
      entry.correction_round >= 1 &&
      entry.correction_round <= 999)
  );
}
