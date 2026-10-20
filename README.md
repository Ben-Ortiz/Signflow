# [SignFlow — PDF Signer](https://ben-ortiz.github.io/Signflow/)

I got sick of trying to sign PDFs and not having a simple way to sign them for free.  
So I made my own.  
Coded purely using ChatGPT Codex.

A free, static, browser-based PDF signing app that can be hosted on **GitHub Pages**. No backend, database, account, build process, or API keys are required.  
Coded purely using ChatGPT Codex.

## Features

- Preview multipage PDFs and move between pages.
- Draw a signature with a mouse, pen, or touchscreen, or type a signature.
- Insert regular text and today's date with adjustable font size.
- Drag and resize added items and remove unwanted ones.
- Export a new PDF with the added content.
- Documents are processed in your browser; PDFs are not uploaded to GitHub or any app server.

**Note:** The page loads PDF.js and pdf-lib from cdnjs.cloudflare.com, so internet access is required for those libraries to load. This tool adds a visible electronic signature, _not_ a certificate-backed cryptographic digital signature or e-sign audit trail. Use only with documents for which a simple signature stamp is acceptable.

## Use locally

Double-click `index.html` to open it in a modern browser. Or run a local web server inside the project folder:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.
