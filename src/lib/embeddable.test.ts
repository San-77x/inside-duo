import { describe, expect, test } from "bun:test";
import { isPrivateAddress } from "./embeddable";

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
