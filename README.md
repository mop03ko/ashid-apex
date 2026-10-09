# Ashid Apex Consulting

Premium bilingual (Mongolian / English) corporate website for international recruitment and workforce solutions in Mongolia.

Live: https://aac.mn (cPanel). Mirror: https://mop03ko.github.io/ashid-apex/

## Edit and publish

Requires Node.js 20 or later; no package dependencies.

```sh
npm run build
npm test
npm run dev
```

Edit English copy and company details in `src/content.mjs` and Mongolian copy in `src/mn.mjs`. Shared page components and metadata are in `scripts/build.mjs`; visual styling and progressive interactions are in `assets/`. Run the build and commit both source and generated `docs/` files. GitHub Pages publishes `main` → `/docs`. `.nojekyll` ensures static output is served directly. Relative asset links support the `/ashid-apex/` project base path and direct navigation to every localized HTML page.

The root opens Mongolian; every page has a corresponding English page and a language switch that keeps the current page. Core content, navigation, contact links and FAQs work without JavaScript.

## Inquiry delivery

On aac.mn (cPanel), employer, agency and general inquiry forms send directly: `assets/app.js` posts to `contact.php` (source `server/contact.php`), which emails the request to `info@aac.mn` with PHP `mail()` and sets Reply-To to the visitor's address. The endpoint accepts POST only, checks the Origin, validates required fields, blocks header injection, uses a hidden honeypot field and limits each IP (stored only as a short-lived hash) to 5 requests per 10 minutes. No database or third-party form processor is used.

If sending fails, or on the GitHub Pages mirror where PHP is unavailable, the form falls back to a reviewable email with email-app, clipboard and text-download actions, and the UI says the request was not sent.

## Brand and content

Concept 01 (geometric A with an ascending teal path) is implemented as a lightweight SVG adaptation of the supplied logo. Shared headers, footers, favicon, About page, hero illustration and social preview use this identity. The globe illustration is symbolic, not a claim of offices or an established country network. No fabricated clients, testimonials, placement statistics, licences or vacancies appear.

Phone `77777777` is the temporary number supplied by the owner. The website uses Mongolia country code +976 for the call link. WhatsApp is not shown until a WhatsApp-enabled number is confirmed. Address and company email follow supplied project content. Jobs displays an honest empty state until verified vacancies are available.

## Checks

`npm test` verifies every localized page, local link and asset, document language, canonical/alternate metadata, one primary heading, unique IDs and form label targets. Browser QA covers desktop/mobile layouts, navigation, language switching, FAQ disclosure, validation and request preview. `assets/apex-social.png` is the raster social preview generated from `assets/apex-social.svg`.

## Maintenance

`company.url` (`https://aac.mn`) is the canonical domain for every build, including the GitHub Pages mirror. Update it if the domain changes, then rebuild to regenerate canonical URLs and sitemap. Review public contact details and legal copy as business operations change. Keep sensitive documents and credentials out of this public repository.

## cPanel deployment

Pushes to `main` deploy to https://aac.mn automatically via GitHub Actions once the cPanel API secrets are set; see `CPANEL-GIT.md`. To build a package manually:

```sh
npm run cpanel -- https://aac.mn
```

Builds `dist/cpanel/public_html/` (with `.htaccess`) and `dist/ashid-apex-cpanel.zip`, using the given domain for canonical, hreflang, Open Graph, sitemap and robots URLs. In cPanel File Manager, open `public_html`, upload the zip, choose **Extract**, then delete the zip. Enable SSL (AutoSSL) before relying on the HTTPS redirect in `.htaccess`. `dist/` is not committed.
