import type { ReactNode } from "react";
import { BEZEL, FRAME_RADIUS, SCREEN_RADIUS, type FoldMode, type Metrics } from "@/lib/devices";

type Props = {
  mode: FoldMode;
  metrics: Metrics;
  children: ReactNode;
};

export function DeviceFrame({ mode, metrics, children }: Props) {
  return (
    <div
      className="device-rail relative shrink-0"
      style={{
        width: metrics.totalWidth,
        height: metrics.totalHeight,
        borderRadius: FRAME_RADIUS,
        boxSizing: "content-box",
        boxShadow:
          "0 2px 1px rgba(255,255,255,0.10) inset, 0 -2px 2px rgba(0,0,0,0.6) inset, 0 50px 120px -20px rgba(0,0,0,0.9), 0 0 90px -30px rgba(124,108,255,0.55)",
      }}
    >
      {mode === "single" && (
        <div
          aria-hidden
          className="absolute z-10 rounded-full"
          style={{
            top: BEZEL / 2 - 4,
            right: 26,
            width: 11,
            height: 11,
            background: "radial-gradient(circle at 32% 28%, #33333d 0%, #08080b 62%)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        />
      )}

      <div
        className="relative overflow-hidden bg-black"
        style={{
          width: metrics.viewportWidth,
          height: metrics.viewportHeight,
          margin: BEZEL,
          borderRadius: SCREEN_RADIUS,
          isolation: "isolate",
        }}
      >
        {children}

        {/* A crease needs both a shadow and a highlight so it stays visible whether the
            previewed site is light or dark. */}
        {mode === "extended" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-0.5 -translate-x-1/2"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.13) 0 50%, rgba(255,255,255,0.13) 50% 100%)",
              maskImage:
                "linear-gradient(180deg, transparent, #000 9%, #000 91%, transparent)",
            }}
          />
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-40"
          style={{
            borderRadius: SCREEN_RADIUS,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        />
      </div>
    </div>
  );
}
