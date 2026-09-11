"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkEmbeddable } from "@/app/actions";
import { DeviceFrame } from "@/components/DeviceFrame";
import { useFoldAnimation } from "@/components/useFoldAnimation";
import {
  ArrowLeft,
  Check,
  Close,
  Globe,
  Link as LinkIcon,
  Phone,
  Refresh,
  Rotate,
  ShieldOff,
  Spinner,
  Unfolded,
} from "@/components/icons";
import { getMetrics, type FoldMode, type Orientation } from "@/lib/devices";
import { normalizeUrl, toDisplayUrl } from "@/lib/url";

type Blocked =
  | { kind: "blocked"; header: string; value: string }
  | { kind: "unreachable"; reason: string };

type Props = {
  url: string;
  initialMode: FoldMode;
  initialOrientation: Orientation;
};

const STAGE_PADDING = 96;

export function PreviewStage({ url, initialMode, initialOrientation }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<FoldMode>(initialMode);
  const [orientation, setOrientation] = useState<Orientation>(initialOrientation);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toDisplayUrl(url));
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);

  const metrics = getMetrics(mode, orientation);
  const { state: fold, isAnimating, fold: requestFold } = useFoldAnimation(mode, setMode);

  // Reloading and navigating both start a fresh load, so the spinner and any previous
  // block notice reset here rather than from each call site.
  const loadKey = `${url}::${refreshKey}`;
  const [activeLoad, setActiveLoad] = useState(loadKey);
  if (activeLoad !== loadKey) {
    setActiveLoad(loadKey);
    setLoading(true);
    setBlocked(null);
  }

  // Keep the address bar shareable without re-rendering the route, which would
  // tear down the iframe and reload the previewed site.
  useEffect(() => {
    const next = new URL(window.location.href);
    next.searchParams.set("mode", mode);
    next.searchParams.set("orientation", orientation);
    window.history.replaceState(null, "", next.toString());
  }, [mode, orientation]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const { width, height } = stage.getBoundingClientRect();
      const fit = Math.min(
        (width - STAGE_PADDING) / metrics.totalWidth,
        (height - STAGE_PADDING) / metrics.totalHeight,
        1,
      );
      setScale(Math.max(fit, 0.12));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [metrics.totalWidth, metrics.totalHeight]);

  useEffect(() => {
    let active = true;

    checkEmbeddable(url).then((result) => {
      if (!active || result.status === "ok") return;
      setLoading(false);
      setBlocked(
        result.status === "blocked"
          ? { kind: "blocked", header: result.header, value: result.value }
          : { kind: "unreachable", reason: result.reason },
      );
    });

    return () => {
      active = false;
    };
  }, [url, refreshKey]);

  // A frame that never fires load would otherwise spin forever.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 12000);
    return () => clearTimeout(timer);
  }, [loading, url, refreshKey]);

  const submitUrl = useCallback(
    (raw: string) => {
      setEditing(false);
      const next = normalizeUrl(raw);
      if (!next || next === url) {
        setDraft(toDisplayUrl(url));
        return;
      }
      setLoading(true);
      router.push(`/preview?url=${encodeURIComponent(next)}&mode=${mode}&orientation=${orientation}`);
    },
    [mode, orientation, router, url],
  );

  // Must be a stable identity: an inline ref callback re-runs on every render and would
  // re-select the field after each keystroke.
  const selectOnMount = useCallback((node: HTMLInputElement | null) => {
    node?.select();
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, []);

  const zoom = Math.round(scale * 100);

  return (
    <div className="flex min-h-0 flex-1">
      <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-line-soft bg-panel/50 py-4 backdrop-blur-xl">
        <Link
          href="/"
          title="Back to home"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-ink"
        >
          <ArrowLeft />
          <span className="sr-only">Back to home</span>
        </Link>

        <span aria-hidden className="my-1 h-px w-7 bg-line" />

        <div
          className={`flex flex-col items-center gap-1 rounded-xl bg-white/[0.05] p-1 transition-opacity ${
            isAnimating ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <SegmentButton
            active={mode === "single"}
            onClick={() => requestFold("single")}
            label='Cover display — 5.4"'
          >
            <Phone />
          </SegmentButton>
          <SegmentButton
            active={mode === "extended"}
            onClick={() => requestFold("extended")}
            label='Inner display — 7.6"'
          >
            <Unfolded />
          </SegmentButton>
        </div>

        <ToolButton
          onClick={() => setOrientation((prev) => (prev === "portrait" ? "landscape" : "portrait"))}
          label={orientation === "portrait" ? "Rotate to landscape" : "Rotate to portrait"}
          active={orientation === "landscape"}
        >
          <Rotate />
        </ToolButton>

        <ToolButton onClick={() => setRefreshKey((key) => key + 1)} label="Reload preview">
          <Refresh />
        </ToolButton>

        <span aria-hidden className="my-1 h-px w-7 bg-line" />

        <ToolButton onClick={copyLink} label="Copy shareable link">
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <LinkIcon />}
        </ToolButton>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col bg-stage">
        <div className="flex shrink-0 justify-center px-4 pb-1 pt-4">
          <div className="w-full max-w-xl">
            {editing ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitUrl(draft);
                }}
              >
                <input
                  ref={selectOnMount}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => submitUrl(draft)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setEditing(false);
                      setDraft(toDisplayUrl(url));
                    }
                  }}
                  placeholder="example.com"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-10 w-full rounded-full border border-accent/50 bg-void px-5 text-center font-mono text-sm text-ink outline-none ring-2 ring-accent/20"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(toDisplayUrl(url));
                  setEditing(true);
                }}
                title="Click to change URL"
                className="group flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line-soft bg-panel/70 px-5 backdrop-blur-xl transition-colors hover:border-line hover:bg-panel"
              >
                <Globe className="h-3.5 w-3.5 shrink-0 text-faint" />
                <span className="truncate font-mono text-xs text-muted transition-colors group-hover:text-ink">
                  {toDisplayUrl(url)}
                </span>
              </button>
            )}
          </div>
        </div>

        <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 studio-grid opacity-40" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 55% at 50% 42%, transparent, rgba(7,7,9,0.85) 88%)",
          }}
        />

        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <div
            style={{
              transform: `perspective(1600px) rotateY(${fold.rotation}deg) scale(${fold.scale})`,
              transition: `transform ${fold.rotationMs}ms cubic-bezier(0.4, 0, 0.6, 1)`,
              transformOrigin: "center center",
              willChange: "transform",
            }}
          >
            <DeviceFrame mode={mode} metrics={metrics}>
              {/* A refused header is final, but an unreachable verdict only means our
                  server couldn't fetch it — let the browser have the last word. */}
              {blocked?.kind === "blocked" ? (
                <div className="h-full w-full bg-[#0e0e13]" />
              ) : (
                <iframe
                  key={`${url}-${refreshKey}`}
                  src={url}
                  title="Website preview"
                  onLoad={() => setLoading(false)}
                  onError={() => setLoading(false)}
                  referrerPolicy="no-referrer"
                  style={{
                    width: metrics.viewportWidth,
                    height: metrics.viewportHeight,
                    border: "none",
                    display: "block",
                    colorScheme: "light",
                  }}
                />
              )}

              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-50"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(150,170,255,0.20) 0%, rgba(255,255,255,0.38) 50%, rgba(150,170,255,0.20) 100%)",
                  backdropFilter: `blur(${22 * fold.glass}px)`,
                  opacity: fold.glass,
                  transition: `opacity ${fold.glassMs}ms ease, backdrop-filter ${fold.glassMs}ms ease`,
                }}
              />

              {fold.gleam && (
                <div
                  aria-hidden
                  className="animate-gleam pointer-events-none absolute inset-y-0 left-1/2 z-60 w-[3px] -translate-x-1/2"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.95) 70%, transparent)",
                  }}
                />
              )}

              {loading && !blocked && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0e0e13]">
                  <Spinner className="h-6 w-6 text-faint" />
                </div>
              )}
            </DeviceFrame>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
          <div className="flex items-center gap-2.5 rounded-full border border-line-soft bg-panel/80 px-3.5 py-1.5 font-mono text-[11px] text-muted backdrop-blur-xl">
            <span className="text-ink">
              {metrics.viewportWidth} × {metrics.viewportHeight}
            </span>
            <span className="text-faint">·</span>
            <span>{metrics.diagonal}&quot;</span>
            <span className="text-faint">·</span>
            <span>{zoom}%</span>
          </div>
        </div>

        {copied && (
          <div className="animate-toast pointer-events-none absolute bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs text-ink shadow-2xl">
            Link copied
          </div>
        )}
        </div>
      </div>

      {blocked && (
        <BlockedDialog
          detail={blocked}
          url={url}
          onDismiss={() => setBlocked(null)}
          onRetry={() => {
            setBlocked(null);
            setDraft(toDisplayUrl(url));
            setEditing(true);
          }}
        />
      )}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
        active
          ? "bg-white/[0.13] text-ink shadow-[0_1px_2px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/10"
          : "text-faint hover:text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function ToolButton({
  onClick,
  label,
  active = false,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/5 hover:text-ink ${
        active ? "bg-accent/15 text-accent-soft" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function BlockedDialog({
  detail,
  url,
  onDismiss,
  onRetry,
}: {
  detail: Blocked;
  url: string;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const isBlocked = detail.kind === "blocked";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="blocked-title"
      className="fixed inset-0 z-100 flex items-center justify-center bg-void/70 px-6 backdrop-blur-sm"
    >
      <div className="animate-rise relative w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-white/5 hover:text-ink"
        >
          <Close />
        </button>

        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-accent-soft">
          <ShieldOff className="h-5 w-5" />
        </div>

        <h2 id="blocked-title" className="mb-2 text-lg font-semibold tracking-tight text-ink">
          {isBlocked ? "This site refuses to be embedded" : "Couldn't load that site"}
        </h2>

        <p className="mb-4 text-sm leading-relaxed text-muted">
          {isBlocked ? (
            <>
              <span className="font-mono text-ink">{toDisplayUrl(url)}</span> sends a header that
              tells browsers not to display it inside a frame. Nothing can work around that from the
              browser — it&apos;s the site&apos;s own choice.
            </>
          ) : (
            detail.reason
          )}
        </p>

        {isBlocked && (
          <div className="mb-5 overflow-x-auto rounded-lg border border-line-soft bg-void px-3 py-2.5">
            <code className="whitespace-nowrap font-mono text-[11px] text-faint">
              <span className="text-accent-soft">{detail.header}</span>: {detail.value}
            </code>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="h-10 flex-1 rounded-xl bg-ink text-sm font-medium text-void transition-colors hover:bg-white"
          >
            Try another URL
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex h-10 items-center justify-center rounded-xl border border-line px-4 text-sm font-medium text-muted transition-colors hover:border-faint hover:text-ink"
          >
            Open directly
          </a>
        </div>
      </div>
    </div>
  );
}
