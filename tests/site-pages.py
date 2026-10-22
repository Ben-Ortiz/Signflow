"""Navigation and informational-page regressions; same setup as browser.py."""

import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("SIGNFLOW_URL", "http://127.0.0.1:8000").rstrip("/") + "/"
PAGES = ("", "how-to-sign.html", "about.html", "contact.html", "privacy.html")
with sync_playwright() as playwright:
    options = {"headless": True}
    if os.environ.get("CHROMIUM_PATH"):
        options["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = playwright.chromium.launch(**options)
    for width in (320, 390, 1440):
        context = browser.new_context(
            viewport={"width": width, "height": 1000}, java_script_enabled=False
        )
        for path in PAGES:
            page = context.new_page()
            response = page.goto(BASE + path)
            assert response.status == 200, (path, response.status)
            assert page.locator("h1").count() == 1
            assert page.locator("h1").is_visible()
            assert page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth + 1"
            ), (path, width)
            assert page.locator('a[href="privacy.html"]').count() > 0
            assert page.locator('a[href="contact.html"]').count() > 0
            page.close()
        context.close()
        print(
            f"{width}px: all informational pages render without JavaScript and fit the viewport"
        )
    for width in (390, 1440):
        page = browser.new_page(
            viewport={"width": width, "height": 1000}, has_touch=True
        )
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(BASE, wait_until="networkidle")
        data = bytes(
            page.evaluate(
                """async()=>{const d=await PDFLib.PDFDocument.create();d.addPage([612,792]);return Array.from(await d.save())}"""
            )
        )
        page.locator("#pdfFile").set_input_files(
            {"name": "navigation.pdf", "mimeType": "application/pdf", "buffer": data}
        )
        page.wait_for_function(
            "/get started|PDF loaded/.test(document.querySelector('#status').textContent)"
        )
        if width < 850:
            page.locator(".site-menu summary").tap()
            link = page.locator('.site-menu a[href="privacy.html"]')
        else:
            link = page.locator('.editor-site-nav a[href="privacy.html"]')
        with page.expect_popup() as opened:
            link.click()
        privacy = opened.value
        privacy.wait_for_load_state("domcontentloaded")
        assert privacy.locator("h1").text_content() == "Privacy policy"
        privacy.close()
        assert page.locator("#filename").text_content() == "navigation.pdf"
        assert page.locator("#pageWrap").is_visible()
        assert not errors, errors
        page.close()
        print(
            f"{width}px: privacy navigation opens separately and preserves the editor"
        )
    browser.close()
