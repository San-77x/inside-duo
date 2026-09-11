"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Spinner } from "@/components/icons";
import { normalizeUrl } from "@/lib/url";

// Every entry must actually be embeddable — a suggestion that lands on the "refuses to
// be embedded" dialog is a terrible first impression. Re-check before changing these.
const EXAMPLES = ["tailwindcss.com", "en.wikipedia.org", "bun.sh"];

export function UrlForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function go(raw: string) {
    const url = normalizeUrl(raw);
    if (!url) {
      setError("Enter a full domain, like example.com");
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/preview?url=${encodeURIComponent(url)}`);
    });
  }

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          go(value);
        }}
        className="group relative"
      >
        <div
          aria-hidden
          className="absolute -inset-px rounded-2xl bg-gradient-to-r from-accent/40 via-accent/10 to-accent/40 opacity-0 blur transition-opacity duration-300 group-focus-within:opacity-100"
        />
        <div className="relative flex items-center gap-2 rounded-2xl border border-line bg-panel/80 p-2 backdrop-blur-xl">
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            placeholder="example.com"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={pending}
            className="h-12 min-w-0 flex-1 bg-transparent px-3 font-mono text-base text-ink outline-none placeholder:text-faint disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!value.trim() || pending}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-void transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <span>Preview</span>
            {pending ? <Spinner /> : <ArrowRight />}
          </button>
        </div>
      </form>

      <div className="mt-3 flex min-h-6 items-center gap-2 px-1">
        {error ? (
          <p className="text-xs text-rose-400">{error}</p>
        ) : (
          <>
            <span className="text-xs text-faint">Try</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setValue(example);
                  go(example);
                }}
                className="rounded-md border border-line-soft px-2 py-0.5 font-mono text-xs text-muted transition-colors hover:border-line hover:text-ink"
              >
                {example}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
