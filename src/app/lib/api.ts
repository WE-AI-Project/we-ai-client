const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");
const isDev = import.meta.env.DEV;

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // In local development, always use a relative path so the Vite proxy can
  // forward /api requests without triggering browser-side CORS errors.
  if (isDev) return normalizedPath;

  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}
