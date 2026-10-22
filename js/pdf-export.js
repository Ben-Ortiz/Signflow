"use strict";
/* Owns export resources. Never reads live editor state while awaiting work. */
window.SignFlowExport = async function ({ bytes, placements, strokes }) {
  const { PAGE_WIDTH } = SignFlowCore;
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  try {
    const pdf = await loadingTask.promise;
    function hexRgb(hex) {
      return PDFLib.rgb(
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255,
      );
    }
    const doc = await PDFLib.PDFDocument.load(bytes, {
      ignoreEncryption: false,
    });
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const textLayout = (rec) => SignFlowCore.textLayout(rec, font);
    // Drafts remain editable in the UI, but only Done commits them to export.
    for (const rec of placements.filter((item) => item.confirmed === true)) {
      const page = doc.getPage(rec.page - 1),
        { width, height } = page.getSize();
      if (rec.kind === "text") {
        const sourcePage = await pdf.getPage(rec.page);
        const viewport = sourcePage.getViewport({ scale: 1 });
        const scale = viewport.width / PAGE_WIDTH;
        const left = rec.x * viewport.width,
          top = rec.y * viewport.height;
        const layout = textLayout(rec);
        const corners = [
          [left, top],
          [left + rec.w * viewport.width, top],
          [left + rec.w * viewport.width, top + rec.h * viewport.height],
          [left, top + rec.h * viewport.height],
        ].map(([x, y]) => viewport.convertToPdfPoint(x, y));
        page.pushOperators(
          PDFLib.pushGraphicsState(),
          PDFLib.moveTo(...corners[0]),
          ...corners.slice(1).map(([x, y]) => PDFLib.lineTo(x, y)),
          PDFLib.closePath(),
          PDFLib.clip(),
          PDFLib.endPath(),
        );
        layout.lines.forEach((line, index) => {
          const [x, y] = viewport.convertToPdfPoint(
            left + 3 * scale,
            top + (layout.baseline + index * layout.lineHeight) * scale,
          );
          page.drawText(line, {
            x,
            y,
            size: rec.size * scale,
            font,
            rotate: PDFLib.degrees(viewport.rotation),
            color: PDFLib.rgb(0.067, 0.067, 0.067),
          });
        });
        page.pushOperators(PDFLib.popGraphicsState());
      } else {
        const img = await doc.embedPng(rec.url);
        page.drawImage(img, {
          x: rec.x * width,
          y: height - (rec.y + rec.h) * height,
          width: rec.w * width,
          height: rec.h * height,
        });
      }
    }
    for (const stroke of strokes) {
      const page = doc.getPage(stroke.page - 1),
        { width, height } = page.getSize();
      const color = hexRgb(stroke.color),
        thickness = (stroke.width * width) / PAGE_WIDTH,
        pts = stroke.points;
      if (pts.length === 1) {
        page.drawCircle({
          x: pts[0].x * width,
          y: (1 - pts[0].y) * height,
          size: thickness / 2,
          color,
        });
      } else
        for (let i = 1; i < pts.length; i++) {
          page.drawLine({
            start: {
              x: pts[i - 1].x * width,
              y: (1 - pts[i - 1].y) * height,
            },
            end: { x: pts[i].x * width, y: (1 - pts[i].y) * height },
            thickness,
            color,
          });
        }
    }
    return await doc.save();
  } finally {
    // Resource cleanup must not turn a successful export into a failed download.
    await loadingTask
      .destroy()
      .catch((error) =>
        console.error("Could not release the export PDF.", error),
      );
  }
};
