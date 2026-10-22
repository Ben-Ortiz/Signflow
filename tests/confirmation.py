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
            return page.evaluate(
                """async data => {
                const task = pdfjsLib.getDocument({data: new Uint8Array(data)});
                try {
                    const doc = await task.promise, page = await doc.getPage(1);
                    const ops = await page.getOperatorList();
                    return {
                        images: ops.fnArray.filter(fn => fn === pdfjsLib.OPS.paintImageXObject).length,
                        text: (await page.getTextContent()).items.map(item => item.str).join(' '),
                    };
                } finally { await task.destroy(); }
            }""",
                list(data),
            )

        if width < 850:
            page.locator("#mobileSign").click()
        page.locator("#typeTab").click()
        page.locator("#typed").fill("Test Signature")
        page.locator("#add").click()
        assert save_and_inspect()["images"] == 0
        assert page.locator(".stamp.selected").count() == 1
        page.locator('button[aria-label="Confirm position"]').click()
        assert save_and_inspect()["images"] == 1
        # Reopening an item for editing makes it a draft until Done is pressed again.
        page.locator(".stamp").click()
        assert save_and_inspect()["images"] == 0
        page.locator('button[aria-label="Confirm position"]').click()

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
        assert not errors, errors
        print(
            f"{width}px: draft signature, text, and date excluded; Done includes them; reselected signature excluded until reconfirmed"
        )
        page.close()
    browser.close()
