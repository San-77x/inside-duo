# Contributing

Thanks for taking a look. Issues and pull requests are both welcome.

## Getting set up

You need [Bun](https://bun.sh) and Node.js 20+. Bun is the package manager and script
runner; Next.js itself still executes on Node.

```bash
bun install
bun run dev
```

## Before opening a pull request

```bash
bun test
bun run lint
bun run build
bunx tsc --noEmit
```

CI runs exactly these four, in that order. `bun run build` has to come before `tsc`
because typed route definitions are generated during the build.

## Things that will fail review

These are not style preferences — each one has broken something before, and the reasoning
is in [AGENTS.md](AGENTS.md).

- **Letting the preview scale above 1:1.** The device frame only ever shrinks to fit. The
  whole point of the tool is that the embedded site sees a real 466- or 890-pixel
  viewport; upscaling makes the preview lie.
- **Adding `mode` or `orientation` to the iframe `key`.** It would reload the previewed
  site on every fold or rotate, losing scroll position and page state.
- **Simplifying the two runtime branches in `src/lib/embeddable.ts`.** Node pins the
  connection to a validated address; Workers cannot. Collapsing them silently weakens the
  Node path.
- **Changing address parsing without adding test cases.** A text-matching bug in that file
  is an SSRF hole, and one has already shipped once. See `src/lib/embeddable.test.ts`.
- **Calling `setState` inside an effect body.** The React Compiler lint rejects it. Use the
  key-comparison-during-render pattern instead — `loadKey` / `activeLoad` in
  `PreviewStage` is the worked example.

## Testing against Cloudflare

The deployed target is Cloudflare Workers, which is not Node. A change can pass under
`next dev` and still break there, so exercise the real runtime before proposing a deploy:

```bash
bun run preview:cf
```

## Scope

This is a focused tool: previewing a URL at foldable dimensions. Features that widen it
into a general device emulator — arbitrary device presets, user-agent spoofing, screenshot
export — are likely to be declined. Open an issue before building something large.
