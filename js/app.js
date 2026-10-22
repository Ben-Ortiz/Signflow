(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    pad = $("pad"),
    ctx = pad.getContext("2d"),
    pdfCanvas = $("pdfCanvas"),
    pdfCtx = pdfCanvas.getContext("2d"),
    wrap = $("pageWrap");
  let bytes = null,
    pdf = null,
    pageNum = 1,
    pages = 0,
    placements = [],
    strokes = [],
    paintHistory = [],
    painting = false,
    paintTool = "pen",
    activeStroke = null,
    signatureMode = "draw",
    selected = null,
    navigating = false;
  const message = (s) => {
    $("status").textContent = s;
    $("mobileStatus").textContent = s;
  };
  if (
    !window.pdfjsLib ||
    !window.PDFLib ||
    !window.SignFlowCore ||
    !window.SignFlowExport
  ) {
    message(
      "PDF tools could not load. Check your connection and reload the page.",
    );
    $("pdfFile").disabled = true;
    return;
  }
  const { PAGE_WIDTH } = SignFlowCore;
  const mobile = matchMedia("(max-width: 850px)");
  let textFont, fontError;
  const textFontReady = PDFLib.PDFDocument.create()
    .then((doc) => doc.embedFont(PDFLib.StandardFonts.Helvetica))
    .then((font) => {
      textFont = font;
    })
    .catch((error) => {
      fontError = error;
    });
  const textLayout = (rec) => SignFlowCore.textLayout(rec, textFont);
  // Editor history and tool panels
  let documentZoom = 1;
  let editHistory = [],
    pendingPlacement = null,
    editingTextId = null;
  let sheetOpener = null;
  function updateUndo() {
    $("undoEdit").disabled = $("mobileUndo").disabled =
      navigating || !editHistory.length;
  }
  function recordEdit() {
    editHistory.push(structuredClone({ placements, strokes }));
    if (editHistory.length > 50) editHistory.shift();
    updateUndo();
  }
  function undoEdit() {
    if (!editHistory.length) return;
    ({ placements, strokes } = editHistory.pop());
    selected = pendingPlacement = editingTextId = null;
    paintHistory = [];
    updateUndo();
    drawStamps();
    redrawPaint();
    message("Last edit undone.");
  }
  $("undoEdit").onclick = $("mobileUndo").onclick = undoEdit;
  function closeSheet() {
    editingTextId = null;
    $("addText").textContent = "Place text";
    $("addDate").textContent = "Place date";
    $("app").classList.remove("panel-open");
    $("sheetBackdrop").classList.add("hidden");
    $("editorTools").removeAttribute("role");
    $("editorTools").removeAttribute("aria-modal");
    $("editorTools").removeAttribute("aria-labelledby");
    $("documentPreview").inert = false;
    document.querySelector(".mobile-header").inert = false;
    document.querySelector(".mobile-nav").inert = false;
    for (const id of [
      "mobileSign",
      "mobileDate",
      "mobileText",
      "mobileDraw",
      "mobileMore",
    ])
      $(id).setAttribute("aria-expanded", "false");
    if (sheetOpener && mobile.matches)
      sheetOpener.focus({ preventScroll: true });
    sheetOpener = null;
  }
  function openTool(tool) {
    if (painting && tool !== "draw") setPainting(false);
    if (tool === "draw") $("paintControls").classList.remove("hidden");
    if (tool === "text" && !editingTextId)
      $("addText").textContent = "Place text";
    if (tool === "date" && !editingTextId)
      $("addDate").textContent = "Place date";
    if (!mobile.matches) {
      $(
        tool === "sign" ? "typed" : tool === "date" ? "dateValue" : "plainText",
      ).focus();
      return;
    }
    sheetOpener = document.activeElement;
    $("app").dataset.tool = tool;
    $("sheetTitle").textContent = {
      sign: "Create your signature",
      date: "Choose a date",
      text: "Add text",
      draw: "Freehand drawing",
      more: "Document tools",
    }[tool];
    $("closeSheet").setAttribute(
      "aria-label",
      tool === "draw" ? "Close settings and start drawing" : "Close tools",
    );
    $("app").classList.add("panel-open");
    $("sheetBackdrop").classList.remove("hidden");
    $("editorTools").setAttribute("role", "dialog");
    $("editorTools").setAttribute(
      "aria-modal",
      tool === "draw" ? "false" : "true",
    );
    $("editorTools").setAttribute("aria-labelledby", "sheetTitle");
    $("documentPreview").inert = true;
    document.querySelector(".mobile-header").inert = true;
    document.querySelector(".mobile-nav").inert = tool !== "draw";
    for (const id of [
      "mobileSign",
      "mobileDate",
      "mobileText",
      "mobileDraw",
      "mobileMore",
    ])
      $(id).setAttribute("aria-expanded", "false");
    const trigger = {
      sign: "mobileSign",
      date: "mobileDate",
      text: "mobileText",
      draw: "mobileDraw",
      more: "mobileMore",
    }[tool];
    $(trigger).setAttribute("aria-expanded", "true");
    $("closeSheet").focus({ preventScroll: true });
  }
  $("mobileSign").onclick = () => {
    if (requireConfirmedSignatures()) openTool("sign");
  };
  $("mobileText").onclick = () => {
    editingTextId = null;
    openTool("text");
  };
  $("mobileMore").onclick = () => openTool("more");
  function startDrawing() {
    closeSheet();
    setPainting(true);
    message(
      "Draw on the PDF. Tap Draw for settings; choose another tool to stop drawing.",
    );
  }
  $("mobileDraw").onclick = () => {
    if (
      $("app").classList.contains("panel-open") &&
      $("app").dataset.tool === "draw"
    ) {
      startDrawing();
    } else openTool("draw");
  };
  $("closeSheet").onclick = () => {
    if (
      $("app").classList.contains("panel-open") &&
      $("app").dataset.tool === "draw"
    )
      startDrawing();
    else closeSheet();
  };
  $("sheetBackdrop").onclick = closeSheet;
  document.addEventListener("keydown", (e) => {
    if (!mobile.matches || !$("app").classList.contains("panel-open")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeSheet();
    }
    if (e.key === "Tab" && $("app").dataset.tool !== "draw") {
      const controls = [
        ...$("editorTools").querySelectorAll(
          "button:not(:disabled), input, select",
        ),
      ].filter((el) => el.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  mobile.addEventListener("change", () => {
    closeSheet();
    render();
  });
  // Document zoom and touch gestures
  let pinch = null,
    suppressTouch = false,
    cancelDocumentDrag = null;
  let touchSnapshot = null,
    lastPinchEnd = -Infinity;
  const touchPointers = new Set(),
    workspace = $("workspace");
  workspace.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType !== "touch") return;
      if (!touchPointers.size && !suppressTouch) {
        touchSnapshot = {
          ...structuredClone({
            placements,
            strokes,
            selected,
            pendingPlacement,
          }),
          edits: editHistory.slice(),
          paintEdits: paintHistory.slice(),
        };
      }
      touchPointers.add(e.pointerId);
    },
    true,
  );
  for (const type of ["pointerup", "pointercancel"])
    workspace.addEventListener(
      type,
      (e) => touchPointers.delete(e.pointerId),
      true,
    );
  const pinchPoints = (e) =>
    [...e.touches].filter((touch) => workspace.contains(touch.target));
  function pinchGeometry(points) {
    return {
      x: (points[0].clientX + points[1].clientX) / 2,
      y: (points[0].clientY + points[1].clientY) / 2,
      distance: Math.hypot(
        points[0].clientX - points[1].clientX,
        points[0].clientY - points[1].clientY,
      ),
    };
  }
  workspace.addEventListener(
    "touchstart",
    (e) => {
      const points = pinchPoints(e);
      if (!pdf || navigating || points.length < 2 || pinch) return;
      e.preventDefault();
      suppressTouch = true;
      cancelDocumentDrag?.();
      if (touchSnapshot) {
        ({ placements, strokes, selected, pendingPlacement } = touchSnapshot);
        editHistory = touchSnapshot.edits;
        paintHistory = touchSnapshot.paintEdits;
        updateUndo();
      }
      activeStroke = null;
      erasing = false;
      eraserLast = null;
      eraserRecorded = false;
      hideBrushCursor();
      const center = pinchGeometry(points),
        rect = wrap.getBoundingClientRect();
      pinch = {
        ...center,
        startX: center.x,
        startY: center.y,
        startZoom: documentZoom,
        zoom: documentZoom,
        u: (center.x - rect.left) / rect.width,
        v: (center.y - rect.top) / rect.height,
        document: pdf,
        page: pageNum,
      };
      wrap.style.transformOrigin = `${pinch.u * 100}% ${pinch.v * 100}%`;
      wrap.style.willChange = "transform";
    },
    { passive: false, capture: true },
  );
  workspace.addEventListener(
    "touchmove",
    (e) => {
      if (!pinch && !suppressTouch) return;
      e.preventDefault();
      const points = pinchPoints(e);
      if (!pinch || points.length < 2) return;
      const center = pinchGeometry(points);
      pinch.zoom = Math.max(
        1,
        Math.min(
          3,
          (pinch.startZoom * center.distance) / Math.max(1, pinch.distance),
        ),
      );
      pinch.x = center.x;
      pinch.y = center.y;
      wrap.style.transform = `translate(${center.x - pinch.startX}px, ${center.y - pinch.startY}px) scale(${pinch.zoom / pinch.startZoom})`;
    },
    { passive: false, capture: true },
  );
  async function finishPinch(e) {
    if (!pinch && !suppressTouch) return;
    if (e.cancelable) e.preventDefault();
    if (pinch && !e.touches.length) {
      const finished = pinch;
      pinch = null;
      lastPinchEnd = performance.now();
      wrap.style.transform =
        wrap.style.transformOrigin =
        wrap.style.willChange =
          "";
      if (finished.document === pdf && finished.page === pageNum)
        await setDocumentZoom(finished.zoom, finished);
    }
    if (!e.touches.length) {
      touchPointers.clear();
      touchSnapshot = null;
      suppressTouch = false;
    }
  }
  for (const type of ["touchend", "touchcancel"])
    workspace.addEventListener(
      type,
      (e) => {
        finishPinch(e).catch((err) =>
          message("Could not zoom the document: " + err.message),
        );
      },
      { passive: false, capture: true },
    );
  // Safari emits gesture events in addition to touch events. Keep its page zoom unchanged.
  for (const type of ["gesturestart", "gesturechange", "gestureend"])
    workspace.addEventListener(
      type,
      (e) => {
        if (
          pdf &&
          (mobile.matches ||
            pinch ||
            suppressTouch ||
            touchPointers.size >= 2) &&
          e.cancelable
        )
          e.preventDefault();
      },
      { passive: false },
    );
  workspace.addEventListener(
    "click",
    (e) => {
      if (suppressTouch || performance.now() - lastPinchEnd < 300) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  async function setDocumentZoom(value, anchor = null) {
    documentZoom = Math.max(1, Math.min(3, value));
    $("app").classList.toggle("document-zoomed", documentZoom > 1);
    $("zoomLabel").textContent = Math.round(documentZoom * 100) + "%";
    $("zoomOut").disabled = !pdf || documentZoom <= 1;
    $("zoomIn").disabled = !pdf || documentZoom >= 3;
    $("zoomFit").disabled = !pdf;
    if (!anchor) workspace.scrollLeft = 0;
    await render();
    if (anchor && anchor.document === pdf && anchor.page === pageNum) {
      let rect = wrap.getBoundingClientRect();
      workspace.scrollLeft += rect.left + anchor.u * rect.width - anchor.x;
      workspace.scrollTop += rect.top + anchor.v * rect.height - anchor.y;
      rect = wrap.getBoundingClientRect();
      window.scrollBy(0, rect.top + anchor.v * rect.height - anchor.y);
    }
  }
  // DOM event dispatch does not await promises; handle zoom failures explicitly.
  function zoomTo(value) {
    setDocumentZoom(value).catch((error) =>
      message("Could not zoom PDF: " + error.message),
    );
  }
  $("zoomIn").onclick = () => zoomTo(documentZoom + 0.5);
  $("zoomOut").onclick = () => zoomTo(documentZoom - 0.5);
  $("zoomFit").onclick = () => zoomTo(1);
  function showView(preview, refresh = true) {
    if (!preview) return;
    closeSheet();
    if (mobile.matches && document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    if (refresh) render();
  }
  $("mobileSave").onclick = () => {
    if (painting) setPainting(false);
    closeSheet();
    $("download").click();
  };
  new MutationObserver(() => {
    $("mobileSave").disabled = $("download").disabled;
  }).observe($("download"), {
    attributes: true,
    attributeFilter: ["disabled"],
  });
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  function initPad() {
    const rect = pad.getBoundingClientRect(),
      dpr = devicePixelRatio || 1;
    if (!rect.width || pad.width === Math.round(rect.width * dpr)) return;
    const saved = document.createElement("canvas");
    saved.width = pad.width;
    saved.height = pad.height;
    saved.getContext("2d").drawImage(pad, 0, 0);
    pad.width = Math.round(rect.width * dpr);
    pad.height = Math.round(150 * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#141827";
    ctx.drawImage(saved, 0, 0, rect.width, 150);
  }
  initPad();
  new ResizeObserver(initPad).observe(pad);
  let drawing = false,
    last = null;
  function pt(e) {
    const r = pad.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  pad.addEventListener("pointerdown", (e) => {
    drawing = true;
    pad.setPointerCapture(e.pointerId);
    last = pt(e);
    ctx.beginPath();
    ctx.arc(last.x, last.y, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = "#141827";
    ctx.fill();
  });
  pad.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = pt(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  });
  pad.addEventListener("pointerup", () => (drawing = false));
  pad.addEventListener("pointercancel", () => (drawing = false));
  $("clearPad").onclick = () => ctx.clearRect(0, 0, pad.width, pad.height);
  $("drawTab").onclick = () => setMode("draw");
  $("typeTab").onclick = () => setMode("type");
  function setMode(m) {
    signatureMode = m;
    $("drawTab").classList.toggle("active", m === "draw");
    $("typeTab").classList.toggle("active", m === "type");
    $("drawControls").style.display = m === "draw" ? "block" : "none";
    $("typedControls").style.display = m === "type" ? "block" : "none";
  }
  $("typed").oninput = () => {
    $("typedPreview").textContent = $("typed").value || "Your signature";
  };
  function signatureImage() {
    const out = document.createElement("canvas");
    out.width = 1100;
    out.height = 300;
    const c = out.getContext("2d");
    if (signatureMode === "type") {
      const str = $("typed").value.trim();
      if (!str) throw Error("Type your name first.");
      c.fillStyle = "#111";
      c.textAlign = "center";
      c.textBaseline = "middle";
      const size = Math.min(105, Math.floor(990 / (str.length * 0.58)));
      c.font = `italic ${Math.max(22, size)}px "Brush Script MT", "Segoe Script", cursive`;
      c.fillText(str, 550, 150, 1050);
    } else {
      const pixels = ctx.getImageData(0, 0, pad.width, pad.height);
      const p = pixels.data;
      let minX = pad.width,
        minY = pad.height,
        maxX = -1,
        maxY = -1;
      for (let y = 0; y < pad.height; y++)
        for (let x = 0; x < pad.width; x++) {
          if (p[(y * pad.width + x) * 4 + 3] > 10) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      if (maxX < 0) throw Error("Draw your signature first.");
      const w = maxX - minX + 1,
        h = maxY - minY + 1;
      const ratio = Math.min(1000 / w, 250 / h);
      c.drawImage(
        pad,
        minX,
        minY,
        w,
        h,
        (1100 - w * ratio) / 2,
        (300 - h * ratio) / 2,
        w * ratio,
        h * ratio,
      );
    }
    return out.toDataURL("image/png");
  }
  // PDF loading and page rendering
  let loadRevision = 0;
  $("pdfFile").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const revision = ++loadRevision;
    let loadingTask = null;
    message("Opening PDF…");
    try {
      const nextBytes = new Uint8Array(await file.arrayBuffer());
      if (revision !== loadRevision) return;
      loadingTask = pdfjsLib.getDocument({ data: nextBytes.slice() });
      const candidate = await loadingTask.promise;
      await textFontReady;
      if (fontError) throw fontError;
      // Render offscreen first: corrupt page data must not replace current edits.
      const firstPage = await candidate.getPage(1);
      const probe = document.createElement("canvas");
      await firstPage.render({
        canvasContext: probe.getContext("2d"),
        viewport: firstPage.getViewport({ scale: 0.25 }),
      }).promise;
      if (revision !== loadRevision) return;
      await renderQueue.catch(() => {});
      if (revision !== loadRevision) return;
      const previous = pdf;
      pdf = candidate;
      loadingTask = null;
      bytes = nextBytes;
      if (previous) previous.destroy().catch(console.error);
      pages = pdf.numPages;
      pageNum = 1;
      documentZoom = 1;
      $("app").classList.remove("document-zoomed");
      $("zoomLabel").textContent = "100%";
      $("zoomOut").disabled = true;
      $("zoomIn").disabled = false;
      $("zoomFit").disabled = false;
      $("workspace").scrollLeft = 0;
      $("workspace").scrollTop = 0;
      placements = [];
      strokes = [];
      paintHistory = [];
      editHistory = [];
      selected = pendingPlacement = editingTextId = null;
      updateUndo();
      for (const id of ["mobileSign", "mobileDate", "mobileText", "mobileDraw"])
        $(id).disabled = false;
      $("mobileFilename").textContent = file.name;
      setPainting(false);
      $("filename").textContent = file.name;
      $("empty").classList.add("hidden");
      wrap.classList.remove("hidden");
      $("add").disabled = false;
      $("addText").disabled = false;
      $("addDate").disabled = false;
      $("paintToggle").disabled = false;
      $("download").disabled = exporting;
      if (mobile.matches) showView(true, false);
      await render();
      if (mobile.matches) window.scrollTo(0, 0);
      message(
        mobile.matches
          ? "Choose Sign, Date, or Text to get started."
          : "PDF loaded. Create a signature to place it.",
      );
    } catch (err) {
      if (revision === loadRevision)
        message(
          "Could not open PDF: " +
            err.message +
            (pdf ? ". Your current document is still open." : ""),
        );
    } finally {
      if (loadingTask)
        await loadingTask
          .destroy()
          .catch((error) =>
            console.error("Could not release the unused PDF.", error),
          );
      // Allow choosing the same file again after an error.
      if (revision === loadRevision) $("pdfFile").value = "";
    }
  };

  let renderQueue = Promise.resolve();
  function render() {
    renderQueue = renderQueue.catch(() => {}).then(renderPage);
    renderQueue.catch((error) =>
      message("Could not display page: " + error.message),
    );
    return renderQueue;
  }
  async function renderPage() {
    if (!pdf || !$("workspace").clientWidth || pinch) return;
    const current = pageNum,
      document = pdf;
    const page = await document.getPage(current);
    if (current !== pageNum || document !== pdf) return;
    const natural = page.getViewport({ scale: 1 });
    const workspaceStyle = getComputedStyle($("workspace"));
    const available = Math.max(
      1,
      $("workspace").clientWidth -
        parseFloat(workspaceStyle.paddingLeft) -
        parseFloat(workspaceStyle.paddingRight),
    );
    const scale =
      (mobile.matches
        ? available / natural.width
        : Math.min(1.6, available / natural.width)) * documentZoom;
    const viewport = page.getViewport({ scale });
    pdfCanvas.width = Math.floor(viewport.width);
    pdfCanvas.height = Math.floor(viewport.height);
    pdfCanvas.style.width = viewport.width + "px";
    pdfCanvas.style.height = viewport.height + "px";
    wrap.style.width = viewport.width + "px";
    wrap.style.height = viewport.height + "px";
    await page.render({ canvasContext: pdfCtx, viewport }).promise;
    if (current !== pageNum || document !== pdf) return;
    $("pageLabel").textContent = `Page ${pageNum} of ${pages}`;
    $("prev").disabled = navigating || pageNum === 1;
    $("next").disabled = navigating || pageNum === pages;
    drawStamps();
    redrawPaint();
  }
  async function changePage(offset) {
    const target = pageNum + offset;
    if (
      !pdf ||
      navigating ||
      pinch ||
      suppressTouch ||
      target < 1 ||
      target > pages
    )
      return;
    const previous = pageNum;
    const drafts = placements.filter((rec) => rec.confirmed === false);
    const previousPages = drafts.map((rec) => rec.page);
    navigating = true;
    if (drafts.length) {
      recordEdit();
      drafts.forEach((rec) => {
        rec.page = target;
      });
    }
    editingTextId = null;
    activeStroke = null;
    closeSheet();
    wrap.inert = true;
    wrap.setAttribute("aria-busy", "true");
    wrap
      .querySelectorAll(".stamp.selected")
      .forEach((el) => el.classList.remove("selected"));
    const controls = [
      "prev",
      "next",
      "add",
      "addText",
      "addDate",
      "mobileSign",
      "mobileDate",
      "mobileText",
      "mobileDraw",
      "paintToggle",
      "pdfFile",
    ];
    controls.forEach((id) => ($(id).disabled = true));
    updateUndo();
    pageNum = target;
    $("pageLabel").textContent = `Loading page ${target}…`;
    try {
      await render();
      message(
        drafts.length
          ? `Page ${target} of ${pages}. Unconfirmed items follow you. Tap Done to keep each item on this page.`
          : `Page ${target} of ${pages}. Confirmed items stay on their original pages.`,
      );
    } catch (err) {
      pageNum = previous;
      drafts.forEach((rec, index) => {
        rec.page = previousPages[index];
      });
      if (drafts.length) editHistory.pop();
      try {
        await render();
      } catch {
        /* Keep edits available for export. */
      }
      message(
        "Could not change page: " +
          err.message +
          ". Your edits are still kept.",
      );
    } finally {
      navigating = false;
      wrap.inert = false;
      wrap.removeAttribute("aria-busy");
      controls.forEach((id) => ($(id).disabled = !pdf));
      $("prev").disabled = !pdf || pageNum === 1;
      $("next").disabled = !pdf || pageNum === pages;
      updateUndo();
    }
  }
  $("prev").onclick = () => changePage(-1);
  $("next").onclick = () => changePage(1);
  function requireConfirmedSignatures() {
    const unfinished = placements.find(
      (item) => item.kind !== "text" && item.confirmed !== true,
    );
    if (!unfinished) return true;
    selected = unfinished.id;
    if (painting) setPainting(false);
    closeSheet();
    drawStamps();
    message(
      "Tap Done on your unfinished signature, or delete it, before adding another signature.",
    );
    const stamp = wrap.querySelector(".stamp.selected");
    stamp?.scrollIntoView({ block: "center", inline: "nearest" });
    stamp
      ?.querySelector('button[aria-label="Confirm position"]')
      ?.focus({ preventScroll: true });
    return false;
  }
  $("add").onclick = () => {
    if (!pdf || !requireConfirmedSignatures()) return;
    try {
      const url = signatureImage();
      const rec = {
        id: Date.now() + Math.random(),
        confirmed: false,
        page: pageNum,
        x: 0.28,
        y: 0.35,
        w: 0.42,
        h: 0.12,
        url,
      };
      recordEdit();
      placements.push(rec);
      selected = pendingPlacement = rec.id;
      drawStamps();
      message(
        "Tap the page to place your signature. Drag to adjust, then tap Done.",
      );
      if (mobile.matches) showView(true);
    } catch (e) {
      message(e.message);
    }
  };
  function todayValue() {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }
  function formattedDate() {
    const value = $("dateValue").value;
    if (!value || !$("dateValue").checkValidity()) return "";
    const [year, month, day] = value.split("-");
    if ($("dateFormat").value === "iso") return value;
    if ($("dateFormat").value === "long")
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    return `${month}/${day}/${year}`;
  }
  function updateDatePreview() {
    const value = formattedDate();
    $("datePreview").textContent = value || "Choose a valid date";
    $("datePreview").style.fontSize = $("dateSize").value + "px";
  }
  $("dateValue").value = todayValue();
  for (const id of ["dateValue", "dateFormat", "dateSize"])
    $(id).oninput = updateDatePreview;
  $("today").onclick = () => {
    $("dateValue").value = todayValue();
    updateDatePreview();
  };
  updateDatePreview();
  $("addDate").onclick = () => {
    const value = formattedDate();
    if (!value) {
      $("dateValue").reportValidity();
      return;
    }
    addTextPlacement(value, Number($("dateSize").value), {
      fieldType: "date",
      dateValue: $("dateValue").value,
      dateFormat: $("dateFormat").value,
    });
  };
  $("addText").onclick = () =>
    addTextPlacement($("plainText").value.trim(), Number($("textSize").value));
  function addTextPlacement(value, size, metadata = { fieldType: "text" }) {
    if (!pdf) return;
    if (!value) {
      message("Type some text first.");
      return;
    }
    try {
      textFont.encodeText(value);
    } catch (err) {
      message("Could not add text: " + err.message);
      return;
    }
    const naturalWidth = pdfCanvas.width;
    const estimatedWidth = Math.max(
      80,
      Math.min(
        naturalWidth * 0.85,
        value.length * size * 0.64 * (pdfCanvas.width / PAGE_WIDTH) + 16,
      ),
    );
    const existing = placements.find((r) => r.id === editingTextId);
    const rec = {
      id: existing?.id ?? Date.now() + Math.random(),
      confirmed: false,
      kind: "text",
      page: pageNum,
      x: existing?.x ?? 0.2,
      y: existing?.y ?? 0.4,
      w: Math.min(0.85, estimatedWidth / naturalWidth),
      h: Math.max(
        0.035,
        (size * 1.8) / (pdfCanvas.height / (pdfCanvas.width / PAGE_WIDTH)),
      ),
      text: value,
      size,
      ...metadata,
    };
    recordEdit();
    if (existing) Object.assign(existing, rec);
    else placements.push(rec);
    selected = rec.id;
    pendingPlacement = existing ? null : rec.id;
    editingTextId = null;
    $("addText").textContent = "Place text";
    $("addDate").textContent = "Place date";
    drawStamps();
    const label = metadata.fieldType === "date" ? "Date" : "Text";
    message(
      existing
        ? `${label} updated. Tap Done to finish.`
        : `Tap the page to place the ${label.toLowerCase()}. Drag to adjust, then tap Done.`,
    );
    if (mobile.matches) showView(true);
  }
  $("mobileDate").onclick = () => {
    editingTextId = null;
    updateDatePreview();
    openTool("date");
  };
  wrap.addEventListener("pointerup", (e) => {
    if (
      pinch ||
      suppressTouch ||
      e.target.closest(".stamp") ||
      !pendingPlacement ||
      painting
    )
      return;
    const rec = placements.find((r) => r.id === pendingPlacement);
    if (!rec || rec.page !== pageNum) return;
    const rect = wrap.getBoundingClientRect();
    rec.x = Math.max(
      0,
      Math.min(1 - rec.w, (e.clientX - rect.left) / rect.width - rec.w / 2),
    );
    rec.y = Math.max(
      0,
      Math.min(1 - rec.h, (e.clientY - rect.top) / rect.height - rec.h / 2),
    );
    pendingPlacement = null;
    drawStamps();
    message("Drag to adjust. Tap Done to confirm.");
  });
  // Annotation selection, movement, and confirmation
  function drawStamps() {
    wrap.querySelectorAll(".stamp").forEach((x) => x.remove());
    for (const rec of placements.filter((r) => r.page === pageNum)) {
      const el = document.createElement("div");
      el.className =
        "stamp" +
        (rec.kind === "text" ? " text-stamp" : "") +
        (selected === rec.id ? " selected" : "");
      el.style.left = rec.x * 100 + "%";
      el.style.top = rec.y * 100 + "%";
      el.style.width = rec.w * 100 + "%";
      el.style.height = rec.h * 100 + "%";
      el.tabIndex = 0;
      el.setAttribute(
        "aria-label",
        rec.kind === "text"
          ? "Placed text: " + rec.text + ". Press Enter to adjust."
          : "Placed signature. Press Enter to adjust.",
      );
      el.addEventListener("keydown", (e) => {
        if (e.target !== el) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selected = rec.id;
          rec.confirmed = false;
          drawStamps();
          wrap
            .querySelector(
              '.stamp.selected button[aria-label="Confirm position"]',
            )
            ?.focus();
        } else if (e.key === "Escape") {
          confirmPosition();
        }
      });
      if (rec.kind === "text") {
        const ns = "http://www.w3.org/2000/svg";
        const t = document.createElementNS(ns, "svg");
        t.setAttribute("width", "100%");
        t.setAttribute("height", "100%");
        t.setAttribute("aria-hidden", "true");
        t.style.display = "block";
        const aspect =
          parseFloat(pdfCanvas.style.height) /
          parseFloat(pdfCanvas.style.width);
        t.setAttribute(
          "viewBox",
          `0 0 ${rec.w * PAGE_WIDTH} ${rec.h * PAGE_WIDTH * aspect}`,
        );
        t.setAttribute("preserveAspectRatio", "none");
        const layout = textLayout(rec);
        layout.lines.forEach((line, index) => {
          const text = document.createElementNS(ns, "text");
          text.setAttribute("x", "3");
          text.setAttribute("y", layout.baseline + index * layout.lineHeight);
          text.setAttribute("font-family", "Arial, Helvetica, sans-serif");
          text.setAttribute("font-size", rec.size);
          text.setAttribute("fill", "#111");
          text.textContent = line;
          t.appendChild(text);
        });
        const content = document.createElement("span");
        content.className = "stamp-text";
        content.appendChild(t);
        el.appendChild(content);
      } else {
        const img = document.createElement("img");
        img.alt = "Signature";
        img.src = rec.url;
        el.appendChild(img);
      }
      const actions = document.createElement("div");
      actions.className = "item-actions";
      // Keep the controls inside the visible document area at either edge.
      const actionWidth = rec.kind === "text" ? 220 : 160;
      const left = Math.max(
        0,
        Math.min(rec.x * wrap.clientWidth, wrap.clientWidth - actionWidth),
      );
      actions.style.left = left - rec.x * wrap.clientWidth + "px";
      if (rec.y * wrap.clientHeight < 54)
        actions.style.top = "calc(100% + 22px)";
      const del = document.createElement("button");
      del.className = "btn delete";
      del.setAttribute("aria-label", "Remove item");
      del.textContent = "Delete";
      const doneButton = document.createElement("button");
      doneButton.className = "btn primary";
      doneButton.textContent = "Done";
      doneButton.setAttribute("aria-label", "Confirm position");
      doneButton.onclick = (e) => {
        e.stopPropagation();
        confirmPosition();
      };
      if (rec.kind === "text") {
        const edit = document.createElement("button");
        edit.className = "btn";
        edit.textContent = "Edit";
        edit.onclick = () => {
          editingTextId = rec.id;
          if (rec.fieldType === "date") {
            $("dateValue").value = rec.dateValue;
            $("dateFormat").value = rec.dateFormat;
            $("dateSize").value = rec.size;
            $("addDate").textContent = "Save date";
            updateDatePreview();
            openTool("date");
          } else {
            $("plainText").value = rec.text;
            $("textSize").value = rec.size;
            $("addText").textContent = "Save text";
            openTool("text");
          }
        };
        actions.append(edit);
      }
      actions.append(del, doneButton);
      const resize = document.createElement("span");
      resize.className = "resize";
      el.append(actions, resize);
      del.onclick = (e) => {
        e.stopPropagation();
        recordEdit();
        placements = placements.filter((r) => r !== rec);
        selected = pendingPlacement = null;
        drawStamps();
        message("Item deleted. Tap Undo to restore it.");
      };
      el.addEventListener("pointerdown", (e) => {
        if (pinch || suppressTouch || e.target.closest("button")) return;
        e.preventDefault();
        const isResize = e.target.classList.contains("resize");
        selected = rec.id;
        rec.confirmed = false;
        pendingPlacement = null;
        el.classList.add("selected");
        for (const other of wrap.querySelectorAll(".stamp"))
          if (other !== el) other.classList.remove("selected");
        el.setPointerCapture(e.pointerId);
        const startX = e.clientX,
          startY = e.clientY,
          ox = rec.x,
          oy = rec.y,
          ow = rec.w,
          oh = rec.h;
        let recordedMove = false;
        const move = (ev) => {
          if (pinch || suppressTouch) return;
          if (!recordedMove) {
            recordEdit();
            recordedMove = true;
          }
          const dx = (ev.clientX - startX) / wrap.clientWidth,
            dy = (ev.clientY - startY) / wrap.clientHeight;
          if (isResize) {
            rec.w = Math.max(0.04, Math.min(1 - rec.x, ow + dx));
            rec.h = Math.max(0.02, Math.min(1 - rec.y, oh + dy));
            el.style.width = rec.w * 100 + "%";
            el.style.height = rec.h * 100 + "%";
          } else {
            rec.x = Math.max(0, Math.min(1 - rec.w, ox + dx));
            rec.y = Math.max(0, Math.min(1 - rec.h, oy + dy));
            el.style.left = rec.x * 100 + "%";
            el.style.top = rec.y * 100 + "%";
          }
        };
        const cleanup = () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", done);
          el.removeEventListener("pointercancel", done);
          cancelDocumentDrag = null;
        };
        const done = () => {
          cleanup();
          if (!pinch && !suppressTouch) drawStamps();
        };
        cancelDocumentDrag = cleanup;
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", done);
        el.addEventListener("pointercancel", done);
      });
      wrap.appendChild(el);
    }
  }
  function confirmPosition() {
    const rec = placements.find((item) => item.id === selected);
    if (rec) {
      rec.confirmed = true;
      rec.committed = SignFlowCore.commitPlacement(rec);
    }
    selected = pendingPlacement = null;
    drawStamps();
    message(
      `Position confirmed on page ${pageNum}. Tap the item to edit it again.`,
    );
  }
  // Drawing tools and pointer interaction
  const paintCanvas = $("paintCanvas"),
    paintCtx = paintCanvas.getContext("2d");
  function setPainting(on) {
    painting = on;
    wrap.classList.toggle("painting", on);
    $("paintControls").classList.toggle("hidden", !on);
    $("paintToggle").textContent = on
      ? "✓ Drawing enabled — click to stop"
      : "✎ Enable freehand drawing";
    $("paintToggle").classList.toggle("active", on);
    $("mobileDraw").setAttribute("aria-pressed", String(on));
    if (!on) {
      activeStroke = null;
      erasing = false;
      eraserLast = null;
      hideBrushCursor();
    }
    redrawPaint();
  }
  $("paintToggle").onclick = () => {
    setPainting(!painting);
    if (mobile.matches) $("paintControls").classList.remove("hidden");
    if (painting && mobile.matches) {
      message(
        "Draw on the PDF. Tap Draw for settings; choose another tool to stop drawing.",
      );
      showView(true);
    }
  };
  const brushSizes = { pen: 3, eraser: 18 };
  let erasing = false,
    eraserLast = null,
    eraserRecorded = false;
  let cursorPoint = null;
  function hideBrushCursor() {
    $("brushCursor").classList.add("hidden");
    cursorPoint = null;
  }
  function updateBrushSize() {
    const size = brushSizes[paintTool];
    const diameter =
      (size * (paintCanvas.getBoundingClientRect().width || PAGE_WIDTH)) /
      PAGE_WIDTH;
    const label = `${paintTool === "eraser" ? "Eraser" : "Pen"}: ${size} pt`;
    $("brushLabel").textContent = size + " pt";
    $("paintWidth").setAttribute(
      "aria-label",
      `${paintTool === "eraser" ? "Eraser" : "Pen"} diameter`,
    );
    $("paintWidth").setAttribute("aria-valuetext", size + " points");
    $("brushPreviewLabel").textContent =
      label + ` · ${Math.round(diameter)} px on the page`;
    $("brushPreview").style.width = $("brushPreview").style.height =
      Math.min(52, diameter) + "px";
    $("brushPreview").style.background =
      paintTool === "eraser" ? "transparent" : $("paintColor").value;
    $("brushPreview").style.outline =
      paintTool === "eraser" ? "2px dashed #475569" : "none";
    $("brushCursor").style.width = $("brushCursor").style.height =
      diameter + "px";
    $("brushCursor").classList.toggle("eraser", paintTool === "eraser");
    $("cursorSizeLabel").textContent = label;
    if (cursorPoint) {
      $("brushCursor").style.left = cursorPoint.x * 100 + "%";
      $("brushCursor").style.top = cursorPoint.y * 100 + "%";
    }
  }
  function showBrushCursor(e) {
    if (!painting || pinch || suppressTouch) {
      hideBrushCursor();
      return;
    }
    cursorPoint = paintPoint(e);
    updateBrushSize();
    $("brushCursor").classList.remove("hidden");
  }
  $("paintWidth").oninput = () => {
    brushSizes[paintTool] = +$("paintWidth").value;
    updateBrushSize();
  };
  $("paintColor").oninput = updateBrushSize;
  function setPaintTool(t) {
    paintTool = t;
    erasing = false;
    eraserLast = null;
    $("paintWidth").max = t === "eraser" ? "64" : "18";
    $("paintWidth").value = brushSizes[t];
    $("penTool").classList.toggle("active", t === "pen");
    $("eraserTool").classList.toggle("active", t === "eraser");
    $("penTool").setAttribute("aria-pressed", String(t === "pen"));
    $("eraserTool").setAttribute("aria-pressed", String(t === "eraser"));
    paintCanvas.style.cursor = "none";
    updateBrushSize();
  }
  setPaintTool("pen");
  $("penTool").onclick = () => setPaintTool("pen");
  $("eraserTool").onclick = () => setPaintTool("eraser");
  function paintPoint(e) {
    const r = paintCanvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }
  function savePaintHistory() {
    recordEdit();
    paintHistory.push(
      strokes.map((s) => ({
        ...s,
        points: s.points.map((p) => ({ ...p })),
      })),
    );
    if (paintHistory.length > 80) paintHistory.shift();
  }
  function eraseBetween(from, to) {
    const { strokes: next, changed } = SignFlowCore.eraseStrokes(strokes, {
      page: pageNum,
      from,
      to,
      eraserWidth: brushSizes.eraser,
      aspectRatio: paintCanvas.height / paintCanvas.width,
    });
    if (!changed) return;
    if (!eraserRecorded) {
      savePaintHistory();
      eraserRecorded = true;
    }
    strokes = next;
    redrawPaint();
  }
  paintCanvas.addEventListener("pointerdown", (e) => {
    if (!painting || !pdf || pinch || suppressTouch) return;
    e.preventDefault();
    paintCanvas.setPointerCapture(e.pointerId);
    showBrushCursor(e);
    const p = paintPoint(e);
    if (paintTool === "eraser") {
      erasing = true;
      eraserRecorded = false;
      eraserLast = p;
      eraseBetween(p, p);
      return;
    }
    savePaintHistory();
    activeStroke = {
      page: pageNum,
      color: $("paintColor").value,
      width: brushSizes.pen,
      points: [p],
    };
    strokes.push(activeStroke);
    redrawPaint();
  });
  paintCanvas.addEventListener("pointermove", (e) => {
    if (!painting || pinch || suppressTouch) return;
    showBrushCursor(e);
    if (paintTool === "eraser") {
      if (erasing) {
        e.preventDefault();
        const p = paintPoint(e);
        eraseBetween(eraserLast, p);
        eraserLast = p;
      }
      return;
    }
    if (!activeStroke) return;
    e.preventDefault();
    activeStroke.points.push(paintPoint(e));
    redrawPaint();
  });
  for (const evt of ["pointerup", "pointercancel", "lostpointercapture"])
    paintCanvas.addEventListener(evt, (e) => {
      activeStroke = null;
      erasing = false;
      eraserLast = null;
      eraserRecorded = false;
      if (e.pointerType !== "mouse" || evt === "pointercancel")
        hideBrushCursor();
    });
  paintCanvas.addEventListener("pointerleave", hideBrushCursor);
  function redrawPaint() {
    if (!paintCanvas || !pdf) return;
    paintCanvas.width = pdfCanvas.width;
    paintCanvas.height = pdfCanvas.height;
    const w = paintCanvas.width,
      h = paintCanvas.height;
    updateBrushSize();
    paintCtx.lineCap = "round";
    paintCtx.lineJoin = "round";
    for (const stroke of strokes.filter((s) => s.page === pageNum)) {
      if (!stroke.points.length) continue;
      paintCtx.strokeStyle = stroke.color;
      paintCtx.fillStyle = stroke.color;
      paintCtx.lineWidth = (stroke.width * w) / PAGE_WIDTH;
      const pts = stroke.points;
      if (pts.length === 1) {
        paintCtx.beginPath();
        paintCtx.arc(
          pts[0].x * w,
          pts[0].y * h,
          Math.max(0.5, paintCtx.lineWidth / 2),
          0,
          Math.PI * 2,
        );
        paintCtx.fill();
      } else {
        paintCtx.beginPath();
        paintCtx.moveTo(pts[0].x * w, pts[0].y * h);
        for (const pt of pts.slice(1)) paintCtx.lineTo(pt.x * w, pt.y * h);
        paintCtx.stroke();
      }
    }
  }
  $("undoPaint").onclick = () => {
    if (!paintHistory.length) {
      message("Nothing to undo.");
      return;
    }
    recordEdit();
    strokes = paintHistory.pop();
    redrawPaint();
    message("Drawing change undone.");
  };
  $("clearPaint").onclick = () => {
    if (!strokes.some((s) => s.page === pageNum)) return;
    savePaintHistory();
    strokes = strokes.filter((s) => s.page !== pageNum);
    redrawPaint();
    message("Drawings cleared from this page. Undo to restore.");
  };
  // Download orchestration (PDF generation lives in pdf-export.js)
  let exporting = false;
  $("download").onclick = async () => {
    if (!pdf || !bytes || exporting) return;
    if (!placements.length && !strokes.length) {
      message("Add a signature, text, or drawing before downloading.");
      return;
    }
    const snapshot = {
      bytes: bytes.slice(),
      ...structuredClone({ placements, strokes }),
    };
    const filename = $("filename").textContent;
    exporting = true;
    message("Creating signed PDF…");
    $("download").disabled = true;
    try {
      const output = await SignFlowExport(snapshot);
      const blob = new Blob([output], { type: "application/pdf" }),
        link = document.createElement("a"),
        url = URL.createObjectURL(blob);
      link.href = url;
      link.download =
        (filename.replace(/\.pdf$/i, "") || "document") + "-signed.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      message(
        snapshot.placements.some((item) => item.confirmed !== true)
          ? "Saved! Unconfirmed changes were left out. Tap Done to include them next time."
          : "Saved! Your edited PDF has been downloaded.",
      );
    } catch (e) {
      message("Could not save PDF: " + e.message);
    } finally {
      exporting = false;
      $("download").disabled = !pdf;
    }
  };
  // A resize burst needs one final render rather than a growing render queue.
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (pdf) render();
    }, 150);
  });
})();
