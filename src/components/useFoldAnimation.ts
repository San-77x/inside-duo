"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FoldMode } from "@/lib/devices";

export type FoldState = {
  rotation: number;
  rotationMs: number;
  glass: number;
  glassMs: number;
  scale: number;
  gleam: boolean;
};

const REST: FoldState = { rotation: 0, rotationMs: 0, glass: 0, glassMs: 0, scale: 1, gleam: false };

const SWING_MS = 280;
const SETTLE_MS = 390;

export function useFoldAnimation(mode: FoldMode, commit: (next: FoldMode) => void) {
  const [state, setState] = useState<FoldState>(REST);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clear, [clear]);

  const fold = useCallback(
    (next: FoldMode) => {
      if (next === mode || busy.current) return;

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) {
        commit(next);
        return;
      }

      busy.current = true;
      clear();

      // The panel swaps size mid-swing, so the frosted pane covers the reflow and the
      // rotation snaps to the mirrored angle before easing back to flat.
      const dir = next === "extended" ? -1 : 1;

      setState({
        rotation: -16 * dir,
        rotationMs: SWING_MS,
        glass: 1,
        glassMs: 220,
        scale: 0.97,
        gleam: false,
      });

      timers.current.push(
        setTimeout(() => {
          commit(next);
          setState((prev) => ({ ...prev, rotation: 16 * dir, rotationMs: 0, gleam: true }));
        }, SWING_MS),
      );

      timers.current.push(
        setTimeout(() => {
          setState({
            rotation: 0,
            rotationMs: SETTLE_MS,
            glass: 0,
            glassMs: 360,
            scale: 1,
            gleam: false,
          });
        }, SWING_MS + 15),
      );

      timers.current.push(
        setTimeout(() => {
          setState(REST);
          busy.current = false;
        }, SWING_MS + SETTLE_MS + 20),
      );
    },
    [clear, commit, mode],
  );

  const isAnimating = state.glass > 0 || state.rotation !== 0;

  return { state, isAnimating, fold };
}
