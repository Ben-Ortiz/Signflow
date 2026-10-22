"""Done/Delete gating for text, dates, and drawing; see browser.py for setup."""

import os
from pathlib import Path
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
        source = bytes(
            page.evaluate(
                """async()=>{const d=await PDFLib.PDFDocument.create();d.addPage([612,792]);return Array.from(await d.save())}"""
            )
        )
        page.locator("#pdfFile").set_input_files(
            {"name": "items.pdf", "mimeType": "application/pdf", "buffer": source}
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

        def add(tool):
            if width < 850:
                activate("#mobile" + tool.title())
            if tool == "text":
                page.locator("#plainText").fill("Test text")
            if tool == "date":
                activate("#today")
            activate("#addText" if tool == "text" else "#addDate")

        for tool in ("text", "date"):
            add(tool)
            count = page.locator(".stamp").count()
            # Same tool and all other placement tools must be blocked.
            for selector in (
                ("#mobileText", "#mobileDate", "#mobileSign", "#mobileDraw")
                if width < 850
                else ("#addText", "#addDate", "#add", "#paintToggle")
            ):
                activate(selector)
                assert page.locator(".stamp").count() == count
                assert "before adding another" in page.locator("#status").text_content()
            activate('.stamp.selected button[aria-label="Confirm position"]')
            add(tool)
            assert page.locator(".stamp").count() == count + 1
            activate('.stamp.selected button[aria-label="Remove item"]')
            add(tool)
            assert page.locator(".stamp").count() == count + 1
            activate('.stamp.selected button[aria-label="Confirm position"]')

        def draw(y):
            if width < 850:
                activate("#mobileDraw")
                activate("#closeSheet")
            else:
                activate("#paintToggle")
            page.evaluate("scrollTo(0,0)")
            bounds = page.locator("#paintCanvas").bounding_box()
            page.mouse.move(
                bounds["x"] + bounds["width"] * 0.15, bounds["y"] + bounds["height"] * y
            )
            page.mouse.down()
            page.mouse.move(
                bounds["x"] + bounds["width"] * 0.75,
                bounds["y"] + bounds["height"] * y,
                steps=5,
            )
            page.mouse.up()
            assert page.locator("#drawingActions").is_visible()

        def ink(y):
            return page.locator("#paintCanvas").evaluate(
                '(c,y)=>c.getContext("2d").getImageData(Math.round(c.width*.3),Math.round(c.height*y),1,1).data[3]',
                y,
            )

        def save_render():
            with page.expect_download() as download:
                activate("#mobileSave" if width < 850 else "#download")
            data = Path(download.value.path()).read_bytes()
            return page.evaluate(
                """async data=>{const t=pdfjsLib.getDocument({data:new Uint8Array(data)});try{const d=await t.promise,p=await d.getPage(1),v=p.getViewport({scale:1}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;return c.toDataURL()}finally{await t.destroy()}}""",
                list(data),
            )

        baseline = save_render()
        draw(0.25)
        assert ink(0.25) > 0
        for selector in (
            ("#mobileText", "#mobileDate", "#mobileSign")
            if width < 850
            else ("#addText", "#addDate", "#add")
        ):
            activate(selector)
            assert "Done or Delete drawing" in page.locator("#status").text_content()
        assert save_render() == baseline
        activate("#doneDrawing")
        confirmed = save_render()
        assert confirmed != baseline
        draw(0.55)
        assert ink(0.25) > 0 and ink(0.55) > 0
        assert save_render() == confirmed
        activate("#deleteDrawing")
        assert ink(0.25) > 0 and ink(0.55) == 0
        assert save_render() == confirmed
        activate("#mobileUndo" if width < 850 else "#undoEdit")
        assert page.locator("#drawingActions").is_visible()
        assert ink(0.55) > 0
        assert save_render() == confirmed
        activate("#deleteDrawing")
        assert ink(0.55) == 0
        draw(0.55)
        activate("#doneDrawing")
        assert save_render() != confirmed
        assert not errors, errors
        print(
            f"{width}px: text/date confirmation gating, drawing Done/Delete, draft export exclusion, and previous drawing preservation passed"
        )
        page.close()
    browser.close()
