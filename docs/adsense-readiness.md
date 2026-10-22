# AdSense preparation

## Implemented

- A usable PDF editor with a clear introduction, upload action, and product explanation.
- An original, dedicated signing guide covering signatures, text, dates, drawing,
  confirmation, mobile use, saving, and troubleshooting.
- About, Contact, and Privacy pages linked through desktop navigation, the mobile
  Help menu, and page footers.
- A privacy policy describing browser-memory document processing, downloads,
  hosting/CDN requests, public feedback, and the current absence of advertising.
- Search metadata, canonical URLs, a sitemap, and regression checks for page links
  and editor workflows.

These additions are preparation, not a guarantee of AdSense eligibility or approval.
Google makes that decision after reviewing the site and account.

## Still requires the owner's AdSense account

No publisher ID has been supplied. No advertising scripts, verification placeholders,
consent banner, or fabricated ads.txt entries have been published.

1. Create an account at [Google AdSense](https://www.google.com/adsense/start/) and
   follow the current site eligibility and ownership instructions shown there.
   Confirm that the address Google accepts matches a site you control. GitHub Pages
   project paths are not independent domain roots; a custom domain may simplify
   ownership and advertising-file management, but is not a promise of approval.
2. Use Google's exact public verification code or meta tag with your real publisher
   ID. Do not substitute a sample `ca-pub-…` value. Verification and live ad serving
   are separate setup decisions; do not turn on ad placements without reviewing
   privacy and consent behavior.
3. Before enabling ads, update the privacy policy to describe the actual provider,
   cookies/storage, personalization choices, and data practices. Configure any
   required consent platform and regional consent handling. A generic banner that
   does not control ad loading is not a substitute for this setup.
4. Follow the exact ads.txt instructions and seller record Google provides. Publish
   the record where Google says it will be fetched and verify that URL returns the
   actual text file.
5. Review the site on mobile and desktop with the final configuration. Keep ads
   distinct from Upload, Sign, Done, and Save controls. Do not place ads where users
   could mistake them for document actions.
6. Submit the site for review through AdSense and resolve any issues Google reports.

## Important: ads.txt and this hosting path

The app lives at `https://ben-ortiz.github.io/Signflow/`. An ads.txt file placed
inside this repository would normally be served at
`https://ben-ortiz.github.io/Signflow/ads.txt`. That is not the origin-root URL
`https://ben-ortiz.github.io/ads.txt` and should not be presented as a completed
root ads.txt setup.

For the GitHub Pages origin-root URL, you would generally manage the file through
the user-site repository serving `ben-ortiz.github.io`, if you control it. Another
option is serving SignFlow at the root of a custom domain you control. Follow
Google's current instructions for your specific site and verify the fetched URL.
No changes to another repository or domain configuration have been made here.

## Helpful references

- [AdSense eligibility requirements](https://support.google.com/adsense/answer/9724)
- [Connect your site to AdSense](https://support.google.com/adsense/answer/7584263)
- [Create an ads.txt file](https://support.google.com/adsense/answer/7532444)
- [Google publisher privacy-policy requirements](https://support.google.com/adsense/answer/1348695)

Always follow the current instructions in your own AdSense account. This document
contains no publisher authorization and does not enable ads.
