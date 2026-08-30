// Single place that knows where the API lives and what a failure looks like.
// Previously every page interpolated a backend URL from env inline,
// so a change to the URL shape meant editing a dozen components.

// Vite exposes env vars prefixed with VITE_ on `import.meta.env`. Anything here
// is compiled into the bundle and publicly readable - never a secret.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ASSET_URL = import.meta.env.VITE_ASSET_URL || "http://localhost:5000";

/** Thrown for any non-2xx response, carrying the server's status. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Thrown when the request never reached the server at all. */
export class NetworkError extends Error {
  constructor(message = "Could not reach the server.") {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Images are either an absolute Cloudinary URL or a path relative to the API
 * host (local-disk fallback), so callers should not have to care which.
 */
export const resolveImageUrl = (image) => {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  // Legacy rows were written on Windows and contain backslashes, which are not
  // valid in a URL path.
  const normalized = image.replace(/\\/g, "/");
  return `${ASSET_URL}/${normalized.replace(/^\/+/, "")}`;
};

export const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

/**
 * Thin fetch wrapper: attaches the bearer token, unwraps JSON, and converts
 * both failure modes into typed errors the UI can tell apart (a dead server
 * deserves a "waking up" message, a 422 deserves the server's own text).
 */
export const request = async (
  path,
  { method = "GET", body, token, signal, headers = {} } = {}
) => {
  const isFormData = body instanceof FormData;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        // Letting the browser set Content-Type for FormData is required: it has
        // to append the multipart boundary.
        ...(isFormData || !body ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new NetworkError();
  }

  if (response.status === 204) return null;

  let payload;
  try {
    payload = await response.json();
  } catch {
    // A proxy timing out mid-cold-start returns HTML, not JSON.
    if (!response.ok) {
      throw new ApiError(
        "The server returned an unexpected response.",
        response.status
      );
    }
    return null;
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || "Something went wrong.",
      response.status
    );
  }

  return payload;
};

/** Liveness probe used to wake a suspended free-tier instance. */
export const ping = async (signal) => {
  const response = await fetch(`${API_URL}/health`, { signal });
  if (!response.ok) throw new NetworkError();
  return response.json();
};
