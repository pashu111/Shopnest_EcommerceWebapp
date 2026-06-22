const normalizeUrl = (value) => (typeof value === "string" ? value.trim() : "");

export const getDefaultWebSocketUrl = ({ path = "/ws" } = {}) => {
  const explicit = normalizeUrl(import.meta.env.VITE_WS_URL);
  if (explicit) return explicit;

  const apiUrl = normalizeUrl(import.meta.env.VITE_API_URL) || "/api";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (apiUrl.startsWith("/")) {
    if (typeof window !== "undefined") {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${window.location.host}${normalizedPath}`;
    }
    return normalizedPath;
  }

  try {
    const parsed = new URL(apiUrl);
    const wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${parsed.host}${normalizedPath}`;
  } catch {
    const base = apiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
    return wsBase + normalizedPath;
  }
};
