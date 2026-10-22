# [SignFlow — PDF Signer & Editor](https://ben-ortiz.github.io/Signflow/)

I got sick of trying to sign PDFs and not having a simple way to sign them for free.  
So I made my own.

A free, browser-based mobile-friendly, PDF editor built with HTML, CSS, and vanilla JavaScript using ChatGPT Codex.

No installation, account, or backend required.

## Features

- Upload and preview multipage PDFs.
- Draw or type signatures.
- Add text and dates.
- Draw freely with a pen or eraser.
- Move and resize elements.
- Download edited PDFs.
- Process PDFs locally without uploading them to a server.

## Getting Started

### Option 1: Open Directly (Easiest)

1. Click **Code → Download ZIP** on this repository.
2. Extract the ZIP file.
3. Double-click `index.html` to open the app in your browser.

### Option 2: Run Locally with Python

**1. Clone the repository:**

```bash
git clone https://github.com/Ben-Ortiz/Signflow.git
cd Signflow
```

**2. Start a local server:**

```bash
python -m http.server 8000
```

**3. Open your browser:**

http://localhost:8000

Press `Ctrl + C` in the terminal to stop the server.

## Technologies

- **HTML / CSS / JavaScript** — Interface and functionality
- **PDF.js** — PDF rendering
- **pdf-lib** — PDF editing and exporting
- **Canvas API** — Signatures and freehand drawing

## Privacy

PDFs are processed locally in your browser and are not uploaded to a server.

**Note:** An internet connection is required to load PDF.js and pdf-lib from Cloudflare's CDN. SignFlow creates visible electronic signatures, not certificate-backed digital signatures.

---

Built with ChatGPT Codex.

## Maintaining the app

The site remains a static app with no build step or runtime package installation.
Keep `index.html`, `styles.css`, and `js/` together when opening a downloaded ZIP.

- `index.html`: accessible interface markup and script loading order.
- `styles.css`: desktop and mobile layouts.
- `js/app.js`: editor state, DOM events, navigation, touch gestures, and rendering.
- `js/core.js`: pure text layout and eraser geometry, independently testable in Node.
- `js/pdf-export.js`: PDF generation from a snapshot of bytes and annotations.

Annotation positions and dimensions are fractions of the displayed page. Font and
brush sizes use a canonical width of 612 points. Preview and export share text
layout; preserve this contract when changing coordinates or sizing.

Uploads validate a candidate PDF before replacing the current document. A revision
counter prevents older uploads from winning a race. Export owns a separate PDF.js
document and copies annotations before awaiting work, so later edits or uploads
cannot change an in-progress download. Destroy PDF.js resources when finished.

### Checks

Run the dependency-free checks with Node.js 22 or newer:

```bash
node --check js/app.js
node --check js/core.js
node --check js/pdf-export.js
node --test tests/*.test.cjs
```

For browser regressions, install Python Playwright (`python -m pip install
playwright`, then `python -m playwright install chromium`), start the local server,
and run:

```bash
python tests/browser.py
python tests/drawing.py
```

`SIGNFLOW_URL` overrides the local URL; `CHROMIUM_PATH` selects an installed Chromium.
The tests keep certificate verification enabled. They cover mobile and desktop
navigation, draft confirmation, failed and overlapping uploads, export isolation,
reopening PDFs, partial erasing, brush sizes, and Undo. Test documents contain no
personal information. Check touch gestures on an actual iPhone before changing
Safari-specific event handling.
