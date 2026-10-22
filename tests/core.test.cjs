const { test } = require("node:test");
const assert = require("node:assert/strict");
const { erasedIntervals, textLayout } = require("../js/core.js");
const point = (x, y) => ({ x, y });

test("a circular eraser cuts only the center of a sparse stroke", () => {
  const intervals = erasedIntervals(
    point(0, 0),
    point(100, 0),
    point(50, 0),
    point(50, 0),
    10,
  );
  assert.deepEqual(intervals, [[0.4, 0.6]]);
});

test("fast erasing sweeps the complete path, including both round ends", () => {
  const intervals = erasedIntervals(
    point(0, 0),
    point(100, 0),
    point(30, 0),
    point(70, 0),
    10,
  );
  assert.equal(intervals.length, 1);
  assert.ok(Math.abs(intervals[0][0] - 0.2) < 1e-9);
  assert.ok(Math.abs(intervals[0][1] - 0.8) < 1e-9);
  assert.deepEqual(
    erasedIntervals(
      point(0, 20),
      point(100, 20),
      point(30, 0),
      point(70, 0),
      10,
    ),
    [],
  );
});

test("eraser handles dots and strokes completely covered by the brush", () => {
  assert.deepEqual(
    erasedIntervals(point(5, 5), point(5, 5), point(5, 5), point(5, 5), 10),
    [[0, 1]],
  );
  assert.deepEqual(
    erasedIntervals(point(0, 0), point(1, 0), point(0, 0), point(0, 0), 10),
    [[0, 1]],
  );
});

// Deterministic font metrics isolate wrapping behavior from browser/CDN loading.
const font = {
  widthOfTextAtSize: (text, size) => text.length * size,
  heightAtSize: (size) => size * 0.8,
};
test("layout preserves paragraph breaks and wraps long words within the placement", () => {
  const rec = { text: "one two\nabcdefghij\n", w: 66 / 612, size: 10 };
  const layout = textLayout(rec, font);
  assert.deepEqual(layout.lines, ["one", "two", "abcdef", "ghij", ""]);
  assert.equal(layout.baseline, 11);
  assert.equal(layout.lineHeight, 12);
});

test("partial erasing splits strokes, preserves other pages, and leaves inputs intact", () => {
  const { eraseStrokes } = require("../js/core.js");
  const source = [
    {
      page: 1,
      width: 4,
      color: "#000000",
      points: [point(0, 0.5), point(1, 0.5)],
    },
    {
      page: 2,
      width: 4,
      color: "#000000",
      points: [point(0, 0.5), point(1, 0.5)],
    },
  ];
  const before = structuredClone(source);
  const result = eraseStrokes(source, {
    page: 1,
    from: point(0.5, 0.4),
    to: point(0.5, 0.6),
    eraserWidth: 20,
    aspectRatio: 792 / 612,
  });
  assert.equal(result.changed, true);
  assert.equal(result.strokes.length, 3);
  assert.equal(result.strokes[2], source[1]);
  assert.equal(result.strokes[0].points[0].x, 0);
  assert.ok(result.strokes[0].points.at(-1).x < 0.5);
  assert.ok(result.strokes[1].points[0].x > 0.5);
  assert.equal(result.strokes[1].points.at(-1).x, 1);
  assert.deepEqual(source, before);
});
