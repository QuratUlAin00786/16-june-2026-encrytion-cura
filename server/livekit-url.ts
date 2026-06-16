const MK1_API_HOST = (() => {
  try {
//const base =
//process.env.MK1_LIVEKIT_API_URL?.trim() || "https://mk1.averox.com/api";
const base = process.env.MK1_LIVEKIT_API_URL?.trim() || "https://lk.curaemr.ai/api/";
  

return new URL(base).hostname.toLowerCase();
  } catch {
  //  return "mk1.averox.com";
    return "lk.curaemr.ai";
  }
})();

const LIVEKIT_SERVER_URL_OVERRIDE = process.env.LIVEKIT_SERVER_URL?.trim() || "";
const LIVEKIT_TLS_HOSTNAME = process.env.LIVEKIT_TLS_HOSTNAME?.trim() || "";

function isIpv4Hostname(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function applyTlsHostname(url: string): string {
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

function normalizeLiveKitServerUrl(url: string | undefined): string {
  if (url == null || typeof url !== "string") return "";
  let u = url.trim().replace(/\/+$/, "");
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

export function resolveLiveKitServerUrl(apiServerUrl: string | undefined): string {
  const fromApi = normalizeLiveKitServerUrl(apiServerUrl);
  const override = LIVEKIT_SERVER_URL_OVERRIDE
    ? normalizeLiveKitServerUrl(LIVEKIT_SERVER_URL_OVERRIDE)
    : "";

  if (override) {
    const apiHost = fromApi ? hostnameFromUrl(fromApi) : null;
    if (!fromApi || (apiHost && isApiGatewayHost(apiHost))) {
      return applyTlsHostname(override);
    }
  }

  const host = fromApi ? hostnameFromUrl(fromApi) : null;
  if (fromApi && host && isApiGatewayHost(host)) {
    return "";
  }

  return applyTlsHostname(fromApi);
}
