import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  hashToken,
  randomToken,
} from "../src/lib/security.mjs";
test("password hashes are salted and reject wrong and malformed credentials", () => {
  const a = hashPassword("synthetic-test-password"),
    b = hashPassword("synthetic-test-password");
  assert.notEqual(a, b);
  assert.equal(verifyPassword("synthetic-test-password", a), true);
  assert.equal(verifyPassword("wrong", a), false);
  assert.equal(verifyPassword("anything", "malformed"), false);
});
test("session tokens have independent 256-bit entropy and only hashes are persisted", () => {
  const a = randomToken(),
    b = randomToken();
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  assert.notEqual(a, hashToken(a));
  assert.equal(hashToken(a), hashToken(a));
});
