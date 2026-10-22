# SignFlow

**A free, browser-based PDF signer and annotation editor built for phones and desktops.**

I built SignFlow because signing a PDF should be straightforward: open a document,
add what you need, and download the result. No account, subscription, or installation
required. PDF processing happens locally in the browser.

**[Try the live app →](https://ben-ortiz.github.io/Signflow/)**

[![Deploy SignFlow](https://github.com/Ben-Ortiz/Signflow/actions/workflows/deploy.yml/badge.svg)](https://github.com/Ben-Ortiz/Signflow/actions/workflows/deploy.yml)

## What you can do

- **Sign documents:** draw a signature or type your name, then move and resize it.
- **Add text and dates:** enter text, choose a date format, and position each item.
- **Draw and erase:** annotate with adjustable pen and eraser sizes, a live size
  indicator, and an eraser that removes only the touched portion of a stroke.
- **Navigate multipage PDFs:** confirm items on their intended pages and continue
  working through the document.
- **Work on mobile:** use a document-first layout, bottom tool navigation, and
  two-finger document zoom. Desktop retains its side-by-side tools and preview.
- **Undo changes and export:** recover edits, download an annotated PDF, and reopen
  it in a PDF viewer or in SignFlow.

## How to use it

1. **Open a PDF** using Upload PDF or Open a PDF.
2. **Choose a tool:** Sign, Date, Text, or Draw. On mobile, tools open in a panel
   while the document remains the main workspace.
3. **Place and confirm your item.** Move or resize it, then press **Done**. Finish
   or delete the unfinished item before adding another. Tap a placed item to edit
   it again.
4. **For drawing, choose settings first.** On mobile, tap Draw again or Close to
   start drawing. Make as many strokes as needed in that session, then choose
   **Done** to keep them or **Delete drawing** to discard the session.
5. **Save your PDF.** Download includes confirmed work. New unfinished items are
   left out; edits to an existing item keep its last confirmed version until you
   press Done again. Earlier confirmed drawings are preserved when a new drawing
   session is discarded.

For signatures, text, and dates, unconfirmed items follow page changes until you
press Done to keep them on a specific page. Save your work before closing or
refreshing the app; documents and edits are held in memory.

## How it was made

SignFlow was developed through an iterative, AI-assisted workflow using **ChatGPT
Codex**. The project started with a personal need for a simple PDF signing tool,
then evolved through hands-on testing, feedback, bug fixes, and refactoring.

Product decisions focused on reducing friction: keeping the document visible on a
phone, making placement controls disappear after confirmation, distinguishing
unfinished edits from saved work, and preserving the desktop workflow. Engineering
work addressed issues that surfaced during those iterations, including date export
alignment, page transitions, partial erasing, overlapping uploads, and exporting
while the editor changes.

The implementation uses **HTML, CSS, and vanilla JavaScript**. The application is
split into focused files, with no framework, backend, or application build step.
Development tools provide linting, formatting, and regression checks without being
required to use the app.

## Engineering highlights

| Challenge                                                | Implementation                                                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keep placement consistent across screen sizes and export | Store positions as fractions of the displayed page and share text layout between preview and export. Font and brush sizes use a canonical page width of 612 points.                  |
| Preserve work when a replacement upload fails            | Validate and render a candidate PDF before replacing the current document. A revision counter prevents an older upload from overwriting a newer selection.                           |
| Save reliably while the user continues working           | Export from copied PDF bytes and an annotation snapshot using a separate PDF.js document. Later edits cannot change that in-progress download.                                       |
| Separate drafts from confirmed work                      | Retain each item's last confirmed version and require Done or deletion before starting another item. Drawing sessions keep a baseline that supports confirmation, discard, and Undo. |
| Erase precisely, including fast pointer movements        | Split vector strokes using swept-circle geometry, preserving untouched sections and grouping each erasing gesture into one Undo action.                                              |
| Keep interaction responsive                              | Debounce resize rendering and handle asynchronous rendering and resource-cleanup failures explicitly.                                                                                |

These decisions are supported by [core tests](tests/core.test.cjs) and
[browser regression tests](tests/), rather than relying only on visual inspection.

## Architecture and stack

| Component                            | Responsibility                                                         |
| ------------------------------------ | ---------------------------------------------------------------------- |
| [index.html](index.html)             | Interface markup, labeled controls, and script loading                 |
| [styles.css](styles.css)             | Responsive layouts, tool panels, and annotation controls               |
| [js/app.js](js/app.js)               | Editor state, input events, page navigation, gestures, and rendering   |
| [js/core.js](js/core.js)             | DOM-independent text layout, eraser geometry, and confirmation helpers |
| [js/pdf-export.js](js/pdf-export.js) | PDF generation from a snapshot and cleanup of export resources         |
| **PDF.js**                           | PDF loading and page rendering                                         |
| **pdf-lib**                          | Adding text, signature images, and vector drawings to exported PDFs    |
| **Canvas and Pointer Events**        | Signature capture, freehand input, and drawing previews                |
| **GitHub Actions / Pages**           | Automated checks and static hosting                                    |

The document flow is **local PDF bytes → page preview and editable annotations →
confirmed snapshot → downloadable PDF**. PDFs are not sent to an application server.
PDF.js and pdf-lib load from Cloudflare's CDN, so an internet connection is required.

## Run locally

With Git and Python 3 installed:

```bash
git clone https://github.com/Ben-Ortiz/Signflow.git
cd Signflow
python -m http.server 8000
```

Open **http://localhost:8000**. Stop the server with `Ctrl+C`.

You can also download and extract the repository ZIP, then open `index.html`
directly in a browser that permits local-file access. Keep the HTML, CSS, and `js/`
files together. Node.js is needed only for development checks.

## Development and testing

Use **Node.js 22.13 or newer**:

```bash
npm ci
npm run check
```

- `npm run check` runs ESLint, Prettier's formatting check, and the core tests.
- `npm run format` applies consistent formatting.
- `npm test` runs the core tests with Node's built-in test runner.

Development dependencies are pinned in the lockfile. GitHub Actions runs code
checks on pull requests and before the custom Pages deployment. That deployment
stages only public app files.

For browser tests, keep the local server running and install Python Playwright:

```bash
python -m pip install playwright
python -m playwright install chromium
python tests/browser.py
python tests/drawing.py
python tests/confirmation.py
python tests/signature-sequence.py
python tests/item-sequence.py
python tests/site-pages.py
```

The browser suite exercises mobile and desktop viewport sizes, page navigation,
failed and overlapping uploads, export isolation, reopening PDFs, zoom and cleanup
failures, partial erasing, Undo, and confirmation rules across all tools. Set
`SIGNFLOW_URL` to test another URL or `CHROMIUM_PATH` to use an installed Chromium.
Certificate verification remains enabled.

Automated Chromium tests complement device testing. Safari touch behavior should
also be checked on a physical iPhone when changing gestures or mobile interactions.

## Scope

SignFlow adds visible signatures and annotations; it does not edit the original
PDF's text or create certificate-backed digital signatures. Documents and edits
are not persisted between browser sessions. The current focus is a straightforward,
local editing workflow with a small, understandable static application.

## Search visibility

The public page includes search metadata, a canonical URL, a sitemap, structured
app information, signing instructions, FAQs, and social previews. See
[Search visibility](docs/search-visibility.md) for the site owner's Google Search
Console verification and sitemap submission steps.

## Site information and AdSense preparation

The site includes a [signing guide](how-to-sign.html), [About](about.html),
[Contact](contact.html), and [Privacy policy](privacy.html), with navigation on
mobile and desktop. Advertising is currently off. See
[AdSense preparation](docs/adsense-readiness.md) for the remaining account-specific
verification, consent, and origin-root ads.txt steps. AdSense approval is not
guaranteed by these additions.
