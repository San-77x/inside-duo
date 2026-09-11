import { lookup } from "node:dns/promises";
import net from "node:net";

export type EmbedCheck =
  | { status: "ok" }
  | { status: "blocked"; header: string; value: string }
  | { status: "unreachable"; reason: string };

const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 10000;

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return a >= 224;
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0];
  if (addr === "::" || addr === "::1") return true;
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true;
  if (addr.startsWith("fe8") || addr.startsWith("fe9")) return true;
  if (addr.startsWith("fea") || addr.startsWith("feb")) return true;
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

// The server fetches URLs supplied by anyone on the internet, so every hop has to
// be re-checked against internal address space — not just the first one.
async function assertPublicHost(hostname: string): Promise<void> {
  const bare = hostname.replace(/^\[|\]$/g, "");

  if (net.isIP(bare)) {
    const isPrivate = net.isIPv4(bare) ? isPrivateIpv4(bare) : isPrivateIpv6(bare);
    if (isPrivate) throw new Error("Target resolves to a private address");
    return;
  }

  if (bare === "localhost" || bare.endsWith(".localhost") || bare.endsWith(".internal")) {
    throw new Error("Target resolves to a private address");
  }

  const records = await lookup(bare, { all: true, verbatim: true });
  if (records.length === 0) throw new Error("Domain did not resolve");

  for (const record of records) {
    const isPrivate =
      record.family === 4 ? isPrivateIpv4(record.address) : isPrivateIpv6(record.address);
    if (isPrivate) throw new Error("Target resolves to a private address");
  }
}

function readFrameAncestors(csp: string | null): string | null {
  if (!csp) return null;
  for (const directive of csp.split(";")) {
    const parts = directive.trim().split(/\s+/);
    if (parts[0]?.toLowerCase() === "frame-ancestors") {
      return parts.slice(1).join(" ").trim();
    }
  }
  return null;
}

function inspectHeaders(headers: Headers): EmbedCheck {
  const xfo = headers.get("x-frame-options");
  if (xfo) {
    const value = xfo.trim().toUpperCase();
    if (value.includes("DENY") || value.includes("SAMEORIGIN") || value.includes("ALLOW-FROM")) {
      return { status: "blocked", header: "X-Frame-Options", value: xfo.trim() };
    }
  }

  const ancestors = readFrameAncestors(headers.get("content-security-policy"));
  if (ancestors !== null && ancestors.length > 0) {
    const tokens = ancestors.split(/\s+/);
    const allowsAnyone = tokens.some((token) => token === "*" || token === "https:");
    if (!allowsAnyone) {
      return { status: "blocked", header: "Content-Security-Policy", value: `frame-ancestors ${ancestors}` };
    }
  }

  return { status: "ok" };
}

export async function inspectEmbeddability(rawUrl: string): Promise<EmbedCheck> {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    return { status: "unreachable", reason: "That doesn't look like a valid URL." };
  }

  if (current.protocol !== "http:" && current.protocol !== "https:") {
    return { status: "unreachable", reason: "Only http and https URLs can be previewed." };
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    try {
      await assertPublicHost(current.hostname);
    } catch {
      return { status: "unreachable", reason: "That address couldn't be reached." };
    }

    let response: Response;
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      return { status: "unreachable", reason: "That site didn't respond in time." };
    }

    response.body?.cancel();

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      try {
        current = new URL(location, current);
      } catch {
        return { status: "unreachable", reason: "That site sent an invalid redirect." };
      }
      continue;
    }

    return inspectHeaders(response.headers);
  }

  return { status: "unreachable", reason: "That site redirected too many times." };
}
