const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export const resolveAssetUrl = (value) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    if (
      typeof window !== "undefined" &&
      LOCAL_HOSTS.has(parsed.hostname) &&
      !LOCAL_HOSTS.has(window.location.hostname)
    ) {
      parsed.hostname = window.location.hostname;
    }

    return parsed.toString();
  } catch {
    return trimmed;
  }
};
