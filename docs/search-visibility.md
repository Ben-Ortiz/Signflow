# Search visibility

SignFlow's canonical public URL is **https://ben-ortiz.github.io/Signflow/**.
The homepage includes descriptive search metadata, visible signing instructions
and FAQs, structured WebApplication information, and social preview metadata.
The sitemap is **https://ben-ortiz.github.io/Signflow/sitemap.xml**.

## Connect Google Search Console

The site owner needs to complete these steps in their Google account:

1. Open [Google Search Console](https://search.google.com/search-console/) and add
   a **URL-prefix** property for `https://ben-ortiz.github.io/Signflow/`.
2. Follow Google's ownership verification instructions. Use the HTML verification
   file or meta tag Google supplies; the value is specific to your account. If
   using an HTML file, add it to the repository and to the deployment staging step
   so it appears at the exact URL Google requests. A meta tag belongs in the
   homepage's `<head>`.
3. In **Sitemaps**, submit `https://ben-ortiz.github.io/Signflow/sitemap.xml`.
4. Use **URL inspection** for the canonical homepage, run the live test, and
   request indexing. Confirm that Google can fetch the page and its assets.
5. Monitor indexing and search performance. Use actual queries, impressions,
   clicks, and Core Web Vitals to guide changes after data becomes available.

These steps have not been performed automatically. Search Console requires the
owner's Google account, and indexing or a particular search position is not
guaranteed. Metadata and structured data describe the app; they do not guarantee
rich results or high rankings.

## Maintain discoverability

- Keep search titles, descriptions, FAQs, and structured data accurate as features
  change. Use language that helps people complete the task rather than repeating
  keywords or creating near-identical pages.
- Keep important information in the initial HTML, readable without JavaScript.
  Signing guidance hides after a successful upload to keep the editor clear.
- Include new public assets in `.github/workflows/deploy.yml`. Keep the sitemap's
  URLs canonical and public; document files and user edits do not belong there.
- If adding a custom domain, update canonical URLs, structured data, social image
  URLs, and the sitemap together, and redirect the previous address appropriately.
- Google reads `robots.txt` at an origin's root. A file at
  `/Signflow/robots.txt` does not control crawling for this GitHub Pages project.
  Do not rely on a project-folder robots file to advertise the sitemap or manage
  indexing. Submit the sitemap through Search Console instead.
- Share the project where it is relevant, such as a portfolio or useful signing
  guide. Earn relevant links through useful content; avoid purchased links and
  spam submissions.

Run `npm run check` before publishing. SEO regression tests check canonical URL
consistency, JSON-LD, public asset paths, preview dimensions, and script order.
Browser tests additionally verify that metadata changes do not break PDF editing.
