const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const root = resolve(__dirname, "..");
const pages = [
  "index.html",
  "how-to-sign.html",
  "about.html",
  "contact.html",
  "privacy.html",
];
const sitemap = readFileSync(resolve(root, "sitemap.xml"), "utf8");

test("public pages have canonical metadata, meaningful content, navigation, and valid local links", () => {
  for (const page of pages) {
    const html = readFileSync(resolve(root, page), "utf8");
    const canonical = `https://ben-ortiz.github.io/Signflow/${page === "index.html" ? "" : page}`;
    assert.ok(
      html.replace(/\s+/g, " ").includes(`rel="canonical" href="${canonical}"`),
      page,
    );
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), page);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, page);
    assert.match(html, /<meta\s+name="description"/, page);
    assert.match(html, /aria-label="Site navigation"/, page);
    assert.match(html, /href="privacy.html"/, page);
    assert.match(html, /href="contact.html"/, page);
    for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (/^https?:/.test(match[1])) continue;
      const file = match[1].split(/[?#]/)[0];
      assert.ok(existsSync(resolve(root, file)), `${page}: ${file}`);
    }
  }
});

test("privacy and contact pages reflect the current local-processing app without fabricated ad setup", () => {
  const privacy = readFileSync(resolve(root, "privacy.html"), "utf8");
  assert.match(privacy, /does not currently run analytics tracking/);
  assert.match(privacy, /Cloudflare/);
  assert.match(privacy, /GitHub Pages/);
  const contact = readFileSync(resolve(root, "contact.html"), "utf8");
  assert.ok(contact.includes("https://github.com/Ben-Ortiz/Signflow/issues"));
  for (const page of pages) {
    const html = readFileSync(resolve(root, page), "utf8");
    assert.ok(!/ca-pub-\d+|adsbygoogle|googlesyndication/.test(html), page);
  }
  assert.ok(
    !existsSync(resolve(root, "ads.txt")),
    "Do not publish a fake seller authorization",
  );
});

test("deployment includes every informational page", () => {
  const workflow = readFileSync(
    resolve(root, ".github/workflows/deploy.yml"),
    "utf8",
  );
  for (const page of pages) assert.ok(workflow.includes(page), page);
});
