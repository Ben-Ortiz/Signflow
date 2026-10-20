# [SignFlow — PDF Signer & Editor](https://ben-ortiz.github.io/Signflow/)

I got sick of trying to sign PDFs and not having a simple way to sign them for free.  
So I made my own.  
Coded purely using ChatGPT Codex.

SignFlow is a free, browser-based PDF editor that lets you sign documents, add text, insert dates, and draw directly on PDF files.

Built entirely with HTML, CSS, and vanilla JavaScript using ChatGPT Codex.

**No installation, account, database, or backend server required.**

## Features

- **PDF Viewer** — Upload and navigate multipage PDF documents.
- **Electronic Signatures** — Draw your signature using a mouse, stylus, or touchscreen, or type it.
- **Text & Dates** — Insert custom text or today's date with adjustable font sizes.
- **Freehand Drawing** — Draw directly on PDF pages using a customizable pen and eraser.
- **Drag & Resize** — Position and resize signatures and other added elements.
- **PDF Export** — Download your edited document as a new PDF.
- **Privacy-Focused** — PDFs are processed locally in your browser and are not uploaded to a server.

## Getting Started

There are two ways to run SignFlow locally.

### Option 1: Open Directly in Your Browser (Easiest)

1. Download this repository by clicking **Code → Download ZIP** at the top of the GitHub page.
2. Extract the downloaded ZIP file.
3. Open the extracted project folder.
4. Find the `index.html` file.
5. Double-click `index.html` to open SignFlow in Chrome, Edge, Firefox, or another modern browser.

That's it! You can start editing PDFs immediately.

### Option 2: Run Using a Local Server (Recommended)

If you have Python installed, you can run SignFlow through a local development server.

**1. Clone the repository**

```bash
git clone https://github.com/Ben-Ortiz/Signflow.git
```

**2. Navigate to the project folder**

```bash
cd Signflow
```

**3. Start a local server**

```bash
python -m http.server 8000
```

On some Windows systems, use `py -m http.server 8000` instead.

**4. Open your browser**

Navigate to:

http://localhost:8000

SignFlow should now be running locally.

To stop the server, return to your terminal and press `Ctrl + C`.

### Option 3: Run Using Visual Studio Code

1. Clone or download this repository.
2. Open the project folder in Visual Studio Code.
3. Open the integrated terminal using **Terminal → New Terminal**.
4. Run:

```bash
python -m http.server 8000
```

5. Open http://localhost:8000 in your browser.

You can now edit the source code and refresh your browser to see changes.

## How to Use SignFlow

1. **Upload a PDF** — Select a PDF document from your computer.
2. **Add a Signature** — Draw or type your signature, then place it on the document.
3. **Insert Text or Dates** — Add text anywhere on the PDF.
4. **Draw on the PDF** — Use the freehand drawing tool to annotate your document.
5. **Adjust Elements** — Move, resize, or remove added content.
6. **Download** — Export your changes as a new PDF file.

## Technologies Used

| Technology         | Purpose                                |
| ------------------ | -------------------------------------- |
| HTML5              | Application structure                  |
| CSS3               | Styling and responsive layout          |
| Vanilla JavaScript | Application functionality              |
| PDF.js             | PDF rendering                          |
| pdf-lib            | PDF modifications and export           |
| HTML Canvas API    | Signature capture and freehand drawing |
| GitHub Pages       | Static website hosting                 |

## Privacy & Security

SignFlow processes PDF documents entirely within your browser.

- PDF documents are not uploaded to GitHub.
- No backend server or database stores your files.
- No account or registration is necessary.
- Edited PDFs are saved directly to your device when downloaded.

**Important:** SignFlow loads PDF.js and pdf-lib from Cloudflare's CDN, so an internet connection is required to load these dependencies. Because these are third-party scripts, local document processing is not a guarantee against all security risks.

SignFlow provides visible electronic signatures. It does not provide certificate-backed digital signatures, identity verification, or a legally managed e-signature audit trail.

## Contributing

Contributions, suggestions, and bug reports are welcome.

To contribute:

1. Fork the repository.
2. Create a new branch for your changes.
3. Make and test your modifications.
4. Submit a pull request describing your changes.

---

**SignFlow** — A simple, free, and privacy-focused way to sign and edit PDFs directly in your browser.
