/* DOM-free geometry and text layout, shared by preview, export, and tests.
 * Annotation positions are normalized to the page; font/brush sizes use a
 * canonical page width of 612 points. Keep this coordinate contract stable.
 */
(function (root) {
  "use strict";
  const PAGE_WIDTH = 612;
  function textLayout(rec, textFont) {
    const maxWidth = Math.max(1, rec.w * PAGE_WIDTH - 6);
    const lines = [];
    for (const paragraph of rec.text.split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? line + " " + word : word;
        if (
          line &&
          textFont.widthOfTextAtSize(candidate, rec.size) > maxWidth
        ) {
          lines.push(line);
          line = "";
        }
        for (const char of (line ? " " : "") + word) {
          if (
            line &&
            textFont.widthOfTextAtSize(line + char, rec.size) > maxWidth
          ) {
            lines.push(line);
            line = "";
          }
          line += char;
        }
      }
      lines.push(line);
    }
    return {
      lines,
      baseline: 3 + textFont.heightAtSize(rec.size, { descender: false }),
      lineHeight: rec.size * 1.2,
    };
  }
  function erasedIntervals(a, b, from, to, radius) {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const intervals = [];
    function circle(center) {
      const x = a.x - center.x,
        y = a.y - center.y;
      const aa = dx * dx + dy * dy;
      if (aa < 1e-12) {
        if (x * x + y * y <= radius * radius) intervals.push([0, 1]);
        return;
      }
      const bb = 2 * (x * dx + y * dy),
        cc = x * x + y * y - radius * radius;
      const discriminant = bb * bb - 4 * aa * cc;
      if (discriminant < 0) return;
      const root = Math.sqrt(discriminant);
      const lo = Math.max(0, (-bb - root) / (2 * aa));
      const hi = Math.min(1, (-bb + root) / (2 * aa));
      if (lo < hi) intervals.push([lo, hi]);
    }
    circle(from);
    circle(to);
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length > 1e-9) {
      const ux = (to.x - from.x) / length,
        uy = (to.y - from.y) / length;
      let lo = 0,
        hi = 1;
      function band(value, delta, min, max) {
        if (Math.abs(delta) < 1e-12) return value >= min && value <= max;
        const t1 = (min - value) / delta,
          t2 = (max - value) / delta;
        lo = Math.max(lo, Math.min(t1, t2));
        hi = Math.min(hi, Math.max(t1, t2));
        return lo < hi;
      }
      const x = a.x - from.x,
        y = a.y - from.y;
      if (
        band(x * ux + y * uy, dx * ux + dy * uy, 0, length) &&
        band(-x * uy + y * ux, -dx * uy + dy * ux, -radius, radius)
      )
        intervals.push([lo, hi]);
    }
    intervals.sort((x, y) => x[0] - y[0]);
    const merged = [];
    for (const interval of intervals) {
      const last = merged.at(-1);
      if (last && interval[0] <= last[1] + 1e-9)
        last[1] = Math.max(last[1], interval[1]);
      else merged.push(interval.slice());
    }
    return merged;
  }
  // Return new stroke fragments without mutating the editor or input strokes.
  function eraseStrokes(strokes, { page, from, to, eraserWidth, aspectRatio }) {
    const height = PAGE_WIDTH * aspectRatio;
    const metric = (point) => ({
      x: point.x * PAGE_WIDTH,
      y: point.y * height,
    });
    const start = metric(from),
      end = metric(to);
    let changed = false;
    const next = strokes.flatMap((stroke) => {
      if (stroke.page !== page) return [stroke];
      const radius = (eraserWidth + stroke.width) / 2;
      if (stroke.points.length === 1) {
        const point = metric(stroke.points[0]);
        if (erasedIntervals(point, point, start, end, radius).length) {
          changed = true;
          return [];
        }
        return [stroke];
      }
      let cut = false;
      const pieces = [];
      for (let i = 1; i < stroke.points.length; i++) {
        const a = stroke.points[i - 1],
          b = stroke.points[i];
        const intervals = erasedIntervals(
          metric(a),
          metric(b),
          start,
          end,
          radius,
        );
        if (intervals.length) cut = true;
        const outside = [];
        let t = 0;
        for (const [lo, hi] of intervals) {
          if (lo > t) outside.push([t, lo]);
          t = Math.max(t, hi);
        }
        if (t < 1) outside.push([t, 1]);
        for (const [lo, hi] of outside) {
          const point = (t) => ({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
          });
          const first = point(lo),
            last = point(hi),
            previous = pieces.at(-1);
          const tail = previous?.at(-1);
          if (tail && Math.hypot(tail.x - first.x, tail.y - first.y) < 1e-9)
            previous.push(last);
          else pieces.push([first, last]);
        }
      }
      if (!cut) return [stroke];
      changed = true;
      return pieces.map((points) => ({ ...stroke, points }));
    });
    return { strokes: next, changed };
  }
  const core = Object.freeze({
    PAGE_WIDTH,
    textLayout,
    erasedIntervals,
    eraseStrokes,
  });
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  else root.SignFlowCore = core;
})(typeof globalThis !== "undefined" ? globalThis : this);
