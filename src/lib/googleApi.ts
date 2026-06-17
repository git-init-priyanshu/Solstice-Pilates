type GoogleApiRequestInit = RequestInit & {
  accessToken: string;
};

type GoogleApiErrorResponse = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function formatGoogleApiError(status: number, errorText: string) {
  if (!errorText) {
    return `Google API request failed: ${status}`;
  }

  try {
    const payload = JSON.parse(errorText) as GoogleApiErrorResponse;
    const error = payload.error;

    if (error?.message) {
      return [
        `Google API request failed: ${error.code || status}`,
        error.status,
        error.message,
      ]
        .filter(Boolean)
        .join(" - ");
    }
  } catch {
    return errorText;
  }

  return errorText;
}

async function googleApi<T>(
  url: string,
  init: GoogleApiRequestInit,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${init.accessToken}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(formatGoogleApiError(response.status, errorText));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export { googleApi };
