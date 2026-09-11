export type FoldMode = "single" | "extended";
export type Orientation = "portrait" | "landscape";

type Panel = {
  label: string;
  diagonal: number;
  width: number;
  height: number;
};

const PANELS: Record<FoldMode, Panel> = {
  single: { label: "Cover display", diagonal: 5.4, width: 466, height: 678 },
  extended: { label: "Inner display", diagonal: 7.6, width: 890, height: 626 },
};

export const BEZEL = 18;
export const FRAME_RADIUS = 44;
export const SCREEN_RADIUS = 24;

export type Metrics = {
  label: string;
  diagonal: number;
  viewportWidth: number;
  viewportHeight: number;
  totalWidth: number;
  totalHeight: number;
};

export function getMetrics(mode: FoldMode, orientation: Orientation): Metrics {
  const panel = PANELS[mode];
  const rotated = orientation === "landscape";
  const viewportWidth = rotated ? panel.height : panel.width;
  const viewportHeight = rotated ? panel.width : panel.height;

  return {
    label: panel.label,
    diagonal: panel.diagonal,
    viewportWidth,
    viewportHeight,
    totalWidth: viewportWidth + BEZEL * 2,
    totalHeight: viewportHeight + BEZEL * 2,
  };
}

export function parseMode(value: string | undefined): FoldMode {
  return value === "extended" ? "extended" : "single";
}

export function parseOrientation(value: string | undefined): Orientation {
  return value === "landscape" ? "landscape" : "portrait";
}
