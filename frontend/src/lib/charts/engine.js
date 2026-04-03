// FinTracker Chart Engine — reusable primitives for all SVG charts

/* ═══════════════════════════════════════════
   SCALE ENGINE — auto-calculates nice ticks
   ═══════════════════════════════════════════ */
export function niceScale(maxVal, tickCount = 4) {
  if (maxVal <= 0) return { max: 100, ticks: [0, 25, 50, 75, 100], step: 25 };
  const rough = maxVal / tickCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  let nice;
  if (residual <= 1.5) nice = 1;else
  if (residual <= 3) nice = 2;else
  if (residual <= 7) nice = 5;else
  nice = 10;
  const step = nice * mag;
  const niceMax = Math.ceil(maxVal / step) * step;
  const ticks = [];
  for (let i = 0; i <= niceMax; i += step) ticks.push(Math.round(i));
  return { max: niceMax, ticks, step };
}

/* ═══════════════════════════════════════════
   CHART CONFIG — shared padding & sizing
   ═══════════════════════════════════════════ */


export const DEFAULT_PAD = { l: 50, r: 16, t: 16, b: 32 };

export function chartDimensions(containerW, pad, aspectRatio = 0.48) {
  const h = Math.max(170, containerW * aspectRatio);
  return { w: containerW, h, chartW: containerW - pad.l - pad.r, chartH: h - pad.t - pad.b };
}

/* ═══════════════════════════════════════════
   TOOLTIP CLAMPING — prevents overflow
   ═══════════════════════════════════════════ */
export function clampTooltip(x, y, containerW, tooltipW = 140, tooltipH = 80) {
  return {
    x: Math.max(tooltipW / 2, Math.min(x, containerW - tooltipW / 2)),
    y: Math.max(tooltipH + 8, y)
  };
}

/* ═══════════════════════════════════════════
   DEBOUNCED RESIZE — prevent excessive renders
   ═══════════════════════════════════════════ */
export function debouncedResize(callback, delay = 100) {
  let timer;
  return (w) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(w), delay);
  };
}