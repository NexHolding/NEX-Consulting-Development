import { test } from "node:test";
import assert from "node:assert/strict";
import { customerAddressPatch } from "../src/lib/customer-fields.ts";

test("editing company details preserves an existing legacy address", () => {
  const previous = {
    address: "Altstraße 5\n10115 Berlin",
    billing_address: "Postfach 7",
  };
  const patch = customerAddressPatch(
    { legal_form: "GmbH", street: "", city: "", country: "" },
    previous,
  );
  assert.equal(Object.hasOwn(patch, "address"), false);
  assert.equal(Object.hasOwn(patch, "billing_address"), false);
});
test("structured addresses retain international postal codes and separate invoice destinations", () => {
  const patch = customerAddressPatch({
    street: "Baker Street",
    house_number: "12B",
    postal_code: "W1U 6TQ",
    city: "London",
    country: "United Kingdom",
    billing_street: "Ringstraße",
    billing_house_number: "4",
    billing_postal_code: "1010",
    billing_city: "Wien",
    billing_country: "Österreich",
  });
  assert.equal(
    patch.address,
    "Baker Street 12B\nW1U 6TQ London\nUnited Kingdom",
  );
  assert.equal(patch.billing_address, "Ringstraße 4\n1010 Wien\nÖsterreich");
});
test("partial address updates preserve other components and permit deliberate clearing", () => {
  const previous = {
    street: "Hauptstraße",
    house_number: "5",
    postal_code: "10115",
    city: "Berlin",
    country: "Deutschland",
  };
  assert.equal(
    customerAddressPatch({ house_number: "9" }, previous).address,
    "Hauptstraße 9\n10115 Berlin\nDeutschland",
  );
  assert.equal(
    customerAddressPatch(
      Object.fromEntries(Object.keys(previous).map((k) => [k, ""])),
      previous,
    ).address,
    "",
  );
  assert.deepEqual(
    customerAddressPatch({ billing_email: "rechnung@example.com" }, previous),
    { billing_email: "rechnung@example.com" },
  );
});
