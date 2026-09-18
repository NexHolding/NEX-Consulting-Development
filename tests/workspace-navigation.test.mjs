import { test } from "node:test";
import assert from "node:assert/strict";
import { workspaceView } from "../src/lib/workspace-navigation.ts";
test("settings deep links and customer sections survive reload without crossing areas", () => {
  assert.deepEqual(
    workspaceView({
      tab: "Einstellungen",
      section: "Leistungen",
      customer: "stale",
    }),
    { tab: "Einstellungen", section: "Leistungen", customer: "" },
  );
  assert.deepEqual(
    workspaceView({
      tab: "Kunden",
      customer: "customer-id",
      section: "Rechnungsdaten",
    }),
    { tab: "Kunden", customer: "customer-id", section: "Rechnungsdaten" },
  );
  assert.equal(
    workspaceView({ tab: "Einstellungen", section: "Rechnungsdaten" }).section,
    "Übersicht",
  );
});
test("unknown and repeated query parameters cannot create a blank workspace", () => {
  for (const tab of [
    "nicht-vorhanden",
    ["Einstellungen", "Kunden"],
    undefined,
  ]) {
    assert.deepEqual(
      workspaceView({ tab, section: ["Leistungen"], customer: ["unexpected"] }),
      { tab: "Dashboard", section: "Übersicht", customer: "" },
    );
  }
});
