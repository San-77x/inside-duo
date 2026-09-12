# Security policy

## Reporting a vulnerability

Please report privately rather than opening a public issue: use
[GitHub's private vulnerability reporting](https://github.com/San-77x/view-on-iphone-duo/security/advisories/new)
on this repository.

Include what you did, what happened, and what you expected. A proof of concept helps but
is not required.

## Where the risk actually is

The interesting surface is one server action, `checkEmbeddable` in `src/app/actions.ts`,
which fetches a URL supplied by anyone and reports whether it allows framing. That makes
it a server-side request forgery target, and it is unauthenticated.

Current defences, all in `src/lib/embeddable.ts`:

- Addresses are expanded to bytes before any range check, so every textual spelling of an
  address reaches the same comparison. Loopback, private, link-local, CGNAT and the
  IPv4-carrying IPv6 ranges (`::ffff:0:0/96`, `::a.b.c.d`, NAT64, 6to4) are all refused,
  and unparseable input fails closed.
- **Every redirect hop** is re-validated, not just the first. Redirects are followed
  manually for this reason.
- On Node the connection is pinned to the address that passed validation, so a short-TTL
  DNS record cannot answer the check with a public address and the request with an
  internal one.
- The action is rate limited per client.

Known limitations, deliberate rather than overlooked:

- **Cloudflare Workers cannot pin a connection**, so the deployed Worker keeps address
  validation but not the pinning. The edge has no private network of the operator's to
  reach, which is what makes that acceptable there and not on a Node host.
- **The rate limit is in-process.** A deployment running several instances limits per
  instance. It bounds casual abuse, not a distributed effort.
- **The preview iframe is not sandboxed.** A previewed page can navigate the top-level
  tab once the user clicks inside it. `sandbox` prevents this but breaks real sites
  outright — Wikipedia renders blank under it — so faithful rendering was chosen instead.
  Treat a `/preview` link from a stranger with the same caution as any link they send.

A report that defeats the address validation, escapes the per-hop checks, or reaches an
internal service is in scope and worth reporting. The three limitations above are already
known; reports about them are welcome but will not be treated as new findings.
