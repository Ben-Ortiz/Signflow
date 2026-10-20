# [SignFlow — PDF Signer & Editor](https://ben-ortiz.github.io/Signflow/)

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Click the link above to use it.

I got sick of trying to sign PDFs and not having a simple way to sign them for free.  
So I made my own.

A free, browser-based PDF editor built with HTML, CSS, and vanilla JavaScript using ChatGPT Codex.

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
