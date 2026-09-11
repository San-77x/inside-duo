import { describe, expect, test } from "bun:test";
import { inspectHeaders, isPrivateAddress } from "./embeddable";

// The URL parser rewrites addresses before they reach us — ::ffff:127.0.0.1 arrives as
// ::ffff:7f00:1 — so each address is listed in the spellings it can actually arrive in.
const PRIVATE = [
  "127.0.0.1",
  "10.0.0.1",
  "172.16.0.1",
  "172.31.255.255",
  "192.168.1.1",
  "169.254.169.254",
  "100.64.0.1",
  "0.0.0.0",
  "224.0.0.1",
  "::1",
  "0:0:0:0:0:0:0:1",
  "::",
  "fc00::1",
  "fd12:3456::1",
  "fe80::1",
  "febf::1",
  "::ffff:127.0.0.1",
  "::ffff:7f00:1",
  "0:0:0:0:0:ffff:7f00:1",
  "::ffff:10.0.0.1",
  "::ffff:a00:1",
  "::ffff:192.168.1.1",
  "::ffff:169.254.169.254",
  "::ffff:a9fe:a9fe",
  "::127.0.0.1",
  "64:ff9b::127.0.0.1",
  "64:ff9b::7f00:1",
  "2002:7f00:1::1",
  "2002:a00:1::1",
];

const PUBLIC = [
  "8.8.8.8",
  "1.1.1.1",
  "172.32.0.1",
  "192.169.0.1",
  "100.128.0.1",
  "2001:4860:4860::8888",
  "2606:4700::1111",
  "2002:5db8:d822::1",
  "fec0::1",
  "::ffff:8.8.8.8",
  "::ffff:808:808",
];

describe("isPrivateAddress", () => {
  test.each(PRIVATE)("blocks %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  test.each(PUBLIC)("allows %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  test("fails closed on input that is not an address", () => {
    for (const junk of ["", "not-an-ip", "999.999.999.999", "::gggg", "127.0.0.1.1"]) {
      expect(isPrivateAddress(junk)).toBe(true);
    }
  });
});

describe("inspectHeaders", () => {
  const check = (headers: Record<string, string>) => inspectHeaders(new Headers(headers));

  test("allows a response with no framing headers", () => {
    expect(check({}).status).toBe("ok");
  });

  test.each([
    ["deny", "blocked"],
    ["DENY", "blocked"],
    ["  SameOrigin  ", "blocked"],
    // Ignored by every current browser, so the page really does frame.
    ["ALLOW-FROM https://partner.example", "ok"],
    // Must not be misread as SAMEORIGIN by a substring test.
    ["ALLOW-FROM https://sameorigin.example", "ok"],
  ] as const)("x-frame-options %p -> %s", (value, expected) => {
    expect(check({ "x-frame-options": value }).status).toBe(expected);
  });

  test.each([
    ["frame-ancestors 'none'", "blocked"],
    ["frame-ancestors 'self'", "blocked"],
    ["default-src 'self'; frame-ancestors 'self' https://partner.example", "blocked"],
    ["frame-ancestors *", "ok"],
    ["frame-ancestors https:", "ok"],
    ["default-src 'self'; script-src 'unsafe-inline'", "ok"],
  ] as const)("csp %p -> %s", (value, expected) => {
    expect(check({ "content-security-policy": value }).status).toBe(expected);
  });

  test("reports the header responsible so the dialog can quote it", () => {
    const result = check({ "x-frame-options": "deny" });
    expect(result).toMatchObject({ header: "X-Frame-Options", value: "deny" });
  });
});
