import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestWebsites } from "../src/lib/website-match.mjs";
const sites = [
  {
    id: "a",
    name: "Buchungsportal",
    domain: "https://www.aurelia.example",
    features: "Terminbuchung, Kalender",
  },
  {
    id: "b",
    name: "Shop",
    domain: "shop.example",
    features: "Warenkorb, Kalender",
  },
];
test("domain match is specific; lookalike domains do not match", () => {
  assert.equal(
    suggestWebsites("Fehler auf aurelia.example", sites)[0].website_id,
    "a",
  );
  assert.equal(
    suggestWebsites("evil-aurelia.example und aurelia.example.evil", sites)
      .length,
    0,
  );
});
test("ambiguous functions return multiple suggestions, unknown remains empty", () => {
  assert.equal(suggestWebsites("Kalender defekt", sites).length, 2);
  assert.deepEqual(suggestWebsites("Bitte helfen", sites), []);
});
