import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key() {
  const encoded = process.env.NC_CREDENTIALS_KEY || "";
  const value = Buffer.from(encoded, "base64");
  if (value.length !== 32 || value.toString("base64") !== encoded)
    throw Error("CREDENTIALS_KEY_UNAVAILABLE");
  return value;
}
export function credentialsConfigured() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}
export function encryptCredential(secret, customerId, credentialId) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(
    Buffer.from(`nex-credentials:v1:${customerId}:${credentialId}`),
  );
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}
export function decryptCredential(encoded, customerId, credentialId) {
  const [version, nonce, tag, ciphertext, extra] = encoded.split(".");
  if (version !== "v1" || extra !== undefined || !nonce || !tag || !ciphertext)
    throw Error("CREDENTIAL_UNREADABLE");
  const iv = Buffer.from(nonce, "base64"),
    authTag = Buffer.from(tag, "base64");
  if (iv.length !== 12 || authTag.length !== 16)
    throw Error("CREDENTIAL_UNREADABLE");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAAD(
    Buffer.from(`nex-credentials:v1:${customerId}:${credentialId}`),
  );
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
