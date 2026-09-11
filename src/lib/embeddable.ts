import { resolve4, resolve6 } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

// Workers implements most of node:dns, but lookup() throws "Not implemented" there, and
// it cannot honour the lookup hook that pins a connection. Everything below therefore
// resolves with resolve4/resolve6, which both runtimes support, and pins only on Node.
const ON_WORKERS =
  typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

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

// Textual IPv6 has too many spellings to pattern-match: the URL parser rewrites
// ::ffff:127.0.0.1 as ::ffff:7f00:1, and 0:0:0:0:0:0:0:1 means ::1. Expand to bytes
// first so every spelling of an address reaches the same check.
function ipv6Bytes(input: string): number[] | null {
  const bare = input.toLowerCase().split("%")[0];
  if (!net.isIPv6(bare)) return null;

  const groupBytes = (part: string): number[] => {
    if (!part) return [];
    const out: number[] = [];
    for (const group of part.split(":")) {
      if (group.includes(".")) {
        for (const octet of group.split(".")) out.push(Number(octet) & 0xff);
      } else {
        const value = parseInt(group, 16);
        out.push((value >>> 8) & 0xff, value & 0xff);
      }
    }
    return out;
  };

  const [head, tail] = bare.split("::");
  const left = groupBytes(head);

  if (tail === undefined) return left.length === 16 ? left : null;

  const right = groupBytes(tail);
  const fill = 16 - left.length - right.length;
  if (fill < 0) return null;

  return [...left, ...Array<number>(fill).fill(0), ...right];
}

function isPrivateIpv6(ip: string): boolean {
  const b = ipv6Bytes(ip);
  if (b === null) return true; // unparseable: refuse rather than let it through

  const zeros = (from: number, to: number) => b.slice(from, to).every((byte) => byte === 0);
  const embeddedIpv4 = (from: number) => isPrivateIpv4(b.slice(from, from + 4).join("."));

  if (zeros(0, 16)) return true; // ::
  if (zeros(0, 15) && b[15] === 1) return true; // ::1
  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link local

  // Anything carrying an IPv4 address is only as safe as the address it carries.
  if (zeros(0, 10) && b[10] === 0xff && b[11] === 0xff) return embeddedIpv4(12); // ::ffff:0:0/96
  if (zeros(0, 12)) return embeddedIpv4(12); // ::a.b.c.d, deprecated but still routed
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && zeros(4, 12)) {
    return embeddedIpv4(12); // 64:ff9b::/96 NAT64
  }
  if (b[0] === 0x20 && b[1] === 0x02) return embeddedIpv4(2); // 2002::/16 6to4

  return false;
}

/** Exported for tests. Anything that is not a parseable public address is private. */
export function isPrivateAddress(ip: string): boolean {
  return net.isIPv4(ip) ? isPrivateIpv4(ip) : isPrivateIpv6(ip);
}

type Pinned = { address: string; family: 4 | 6 };

// The server fetches URLs supplied by anyone on the internet, so every hop is checked
// against internal address space — not just the first. The address that passed is
// returned so the connection can be pinned to it: re-resolving the name at connect time
// would let a short-TTL record answer the check with a public IP and the fetch with an
// internal one.
async function resolvePublicAddress(hostname: string): Promise<Pinned> {
  const bare = hostname.replace(/^\[|\]$/g, "");

  if (net.isIP(bare)) {
    if (isPrivateAddress(bare)) throw new Error("Target resolves to a private address");
    return { address: bare, family: net.isIPv4(bare) ? 4 : 6 };
  }

  if (bare === "localhost" || bare.endsWith(".localhost") || bare.endsWith(".internal")) {
    throw new Error("Target resolves to a private address");
  }

  const [v4, v6] = await Promise.allSettled([resolve4(bare), resolve6(bare)]);
  const records: Pinned[] = [
    ...(v4.status === "fulfilled" ? v4.value.map((address) => ({ address, family: 4 as const })) : []),
    ...(v6.status === "fulfilled" ? v6.value.map((address) => ({ address, family: 6 as const })) : []),
  ];

  if (records.length === 0) throw new Error("Domain did not resolve");

  // Every answer has to be public, not just the one we end up using: a name that returns
  // both a public and an internal address must not be reachable through either.
  for (const record of records) {
    if (isPrivateAddress(record.address)) throw new Error("Target resolves to a private address");
  }

  return records[0];
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

/** Exported for tests. */
export function inspectHeaders(headers: Headers): EmbedCheck {
  const xfo = headers.get("x-frame-options");
  if (xfo) {
    // Compare the directive itself, not the whole value: ALLOW-FROM is ignored by every
    // current browser, so such a page really does frame, and a substring test would also
    // misread "ALLOW-FROM https://sameorigin.example" as SAMEORIGIN.
    const directive = xfo.trim().toUpperCase().split(/[\s,]+/)[0];
    if (directive === "DENY" || directive === "SAMEORIGIN") {
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

type HeadResponse = { status: number; headers: Headers };

function fetchHeaders(url: URL, pinned: Pinned): Promise<HeadResponse> {
  return ON_WORKERS ? fetchHeadersOnWorkers(url) : fetchHeadersPinned(url, pinned);
}

// Workers cannot pin a connection to an address, so this path keeps the resolve-and-check
// step and accepts that the name is resolved again at connect time. The edge has no
// private network of ours to reach, which is what makes that acceptable there and not on
// a Node host.
async function fetchHeadersOnWorkers(url: URL): Promise<HeadResponse> {
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });

  await response.body?.cancel().catch(() => {});
  return { status: response.status, headers: response.headers };
}

// Uses node:http rather than fetch because only this API lets the connection be pinned to
// an address we already validated. `lookup` is handed the pinned result instead of asking
// DNS again, while the URL still supplies Host and the TLS server name, so virtual hosts
// and certificate validation behave normally.
function fetchHeadersPinned(url: URL, pinned: Pinned): Promise<HeadResponse> {
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method: "GET",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
        },
        lookup: (_hostname, options, callback) => {
          if (typeof options === "object" && options?.all) {
            callback(null, [{ address: pinned.address, family: pinned.family }]);
          } else {
            callback(null, pinned.address, pinned.family);
          }
        },
      },
      (response) => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
          else if (value !== undefined) headers.set(name, value);
        }

        // Only the headers matter, so drop the body rather than buffering a whole page.
        response.destroy();
        resolve({ status: response.statusCode ?? 0, headers });
      },
    );

    request.setTimeout(TIMEOUT_MS, () => request.destroy(new Error("Timed out")));
    request.on("error", reject);
    request.end();
  });
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
    let pinned: Pinned;
    try {
      pinned = await resolvePublicAddress(current.hostname);
    } catch {
      return { status: "unreachable", reason: "That address couldn't be reached." };
    }

    let response: HeadResponse;
    try {
      response = await fetchHeaders(current, pinned);
    } catch {
      return { status: "unreachable", reason: "That site didn't respond in time." };
    }

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
