const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // When the base URL is not set locally, keep relative paths so Vite's dev proxy can handle /api.
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}
