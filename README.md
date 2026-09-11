# View on iPhone Duo

Load any website inside a true-to-size iPhone Duo device frame and interact with it
exactly as you would on the real hardware — fold it shut to the cover display, open it to
the inner display, rotate it, and share a link that restores the exact view.

---

## What this is

Foldable phones have two very different screens, and a layout that looks right on one can
break badly on the other. Checking that normally means owning the device, or dragging a
browser window to a guessed width and hoping it matches.

View on iPhone Duo renders your site inside a frame sized to the real panel dimensions,
at a true 1:1 CSS pixel ratio. The page inside isn't a screenshot or a simulation — it's your
actual site, fully interactive: you can click through it, fill in forms, and scroll.

Everything happens in your own browser. Pages are never proxied through a server, never
rewritten, and never stored.

## Features

- **Both displays.** Switch between the 5.4" cover screen and the 7.6" inner screen with
  an animated fold, including the hinge crease down the middle of the open panel.
- **True 1:1 rendering.** The frame scales down to fit your window but never scales up, so
  the embedded site always sees a genuine device-width viewport and its CSS media queries
  behave the way they would on hardware.
- **Rotation.** Flip either display between portrait and landscape.
- **Shareable links.** The URL carries the site, the fold state, and the orientation, so a
  link reopens the precise view you were looking at.
- **Honest failure.** Sites that refuse to be embedded are reported clearly, quoting the
  exact HTTP header responsible, instead of showing a mysterious blank rectangle.
- **Live readout.** Current viewport dimensions, panel size, and zoom level are always
  visible beneath the device.
- **No sign-up, no tracking, no storage.**

## Device specifications

| Display | Diagonal | Portrait | Landscape |
| --- | --- | --- | --- |
| Cover (folded) | 5.4" | 466 × 678 | 678 × 466 |
| Inner (unfolded) | 7.6" | 890 × 626 | 626 × 890 |

Dimensions are CSS pixels. They are defined in one place, `src/lib/devices.ts`.

## Getting started

**Requirements:** [Bun](https://bun.sh) and Node.js 20+.

```bash
bun install
bun run dev
```

Open the URL it prints (`http://localhost:3000` unless the port is taken).

### Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run lint` | ESLint, including React Compiler rules |

> Bun is the package manager and script runner, but Next.js itself runs on Node. Running
> it on Bun's runtime (`bun --bun next`) currently crashes, so the scripts deliberately
> avoid the `--bun` flag.

## Using it

Enter a domain on the home page and you land in the viewer:

- **Left rail** — back, the two display modes, rotate, reload, and copy link.
- **Top pill** — the current URL. Click it to type a different one. `Esc` cancels.
- **Bottom chip** — live viewport size, panel diagonal, and zoom percentage.

## How it works

### Rendering

The previewed site is loaded into an ordinary `<iframe>` whose width and height are set to
the device's exact CSS pixel dimensions. The frame is then scaled with a CSS transform to
fit the available space — but the scale is clamped at `1`, so it only ever shrinks. This
is what keeps the preview honest: the site inside always believes it's in a 466 or 890
pixel viewport, regardless of how large your monitor is.

Folding and rotating change the iframe's dimensions without remounting it, so the page you
were looking at stays loaded and keeps its scroll position and state.

### The embeddability check

Most large sites forbid being displayed inside a frame, using the `X-Frame-Options`
header or a Content Security Policy `frame-ancestors` directive. When a browser hits one,
it silently renders nothing — which looks identical to a bug.

To avoid that, a server action fetches the target first and inspects those headers, then
reports one of three outcomes:

- **Embeddable** — the preview loads.
- **Refused** — a header explicitly forbids framing. The dialog names the header and its
  value, and offers to open the site in a normal tab instead.
- **Unreachable** — the server couldn't fetch it. This is *not* treated as fatal: the
  iframe is still attempted underneath, because your browser may be able to reach
  something the server cannot.

Because that check fetches URLs supplied by anyone, it validates every redirect hop
against loopback, private, link-local, and carrier-grade NAT address ranges, so it can't
be used as a probe into internal networks.

### The fold animation

The two panels have different dimensions, so switching between them means the frame
changes size mid-animation. The transition rotates the device on its Y axis, commits the
new mode at the exact moment the frame is edge-on to the viewer, then eases back to flat.
A frosted glass overlay covers the resize, and a bright strip sweeps down the hinge as it
opens. It collapses to an instant switch when `prefers-reduced-motion` is set.

## Limitations

These are inherent to previewing live sites in a browser, not bugs:

- **Sites that block framing cannot be previewed.** No browser-based tool can work around
  `X-Frame-Options`; it is the site's own decision. The viewer tells you when this is why.
- **No user-agent or touch emulation.** The embedded page runs in your real desktop
  browser at a narrow viewport. Width-based CSS media queries are accurate; anything that
  sniffs `navigator.userAgent` or checks for touch support will still see a desktop
  browser.
- **No device pixel ratio emulation.** Layout is accurate; image `srcset` selection for a
  high-DPI screen is not.

## Privacy

Page content is loaded directly by your browser and never touches the server. The only
thing sent to the server is the URL itself, once, so the embeddability check can read its
response headers. Nothing is logged to a database, and there are no accounts, cookies, or
analytics.

## Project structure

```
src/
  app/
    page.tsx           landing page
    preview/page.tsx   viewer route, reads search params
    actions.ts         checkEmbeddable server action
    globals.css        theme tokens and custom utilities
  components/
    PreviewStage.tsx   viewer UI and all client state
    DeviceFrame.tsx    the physical frame, bezel, hinge, glow
    useFoldAnimation.ts fold choreography
    UrlForm.tsx        landing page input
    icons.tsx          inline SVG icon set
  lib/
    devices.ts         panel dimensions — single source of truth
    embeddable.ts      header inspection and address validation
    url.ts             URL normalizing and formatting
```

## Built with

Next.js 16 (App Router, Turbopack, Server Actions) · React 19 · TypeScript ·
Tailwind CSS v4 · Bun

No UI component library and no icon package — the interface, the device frame, and every
icon are written from scratch.
