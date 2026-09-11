<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# View on iPhone Duo

Previews any URL inside a true-to-size iPhone Duo device frame: fold between the 5.4"
cover display and the 7.6" inner display, rotate, and share a link that restores the
exact view.

## Commands

Bun is the package manager and script runner.

```bash
bun install
bun run dev      # dev server
bun run build    # production build; also regenerates typed routes
bun run start
bun run lint     # eslint, including React Compiler rules
bunx tsc --noEmit
```

**Never run Next on Bun's runtime.** `bun --bun next <cmd>` compiles and then dies with
`panic: Segmentation fault` / `SIGILL`. `bun run dev` spawns the `next` binary under
Node, which is the supported path — do not add `--bun` to the scripts.

Do not run `npm install`; it creates a `package-lock.json` alongside `bun.lock` and the
two drift. `npm run <script>` is harmless, but prefer `bun run`.

No test framework is configured. `bun run lint` and `tsc --noEmit` are the only
automated checks.

After adding or renaming a route, run `bun run build` (or `bunx next typegen`) before
`tsc --noEmit` — `PageProps<"/route">` is generated, and typechecking fails until it
exists.

## Architecture

Two routes. `/` is a static landing page whose form normalizes the input and pushes to
`/preview?url=&mode=&orientation=`, a server component that parses the search params and
hands them to `PreviewStage` (client), which owns everything after that.

**Previews are real iframes, never proxied.** The target site loads directly into an
`<iframe>` sized to exact device CSS pixels; this app never fetches, rewrites, or serves
the previewed page. The single server-side network call is the embeddability check.

### Load gating — `src/lib/embeddable.ts`, `src/app/actions.ts`

`checkEmbeddable` fetches the target and inspects `X-Frame-Options` and CSP
`frame-ancestors`. It returns three states, and keeping them distinct matters:

- `ok` — render the iframe.
- `blocked` — a header refuses framing. Definitive: the frame is blanked and the dialog
  quotes the offending header.
- `unreachable` — *our server* could not fetch it. **Not** definitive, so the iframe
  still renders beneath the dialog; the user's browser may reach what the server cannot.
  Do not collapse this into `blocked`.

This action fetches arbitrary user-supplied URLs, so it re-validates **every redirect
hop** against loopback, private, link-local and CGNAT ranges using `redirect: "manual"`
plus an explicit hop loop. Switching to `redirect: "follow"` skips per-hop validation and
reopens SSRF.

### Sizing invariant

`src/lib/devices.ts` is the single source of truth for panel dimensions; the landing page
reads its specs from there too. The stage scale is `min(fit, 1)` — it only ever scales
**down**. Never permit scale > 1: the point of the tool is that the embedded site sees a
genuine 466- or 890-px viewport at 1:1, so upscaling would make the preview lie.

### State that must not remount the iframe

Two deliberate choices keep the previewed page alive across UI changes:

- The iframe `key` is `` `${url}-${refreshKey}` `` and **excludes** `mode` and
  `orientation`. Adding them reloads the previewed site on every fold or rotate.
- `mode` and `orientation` reach the address bar via `window.history.replaceState`, not
  `router.replace`, so links stay shareable without re-rendering the route and tearing
  down the iframe.

### Fold animation — `src/components/useFoldAnimation.ts`

Two-phase and timer-driven: the frame rotates one way for `SWING_MS`, the mode commits
exactly at that boundary (which is when dimensions change), rotation snaps to the
mirrored angle, then eases back to flat. A frosted-glass overlay hides the reflow and a
gleam strip marks the hinge. If you retime it, the `commit` callback must stay on the
`SWING_MS` boundary or the resize becomes visible. Skips straight to the commit under
`prefers-reduced-motion`.

## Conventions and traps

- **React Compiler lint is enforced.** `setState` inside an effect body is an error. To
  reset state when an input changes, use the key-comparison-during-render pattern — see
  `loadKey` / `activeLoad` in `PreviewStage` — not an effect.
- **Ref callbacks need stable identity.** An inline `ref={(n) => n?.select()}` re-runs on
  every render; on the URL field that re-selected the text after each keystroke, so
  typing overwrote itself. Use a `useCallback` ref.
- `checkEmbeddable` fires **twice per load in development** — React Strict Mode
  double-invoking effects. It runs once in production; not a bug.
- **Tailwind v4 with no config file.** Theme tokens (`--color-void`, `--color-accent`, …)
  are declared in `@theme` in `src/app/globals.css`; custom utilities (`studio-grid`,
  `aurora`, `device-rail`) use `@utility`.
- Icons are hand-written inline SVGs in `src/components/icons.tsx`; there is no icon
  dependency.
- Dark-only by design. `color-scheme: dark` is global, while the preview iframe is pinned
  to `colorScheme: "light"` so embedded sites render in their light theme.
- The block above these docs is regenerated by `next dev`. It only rewrites text between
  its own markers, so content here is preserved.
