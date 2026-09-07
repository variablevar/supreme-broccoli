import test from "node:test";
import assert from "node:assert/strict";
import {
  newToken,
  tokenHash,
  validToken,
  sessionValid,
  sameOrigin,
} from "../modules/auth/tokens";
import { seal, open } from "../modules/auth/encryption";

test("session credentials are random opaque secrets; legacy forged JSON is rejected", () => {
  const a = newToken(),
    b = newToken();
  assert.notEqual(a, b);
  assert.ok(validToken(a));
  assert.equal(tokenHash(a).length, 64);
  assert.equal(
    validToken(
      Buffer.from(
        JSON.stringify({
          email: "admin@example.com",
          stage: "done",
          exp: Date.now() + 100000,
        }),
      ).toString("base64url"),
    ),
    false,
  );
});
test("sessions enforce expiry, audience and stage", () => {
  const row = {
    audience: "customer",
    stage: "done",
    expires_at: new Date(2000).toISOString(),
  };
  assert.equal(sessionValid(row, "customer", 1000), true);
  assert.equal(sessionValid(row, "admin", 1000), false);
  assert.equal(sessionValid(row, "customer", 2000), false);
  assert.equal(
    sessionValid({ ...row, stage: "invented" }, "customer", 1000),
    false,
  );
  assert.equal(sessionValid(null, "customer"), false);
});
test("cross-origin browser mutations are rejected", () => {
  assert.equal(
    sameOrigin("https://evil.example", "https://imo.example", null),
    false,
  );
  assert.equal(sameOrigin(null, "https://imo.example", "cross-site"), false);
  assert.equal(sameOrigin(null, "https://imo.example", null), false);
  assert.equal(
    sameOrigin("https://imo.example", "https://imo.example", "same-origin"),
    true,
  );
});
test("TOTP encryption rejects modified ciphertext and requires a dedicated key", () => {
  process.env.TOTP_ENCRYPTION_KEY = "ab".repeat(32);
  const blob = seal("test-secret");
  assert.equal(open(blob), "test-secret");
  blob[blob.length - 1] ^= 1;
  assert.throws(() => open(blob));
  delete process.env.TOTP_ENCRYPTION_KEY;
  assert.throws(() => seal("test"));
});
