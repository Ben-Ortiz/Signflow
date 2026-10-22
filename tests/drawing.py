from playwright.sync_api import sync_playwright
from pathlib import Path
import os, json, tempfile

# Artifacts are removed automatically when the test process exits.
_temporary_directory = tempfile.TemporaryDirectory(prefix="signflow-drawing-")

ARTIFACTS = Path(_temporary_directory.name)
with sync_playwright() as p:
    options = {"headless": True}
    if os.environ.get("CHROMIUM_PATH"):
        options["executable_path"] = os.environ["CHROMIUM_PATH"]
    b = p.chromium.launch(**options)
    results = []
    for width in [390, 1440]:
        mobile = width < 850
        c = b.new_context(
            viewport={"width": width, "height": 1400},
            has_touch=mobile,
            is_mobile=mobile,
        )
        page = c.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(
            os.environ.get("SIGNFLOW_URL", "http://127.0.0.1:8000"),
            wait_until="networkidle",
        )
        source = ARTIFACTS / "source.pdf"
        source.write_bytes(
            bytes(
                page.evaluate(
                    """async()=>{const d=await PDFLib.PDFDocument.create();d.addPage([612,792]);return Array.from(await d.save())}"""
                )
            )
        )
        page.locator("#pdfFile").set_input_files(str(source))
        page.wait_for_function("!document.querySelector('#mobileDraw').disabled")

        def menu():
            if mobile:
                page.locator("#mobileDraw").click()
            elif not page.locator("#paintControls").is_visible():
                page.locator("#paintToggle").click()

        def draw():
            if mobile:
                page.locator("#closeSheet").click()
            elif not page.locator("#pageWrap").evaluate(
                '(e)=>e.classList.contains("painting")'
            ):
                page.locator("#paintToggle").click()
            page.wait_for_timeout(100)
            page.evaluate("scrollTo(0,0)")

        menu()
        page.locator("#paintWidth").fill("8")
        draw()

        def line(y):
            r = page.locator("#paintCanvas").bounding_box()
            page.mouse.move(r["x"] + r["width"] * 0.15, r["y"] + r["height"] * y)
            page.mouse.down()
            page.mouse.move(
                r["x"] + r["width"] * 0.85, r["y"] + r["height"] * y, steps=1
            )
            page.mouse.up()

        def alpha(x, y):
            return page.locator("#paintCanvas").evaluate(
                '(c,p)=>c.getContext("2d").getImageData(Math.round(c.width*p[0]),Math.round(c.height*p[1]),1,1).data[3]',
                [x, y],
            )

        line(0.4)
        line(0.55)
        assert alpha(0.5, 0.4) > 100 and alpha(0.5, 0.55) > 100
        menu()
        page.locator("#eraserTool").click()
        page.locator("#paintWidth").fill("24")
        assert page.locator("#brushLabel").inner_text() == "24 pt"
        draw()
        r = page.locator("#paintCanvas").bounding_box()
        x = r["x"] + r["width"] * 0.5
        y = r["y"] + r["height"] * 0.4
        page.mouse.move(x, y - 25)
        assert page.locator("#brushCursor").is_visible()
        indicator = page.locator("#brushCursor").evaluate(
            "(e)=>parseFloat(e.style.width)"
        )
        assert abs(indicator - 24 * r["width"] / 612) < 0.1
        page.mouse.down()
        page.mouse.move(x, y + 25, steps=1)
        page.mouse.up()
        assert alpha(0.5, 0.4) == 0 and alpha(0.2, 0.4) > 100 and alpha(0.8, 0.4) > 100
        assert alpha(0.5, 0.55) > 100
        # One undo restores the entire erasing gesture.
        menu()
        page.locator("#undoPaint").click()
        assert alpha(0.5, 0.4) > 100
        page.locator("#penTool").click()
        assert page.locator("#paintWidth").input_value() == "8"
        page.locator("#eraserTool").click()
        assert page.locator("#paintWidth").input_value() == "24"
        draw()
        r = page.locator("#paintCanvas").bounding_box()
        x = r["x"] + r["width"] * 0.5
        y = r["y"] + r["height"] * 0.4
        page.mouse.move(x, y - 25)
        page.mouse.down()
        page.mouse.move(x, y + 25, steps=4)
        page.mouse.up()
        assert alpha(0.5, 0.4) == 0
        with page.expect_download() as dl:
            page.locator("#mobileSave" if mobile else "#download").click()
        out = ARTIFACTS / f"partial-erase-{width}.pdf"
        dl.value.save_as(str(out))
        page.locator("#pdfFile").set_input_files(str(out))
        page.wait_for_function(
            "!document.querySelector('#mobileDraw').disabled && document.querySelector('#mobileFilename').textContent.startsWith('partial-erase')"
        )
        page.wait_for_timeout(100)

        def rgb(x, y):
            return page.locator("#pdfCanvas").evaluate(
                '(c,p)=>Array.from(c.getContext("2d").getImageData(Math.round(c.width*p[0]),Math.round(c.height*p[1]),1,1).data)',
                [x, y],
            )

        assert (
            min(rgb(0.5, 0.4)[:3]) > 240
            and max(rgb(0.2, 0.4)[:3]) < 150
            and max(rgb(0.8, 0.4)[:3]) < 150
        )
        assert max(rgb(0.5, 0.55)[:3]) < 150
        assert not errors, errors
        results.append(
            {
                "width": width,
                "live_size_indicator": "passed",
                "partial_erase_sparse_stroke": "passed",
                "nearby_stroke_preserved": "passed",
                "one_gesture_undo": "passed",
                "separate_sizes": "passed",
                "export_and_reopen": "passed",
                "errors": errors,
            }
        )
        c.close()
    print(json.dumps(results, indent=2))
    b.close()
