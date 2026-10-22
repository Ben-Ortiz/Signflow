"""Ensure draft annotations never reach saved PDFs; run with the local server.

Uses the same SIGNFLOW_URL and CHROMIUM_PATH options as browser.py.
"""

import os
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    options = {"headless": True}
    if os.environ.get("CHROMIUM_PATH"):
        options["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = playwright.chromium.launch(**options)
    for width in (390, 1440):
        page = browser.new_page(viewport={"width": width, "height": 1200})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(
            os.environ.get("SIGNFLOW_URL", "http://127.0.0.1:8000"),
            wait_until="networkidle",
        )
        source = bytes(page.evaluate("""async () => {
            const doc = await PDFLib.PDFDocument.create();
            doc.addPage([612, 792]); return Array.from(await doc.save());
        }"""))
        page.locator("#pdfFile").set_input_files(
            {"name": "blank.pdf", "mimeType": "application/pdf", "buffer": source}
        )
        page.wait_for_function(
            "/get started|PDF loaded/.test(document.querySelector('#status').textContent)"
        )

        def save_and_inspect():
            with page.expect_download() as download:
                page.locator("#mobileSave" if width < 850 else "#download").click()
            data = Path(download.value.path()).read_bytes()
            result = page.evaluate(
                """async data => {
                const task = pdfjsLib.getDocument({data: new Uint8Array(data)});
                try {
                    const doc = await task.promise, page = await doc.getPage(1);
                    const ops = await page.getOperatorList();
                    const canvas = document.createElement('canvas');
                    const viewport = page.getViewport({scale: 0.5});
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
                    return {
                        raster: canvas.toDataURL(),
                        images: ops.fnArray.filter(fn => fn === pdfjsLib.OPS.paintImageXObject).length,
                        text: (await page.getTextContent()).items.map(item => item.str).join(' '),
                    };
                } finally { await task.destroy(); }
            }""",
                list(data),
            )
            result["pdf"] = data
            return result

        if width < 850:
            page.locator("#mobileSign").click()
        page.locator("#typeTab").click()
        page.locator("#typed").fill("Test Signature")
        page.locator("#add").click()
        assert save_and_inspect()["images"] == 0
        assert page.locator(".stamp.selected").count() == 1
        page.locator('button[aria-label="Confirm position"]').click()
        first_confirmed = save_and_inspect()
        assert first_confirmed["images"] == 1
        # A second unfinished signature must not remove the first confirmed one.
        if width < 850:
            page.locator("#mobileSign").click()
        page.locator("#typed").fill("Second Signature")
        page.locator("#add").click()
        assert page.locator(".stamp").count() == 2
        result = save_and_inspect()
        assert result["images"] == 1
        assert result["raster"] == first_confirmed["raster"]
        # Even selecting the first while placing the second must not exclude both.
        page.locator(".stamp").nth(0).focus()
        page.locator(".stamp").nth(0).press("Enter")
        result = save_and_inspect()
        assert result["images"] == 1
        assert result["raster"] == first_confirmed["raster"]
        page.locator(".stamp").nth(1).focus()
        page.locator(".stamp").nth(1).press("Enter")
        page.locator('.stamp.selected button[aria-label="Confirm position"]').click()
        assert save_and_inspect()["images"] == 2
        # Remove the second signature to continue the text/date assertions.
        page.locator(".stamp").nth(1).focus()
        page.locator(".stamp").nth(1).press("Enter")
        page.locator('.stamp.selected button[aria-label="Remove item"]').click()

        # Confirmed signature stays included while new text and date remain drafts.
        if width < 850:
            page.locator("#mobileText").click()
        page.locator("#plainText").fill("Confirmed text")
        page.locator("#addText").click()
        result = save_and_inspect()
        assert result["images"] == 1 and result["text"] == "", result
        page.locator('.stamp.selected button[aria-label="Confirm position"]').click()
        if width < 850:
            page.locator("#mobileDate").click()
        page.locator("#today").click()
        page.locator("#addDate").click()
        result = save_and_inspect()
        assert result["images"] == 1 and result["text"] == "Confirmed text", result
        page.locator('.stamp.selected button[aria-label="Confirm position"]').click()
        result = save_and_inspect()
        assert result["images"] == 1 and len(result["text"]) > len(
            "Confirmed text"
        ), result
        # Existing signatures may already be embedded in an uploaded signed PDF.
        # A new unfinished signature must not remove those either.
        page.locator("#pdfFile").set_input_files(
            {
                "name": "previously-signed.pdf",
                "mimeType": "application/pdf",
                "buffer": result["pdf"],
            }
        )
        page.wait_for_function(
            "document.querySelector('#filename').textContent === 'previously-signed.pdf'"
        )
        page.wait_for_function(
            "/get started|PDF loaded/.test(document.querySelector('#status').textContent)"
        )
        if width < 850:
            page.locator("#mobileSign").click()
        page.locator("#typeTab").click()
        page.locator("#typed").fill("Unfinished extra signature")
        page.locator("#add").click()
        embedded_result = save_and_inspect()
        assert embedded_result["images"] == 1
        assert embedded_result["raster"] == result["raster"]
        assert not errors, errors
        print(
            f"{width}px: draft signature, text, and date excluded; Done includes them; first signature untouched and retained while second is unfinished; embedded signatures preserved"
        )
        page.close()
    browser.close()
