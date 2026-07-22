import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

process.env.SESSION_SIGNING_SECRET = "test-secret";

const { signUserId, verifyUserToken } = await import("./sessionToken");

afterEach(() => {
  process.env.SESSION_SIGNING_SECRET = "test-secret";
});

test("sign then verify round-trips the userId", () => {
  const userId = "user-123";
  const token = signUserId(userId);

  assert.equal(verifyUserToken(token), userId);
});

test("a tampered token fails verification", () => {
  const token = signUserId("user-123");
  const [payload, signature] = token.split(".");
  const tampered = `${payload}x.${signature}`;

  assert.equal(verifyUserToken(tampered), null);
});

test("a token signed with a different secret fails verification", () => {
  const token = signUserId("user-123");

  process.env.SESSION_SIGNING_SECRET = "other-secret";

  assert.equal(verifyUserToken(token), null);
});

test("an empty token fails verification", () => {
  assert.equal(verifyUserToken(""), null);
});

test("verifying with an unset secret throws", () => {
  const token = signUserId("user-123");

  delete process.env.SESSION_SIGNING_SECRET;

  assert.throws(() => verifyUserToken(token), /SESSION_SIGNING_SECRET/);
});
