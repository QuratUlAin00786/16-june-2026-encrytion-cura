const MK1_API_HOST = (() => {
  try {
    const base =
      import.meta.env.VITE_MK1_LIVEKIT_API_URL?.trim() ||
    //  "https://mk1.averox.com/api";
    "https://lk.curaemr.ai/api/";
    return new URL(base).hostname.toLowerCase();
  } catch {
    //return "mk1.averox.com";
    return "lk.curaemr.ai";
  }
})();

const LIVEKIT_SERVER_URL_OVERRIDE =
  import.meta.env.VITE_LIVEKIT_SERVER_URL?.trim() || "";

/** Browser TLS cert hostname when LIVEKIT URL uses a bare IP (cert CN/SAN won't match IP). */
const LIVEKIT_TLS_HOSTNAME =
  import.meta.env.VITE_LIVEKIT_TLS_HOSTNAME?.trim() || "";

function isIpv4Hostname(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

/** Use domain on the TLS cert instead of raw IP for wss in the browser. */
function applyTlsHostnameForBrowser(url: string): string {
  if (!url || !LIVEKIT_TLS_HOSTNAME) return url;
  try {
    const normalized = url.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
    const withScheme = /^https?:\/\//i.test(normalized)
      ? normalized
      : `https://${normalized}`;
    const parsed = new URL(withScheme);
    if (!isIpv4Hostname(parsed.hostname)) return url;

    const tlsRaw = LIVEKIT_TLS_HOSTNAME.replace(/^wss?:\/\//i, "")
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
    const [tlsHost, tlsPort] = tlsRaw.includes(":")
      ? (tlsRaw.split(":") as [string, string])
      : [tlsRaw, ""];

    parsed.hostname = tlsHost;
    if (tlsPort) parsed.port = tlsPort;

    const useWs = /^ws:\/\//i.test(url) && !/^wss:\/\//i.test(url);
    return `${useWs ? "ws" : "wss"}://${parsed.host}`;
  } catch {
    return url;
  }
}

/** Strip trailing /rtc — LiveKit JS SDK appends /rtc on connect. */
export function normalizeLiveKitServerUrl(url: string | undefined): string {
  if (url == null || typeof url !== "string") return "";
  let u = url.trim().replace(/\/+$/, "");
  u = u.replace(/^wss:\/\/https:\/\//i, "wss://");
  u = u.replace(/^wss:\/\/http:\/\//i, "wss://");
  while (/\/rtc$/i.test(u)) {
    u = u.replace(/\/rtc$/i, "").replace(/\/+$/, "");
  }
  if (/^https:\/\//i.test(u)) {
    u = `wss://${u.slice("https://".length)}`;
  } else if (/^http:\/\//i.test(u)) {
    u = `ws://${u.slice("http://".length)}`;
  } else if (!/^wss?:\/\//i.test(u)) {
    u = `wss://${u}`;
  }
  return u.replace(/\/+$/, "");
}

function hostnameFromUrl(url: string): string | null {
  try {
    const withScheme = /^wss?:\/\//i.test(url)
      ? url
      : /^https?:\/\//i.test(url)
        ? url
        : `https://${url}`;
    return new URL(withScheme.replace(/^wss:/i, "https:")).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isApiGatewayHost(hostname: string): boolean {
 // return hostname === MK1_API_HOST || hostname === "mk1.averox.com";
 return hostname === MK1_API_HOST || hostname === "lk.curaemr.ai";
}

/**
 * mk1 /create-room returns a REST API host as serverUrl, not the real LiveKit wss host.
 * Set VITE_LIVEKIT_SERVER_URL=wss://<your-livekit-host> (no /rtc suffix).
 */
export function resolveLiveKitServerUrl(apiServerUrl: string | undefined): string {
  const fromApi = normalizeLiveKitServerUrl(apiServerUrl);
  const override = LIVEKIT_SERVER_URL_OVERRIDE
    ? normalizeLiveKitServerUrl(LIVEKIT_SERVER_URL_OVERRIDE)
    : "";

  if (override) {
    const apiHost = fromApi ? hostnameFromUrl(fromApi) : null;
    if (!fromApi || (apiHost && isApiGatewayHost(apiHost))) {
      return applyTlsHostnameForBrowser(override);
    }
  }

  const host = fromApi ? hostnameFromUrl(fromApi) : null;
  if (fromApi && host && isApiGatewayHost(host)) {
    console.error(
      "[LiveKit] create-room serverUrl points at mk1 API, not LiveKit. Set VITE_LIVEKIT_SERVER_URL=wss://<host>",
      { apiServerUrl },
    );
    return "";
  }

  return applyTlsHostnameForBrowser(fromApi);
}

export function formatLiveKitConnectionError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const lower = message.toLowerCase();
  if (
    lower.includes("could not establish pc connection") ||
    lower.includes("establish pc connection")
  ) {
    return (
      "Media connection failed (WebRTC). Each participant must use their own LiveKit token. " +
      "If this persists, check firewall/NAT and ensure TURN is enabled on your LiveKit server."
    );
  }
  if (
    lower.includes("err_cert_common_name_invalid") ||
    lower.includes("cert_common_name_invalid") ||
    lower.includes("ssl") ||
    lower.includes("certificate")
  ) {
    return (
      "TLS certificate does not match the LiveKit host. Use a domain name on your certificate in VITE_LIVEKIT_SERVER_URL " +
      "(e.g. wss://mk1.averox.com), not a bare IP. If the server is an IP, set VITE_LIVEKIT_TLS_HOSTNAME to the cert domain."
    );
  }
  return message || "Failed to connect to the call";
}
