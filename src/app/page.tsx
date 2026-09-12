import { UrlForm } from "@/components/UrlForm";
import { ArrowRight, GitHub, Sparkle } from "@/components/icons";
import { getMetrics } from "@/lib/devices";

const single = getMetrics("single", "portrait");
const extended = getMetrics("extended", "portrait");

const REPO_URL = "https://github.com/San-77x/view-on-iphone-duo";
const PORTFOLIO_URL = "https://san-77x.vercel.app";
const CONTACT_URL = "https://san-77x.vercel.app/#contact";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 aurora" />
      <div aria-hidden className="pointer-events-none absolute inset-0 studio-grid opacity-45" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(90% 75% at 50% 26%, transparent, var(--color-void) 100%)" }}
      />

      <header className="relative flex items-center justify-end px-6 py-5">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          title="Source on GitHub"
          className="flex h-9 items-center gap-2 rounded-lg border border-line-soft bg-panel/50 px-3 text-xs text-muted backdrop-blur transition-colors hover:border-line hover:text-ink"
        >
          <GitHub className="h-4 w-4" />
          <span className="hidden sm:inline">Source</span>
        </a>
      </header>

      <div className="relative flex flex-1 flex-col items-center px-6 pb-24 pt-6 sm:pt-12">
        <div className="animate-rise flex flex-col items-center text-center">
          <span className="mb-7 inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/60 px-3 py-1 text-xs text-muted backdrop-blur">
            <Sparkle className="h-3 w-3 text-accent-soft" />
            Free · No sign-up · Runs in your browser
          </span>

          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            View your site on the{" "}
            <span className="bg-gradient-to-br from-accent-soft to-accent bg-clip-text text-transparent">
              iPhone Duo
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted">
            Load any URL inside a true-to-size device frame — fold it shut to the cover display,
            open it to the 7.6&quot; inner screen, and rotate it. Fully interactive.
          </p>
        </div>

        <div
          className="animate-rise mt-10 flex w-full justify-center"
          style={{ animationDelay: "90ms" }}
        >
          <UrlForm />
        </div>

        <dl
          className="animate-rise mt-16 grid grid-cols-1 gap-3 sm:grid-cols-3"
          style={{ animationDelay: "180ms" }}
        >
          <Spec
            term="Cover display"
            value={`${single.viewportWidth} × ${single.viewportHeight}`}
            note={`${single.diagonal}" folded`}
          />
          <Spec
            term="Inner display"
            value={`${extended.viewportWidth} × ${extended.viewportHeight}`}
            note={`${extended.diagonal}" unfolded`}
          />
          <Spec term="Rendering" value="1:1 CSS pixels" note="Never upscaled" />
        </dl>

        <section
          className="animate-rise mt-20 w-full max-w-3xl"
          style={{ animationDelay: "260ms" }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/[0.18] via-panel/70 to-panel/40 p-8 backdrop-blur-xl sm:p-11">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 40%, transparent), transparent 70%)",
              }}
            />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Available for work
              </span>

              <h2 className="mt-5 text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
                Need a site that holds up on every screen?
              </h2>

              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted">
                I design and build fast, responsive front-ends — this tool included. If the
                preview above showed you something you&apos;d rather not ship, that is exactly
                the kind of thing I fix.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <a
                  href={CONTACT_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-6 text-sm font-semibold text-void transition-colors hover:bg-white"
                >
                  Work with me
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href={PORTFOLIO_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-12 items-center rounded-xl border border-line px-5 text-sm font-medium text-muted transition-colors hover:border-faint hover:text-ink"
                >
                  See my work
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="relative border-t border-line-soft px-6 py-5">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-xs text-faint sm:flex-row">
          <p>
            Pages load straight into your browser — they are never proxied or stored. The URL you
            enter is sent to the server once, to check whether the site allows embedding.
          </p>
          <p className="shrink-0">View on iPhone Duo</p>
        </div>
      </footer>
    </main>
  );
}

function Spec({ term, value, note }: { term: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-line-soft bg-panel/40 px-5 py-4 text-center backdrop-blur-sm sm:text-left">
      <dt className="text-xs text-faint">{term}</dt>
      <dd className="mt-1 font-mono text-sm text-ink">{value}</dd>
      <dd className="mt-0.5 text-xs text-faint">{note}</dd>
    </div>
  );
}
