"""Only one unfinished signature may exist; uses browser.py's environment options."""

import os
from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    options = {"headless": True}
    if os.environ.get("CHROMIUM_PATH"):
        options["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = playwright.chromium.launch(**options)
    for width in (390, 1440):
        page = browser.new_page(
            viewport={"width": width, "height": 1200}, has_touch=True
        )
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(
            os.environ.get("SIGNFLOW_URL", "http://127.0.0.1:8000"),
            wait_until="networkidle",
        )
        source = bytes(page.evaluate("""async () => {
            const doc = await PDFLib.PDFDocument.create();
            doc.addPage([612,792]); doc.addPage([612,792]); return Array.from(await doc.save());
        }"""))
        page.locator("#pdfFile").set_input_files(
            {"name": "sequence.pdf", "mimeType": "application/pdf", "buffer": source}
        )
        page.wait_for_function(
            "/get started|PDF loaded/.test(document.querySelector('#status').textContent)"
        )

        def activate(selector):
            locator = page.locator(selector)
            if width < 850:
                locator.tap()
            else:
                locator.click()

        def add_signature():
            if width < 850:
                activate("#mobileSign")
            activate("#typeTab")
            page.locator("#typed").fill("Test Signature")
            activate("#add")

        # The rule applies to first, second, third, and every future signature.
        for count in range(1, 5):
            add_signature()
            assert page.locator(".stamp").count() == count
            activate("#mobileSign" if width < 850 else "#add")
            assert page.locator(".stamp").count() == count
            assert "before adding another" in page.locator("#status").text_content()
            assert page.locator(".stamp.selected").count() == 1
            # Enforce the rule inside Place too, even if invoked directly.
            page.locator("#add").evaluate("button => button.click()")
            assert page.locator(".stamp").count() == count
            activate('.stamp.selected button[aria-label="Confirm position"]')

        add_signature()
        assert page.locator(".stamp").count() == 5
        activate('.stamp.selected button[aria-label="Remove item"]')
        add_signature()
        assert page.locator(".stamp").count() == 5
        # Unfinished signatures follow page changes and must still block new ones.
        activate("#next")
        page.wait_for_function(
            "document.querySelector('#pageLabel').textContent === 'Page 2 of 2'"
        )
        activate("#mobileSign" if width < 850 else "#add")
        assert page.locator(".stamp").count() == 1
        assert "before adding another" in page.locator("#status").text_content()
        activate('.stamp.selected button[aria-label="Confirm position"]')
        add_signature()
        assert page.locator(".stamp").count() == 2
        assert not errors, errors
        print(
            f"{width}px: repeated additions blocked until Done/delete, including after page changes"
        )
        page.close()
    browser.close()
