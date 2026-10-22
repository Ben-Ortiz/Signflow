const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const canonical = "https://ben-ortiz.github.io/Signflow/";

test("search metadata and sitemap agree on the canonical project URL", () => {
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(html.includes(`rel="canonical" href="${canonical}"`));
  assert.match(html, /<meta\s+name="description"[\s\S]*?content="[^"]+"/);
  assert.match(html, /<title>Sign PDF Online Free/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.ok(!/noindex|nofollow/.test(html));
  const sitemap = readFileSync(resolve(root, "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
  assert.equal((sitemap.match(/<loc>/g) || []).length, 5);
});

test("structured app information is parseable and matches the actual free application", () => {
  const block = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(block);
  const data = JSON.parse(block[1]);
  assert.equal(data["@context"], "https://schema.org");
  const app = data["@graph"].find((item) => item["@type"] === "WebApplication");
  assert.equal(app.url, canonical);
  assert.equal(app.name, "SignFlow");
  assert.equal(app.isAccessibleForFree, true);
  assert.equal(app.offers.price, "0");
  assert.ok(
    !app.aggregateRating,
    "Do not invent ratings for search appearance",
  );
});

test("local page and social assets exist, and the share image has declared dimensions", () => {
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const url = match[1];
    if (/^https?:/.test(url)) continue;
    assert.ok(existsSync(resolve(root, url.split("?")[0])), `Missing ${url}`);
  }
  const image = readFileSync(resolve(root, "assets/social-preview.png"));
  assert.equal(image.subarray(1, 4).toString(), "PNG");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  const workflow = readFileSync(
    resolve(root, ".github/workflows/deploy.yml"),
    "utf8",
  );
  assert.ok(workflow.includes("sitemap.xml"));
  assert.ok(workflow.includes("js assets _site/"));
});

test("landing-page content is present in HTML and application scripts defer in dependency order", () => {
  assert.match(html, /id="siteGuide"/);
  assert.match(html, /How to sign a PDF online/);
  assert.match(html, /Where do my PDF and signature go/);
  const scripts = [...html.matchAll(/<script\b([^>]*\bsrc="[^"]+"[^>]*)>/g)];
  assert.equal(scripts.length, 5);
  assert.ok(scripts.every((match) => /\bdefer\b/.test(match[1])));
  assert.ok(scripts[0][1].includes("pdf.min.js"));
  assert.ok(scripts[1][1].includes("pdf-lib.min.js"));
  assert.ok(scripts[2][1].includes("core.js"));
  assert.ok(scripts[3][1].includes("pdf-export.js"));
  assert.ok(scripts[4][1].includes("app.js"));
});
