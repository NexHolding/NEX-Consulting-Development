import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  encryptCredential,
  decryptCredential,
  credentialsConfigured,
} from "../src/lib/credential-crypto.mjs";
test("credential encryption uses fresh nonces, authenticates ownership and fails closed", () => {
  const old = process.env.NC_CREDENTIALS_KEY;
  try {
    process.env.NC_CREDENTIALS_KEY = randomBytes(32).toString("base64");
    const password = "  Fiktives Pässwort 🔐 / + test  ";
    const first = encryptCredential(password, "customer-a", "entry-a"),
      second = encryptCredential(password, "customer-a", "entry-a");
    assert.notEqual(first, second);
    assert.equal(first.includes(password), false);
    assert.equal(decryptCredential(first, "customer-a", "entry-a"), password);
    assert.throws(() => decryptCredential(first, "customer-b", "entry-a"));
    assert.throws(() => decryptCredential(first, "customer-a", "entry-b"));
    const parts = first.split(".");
    const bytes = Buffer.from(parts[3], "base64");
    bytes[0] ^= 1;
    parts[3] = bytes.toString("base64");
    assert.throws(() =>
      decryptCredential(parts.join("."), "customer-a", "entry-a"),
    );
    process.env.NC_CREDENTIALS_KEY = randomBytes(32).toString("base64");
    assert.throws(() => decryptCredential(first, "customer-a", "entry-a"));
    delete process.env.NC_CREDENTIALS_KEY;
    assert.equal(credentialsConfigured(), false);
    assert.throws(() => encryptCredential(password, "a", "b"));
  } finally {
    if (old === undefined) delete process.env.NC_CREDENTIALS_KEY;
    else process.env.NC_CREDENTIALS_KEY = old;
  }
});
