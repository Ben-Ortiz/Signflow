"""Browser regressions. Requires Python Playwright and a local HTTP server.

SIGNFLOW_URL defaults to http://127.0.0.1:8000. Set CHROMIUM_PATH to use
an installed Chromium instead of Playwright's downloaded browser.
"""

import os
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get("SIGNFLOW_URL", "http://127.0.0.1:8000")


def upload(page, name, data):
    page.locator("#pdfFile").set_input_files(
        {
            "name": name,
            "mimeType": "application/pdf",
            "buffer": data,
        }
    )
    page.wait_for_function(
        "name => document.querySelector('#filename').textContent === name", arg=name
    )
    page.wait_for_function(
        "/get started|PDF loaded/.test(document.querySelector('#status').textContent)"
    )


with sync_playwright() as playwright:
    options = {"headless": True}
    if os.environ.get("CHROMIUM_PATH"):
        options["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = playwright.chromium.launch(**options)
    for width in (390, 1440):
        page = browser.new_page(viewport={"width": width, "height": 1200})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(URL, wait_until="networkidle")
        source = bytes(page.evaluate("""async () => {
            const d = await PDFLib.PDFDocument.create();
            d.addPage([612, 792]); d.addPage([612, 792]);
            return Array.from(await d.save());
        }"""))
        upload(page, "original.pdf", source)
        if width < 850:
            page.locator("#mobileDate").click()
        page.locator("#today").click()
        page.locator("#addDate").click()
        assert page.locator(".stamp").count() == 1
        original_position = page.locator(".stamp").get_attribute("style")
        page.locator("#next").click()
        page.wait_for_function(
            "document.querySelector('#pageLabel').textContent === 'Page 2 of 2'"
        )
        assert page.locator(".stamp").count() == 1
        assert page.locator(".stamp").get_attribute("style") == original_position
        page.locator('.stamp button[aria-label="Confirm position"]').click()
        page.locator("#prev").click()
        page.wait_for_function(
            "document.querySelector('#pageLabel').textContent === 'Page 1 of 2'"
        )
        assert page.locator(".stamp").count() == 0
        page.locator("#next").click()
        page.wait_for_function(
            "document.querySelector('#pageLabel').textContent === 'Page 2 of 2'"
        )
        assert page.locator(".stamp").count() == 1

        # Invalid replacement must retain the current document AND its edits.
        page.locator("#pdfFile").set_input_files(
            {
                "name": "invalid.pdf",
                "mimeType": "application/pdf",
                "buffer": b"invalid pdf",
            }
        )
        page.wait_for_function(
            "document.querySelector('#status').textContent.startsWith('Could not open PDF:')"
        )
        assert page.locator("#filename").text_content() == "original.pdf"
        assert page.locator(".stamp").count() == 1
        assert page.locator("#download").is_enabled()

        # Deliberately pause export; replacing the editor must not affect its snapshot.
        page.evaluate("""() => {
            const original = SignFlowExport;
            window.SignFlowExport = async snapshot => {
                await new Promise(resolve => window.resumeExport = resolve);
                return original(snapshot);
            };
        }""")
        page.locator("#mobileSave" if width < 850 else "#download").click()
        page.wait_for_function('typeof resumeExport === "function"')
        upload(page, "replacement.pdf", source)
        with page.expect_download() as download:
            page.evaluate("resumeExport()")
        assert download.value.suggested_filename == "original-signed.pdf"
        output = Path(download.value.path()).read_bytes()
        # Reopen saved PDF and verify the date is on the second page only.
        result = page.evaluate(
            """async data => {
            const doc = await pdfjsLib.getDocument({data: new Uint8Array(data)}).promise;
            try {
                return await Promise.all([1,2].map(async n =>
                    (await (await doc.getPage(n)).getTextContent()).items.map(i => i.str).join('')));
            } finally { await doc.destroy(); }
        }""",
            list(output),
        )
        assert result[0] == "" and result[1], result
        upload(page, "reopened.pdf", output)
        assert page.locator("#pageLabel").text_content() == "Page 1 of 2"
        assert not errors, errors
        print(
            f"{width}px: draft navigation, confirmation, failed upload recovery, export snapshot, and reopening passed"
        )
        # A slow earlier upload must never overwrite the newer selection.
        page.evaluate("""() => {
            const original = File.prototype.arrayBuffer;
            File.prototype.arrayBuffer = async function () {
                if (this.name === 'slow.pdf') await new Promise(resolve => window.resumeUpload = resolve);
                return original.call(this);
            };
        }""")
        page.locator("#pdfFile").set_input_files(
            {
                "name": "slow.pdf",
                "mimeType": "application/pdf",
                "buffer": source,
            }
        )
        page.wait_for_function('typeof resumeUpload === "function"')
        upload(page, "newest.pdf", source)
        page.evaluate("resumeUpload()")
        # Wait for the stale load to finish and dispose its resources.
        page.wait_for_timeout(1000)
        assert page.locator("#filename").text_content() == "newest.pdf"
        assert not errors, errors
        print(f"{width}px: overlapping uploads retain the newest selection")
        page.close()
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/pdf.min.js", lambda route: route.abort())
    page.goto(URL, wait_until="networkidle")
    assert "could not load" in page.locator("#status").text_content()
    assert page.locator("#pdfFile").is_disabled()
    assert not errors, errors
    print("Missing PDF dependency: actionable error without an uncaught exception")
    browser.close()
