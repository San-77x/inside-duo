import { UrlForm } from "@/components/UrlForm";
import { Sparkle } from "@/components/icons";
import { getMetrics } from "@/lib/devices";

const single = getMetrics("single", "portrait");
const extended = getMetrics("extended", "portrait");

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 aurora" />
      <div aria-hidden className="pointer-events-none absolute inset-0 studio-grid opacity-45" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(90% 75% at 50% 26%, transparent, var(--color-void) 100%)" }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-20">
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
