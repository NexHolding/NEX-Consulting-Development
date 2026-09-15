import { test } from "node:test";
import assert from "node:assert/strict";
import {
  correctionStatus,
  correctionLabel,
  usedCorrectionRounds,
} from "../src/lib/correction-rounds.ts";
test("correction package distinguishes unknown limits, zero included and additional rounds", () => {
  assert.equal(correctionStatus(null, 2), "regular");
  assert.equal(correctionStatus(1, null), "open");
  assert.equal(correctionStatus(1, 0), "additional");
  assert.equal(correctionStatus(2, 2), "included");
  assert.equal(correctionStatus(3, 2), "additional");
  assert.match(correctionLabel(3, 2), /Zusatzzeit/);
  assert.match(correctionLabel(1, undefined), /offen/);
});
test("multiple sessions and time kinds count once per project and correction round", () => {
  assert.deepEqual(
    usedCorrectionRounds(
      [
        { project_id: "a", correction_round: 2 },
        { project_id: "a", correction_round: 2 },
        { project_id: "a", correction_round: 1 },
        { project_id: "a", correction_round: null },
        { project_id: "b", correction_round: 3 },
      ],
      "a",
    ),
    [1, 2],
  );
});
