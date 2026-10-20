# [SignFlow — PDF Signer](https://ben-ortiz.github.io/Signflow/)

A free, static, browser-based PDF signing app that can be hosted on **GitHub Pages**. No backend, database, account, build process, or API keys are required.

## Features

- Preview multipage PDFs and move between pages.
- Draw a signature with a mouse, pen, or touchscreen, or type a signature.
- Insert regular text and today's date with adjustable font size.
- Drag and resize added items and remove unwanted ones.
- Export a new PDF with the added content.
- Documents are processed in your browser; PDFs are not uploaded to GitHub or any app server.

**Note:** The page loads PDF.js and pdf-lib from cdnjs.cloudflare.com, so internet access is required for those libraries to load. This tool adds a visible electronic signature, _not_ a certificate-backed cryptographic digital signature or e-sign audit trail. Use only with documents for which a simple signature stamp is acceptable.

## Publish on GitHub Pages (automatic deployment)

1. Create a **public** GitHub repository named `signflow` at https://github.com/new (public repositories can use GitHub Pages on free plans).
2. Download and unzip `signflow-github-pages.zip`. Upload **everything inside** to the repository root, including the hidden `.github` folder, and commit the files to the `main` branch. GitHub's **Add file → Upload files** supports dragging the files/folders into your repo. Alternatively, clone the repository locally and copy the files into it.
3. In the repository, go to **Settings → Pages → Build and deployment** and choose **GitHub Actions** as the source.
4. Open the **Actions** tab to see the `Deploy SignFlow to GitHub Pages` workflow. If it did not run automatically, select it and choose **Run workflow**.
5. After a successful deployment, open:

   `https://YOUR-USERNAME.github.io/signflow/`

Replace `YOUR-USERNAME` with your actual GitHub username. If you use a different repository name, replace `signflow` in the URL accordingly.

Every subsequent push to `main` triggers another deployment. No hosting subscription, backend or build system is needed. GitHub Pages publishes a public website; **the repository and site are publicly visible** when deployed from a public repo.

**Alternative:** You can skip the workflow and choose **Deploy from a branch → main → /(root)** under Settings → Pages instead.

## Use locally

Double-click `index.html` to open it in a modern browser. Or run a local web server inside the project folder:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Development

The full application is in `index.html` (HTML, CSS, and vanilla JavaScript). Edit it and push your commit to update the GitHub Pages site. No npm installation or build step needed.

## Privacy and limits

GitHub Pages serves only the app files. PDF parsing and exported PDF generation occur in the browser, and the app does not intentionally transmit documents to a server. Hosting a public website still exposes the site's _source code_, so don't put secrets or private data in the repository. PDF.js and pdf-lib are third-party JavaScript loaded through a CDN.

The app is provided as-is; verify the exported PDF before sending or signing important documents.

## Freehand drawing

Click **Enable freehand drawing** after opening a PDF, then draw directly over the preview. Pick a pen color and brush width. The eraser removes complete strokes; **Undo stroke** reverses painting changes, and **Clear page** clears freehand marks on the current page. Drawings export with the PDF.
