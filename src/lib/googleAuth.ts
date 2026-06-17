type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Google API access`);
  }

  return value;
}

export async function getGoogleAccessToken() {
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN;
  }

  const body = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Unable to refresh Google access token",
    );
  }

  return payload.access_token;
}
