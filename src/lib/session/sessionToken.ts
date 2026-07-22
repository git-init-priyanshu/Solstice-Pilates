import { createHmac, timingSafeEqual } from "node:crypto";

function getSigningSecret(): string {
  const secret = process.env.SESSION_SIGNING_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SIGNING_SECRET is not set. Refusing to sign or verify session tokens.",
    );
  }

  return secret;
}

function computeHmac(payload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

export function signUserId(userId: string): string {
  const payload = Buffer.from(userId, "utf8").toString("base64url");
  return `${payload}.${computeHmac(payload)}`;
}

export function verifyUserToken(token: string): string | null {
  if (!token) {
    return null;
  }

  const separatorIndex = token.indexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expected = computeHmac(payload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  return Buffer.from(payload, "base64url").toString("utf8");
}
