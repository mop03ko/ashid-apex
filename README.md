# Ashid Apex Consulting

Premium bilingual (Mongolian / English) corporate website for international recruitment and workforce solutions in Mongolia.

Live: https://mop03ko.github.io/ashid-apex/

## Edit and publish

Requires Node.js 20 or later; no package dependencies.

```sh
npm run build
npm test
npm run dev
```

Edit bilingual copy and company details in `src/content.mjs`. Shared page components and metadata are in `scripts/build.mjs`; visual styling and progressive interactions are in `assets/`. Run the build and commit both source and generated `docs/` files. GitHub Pages publishes `main` → `/docs`. `.nojekyll` ensures static output is served directly. Relative asset links support the `/ashid-apex/` project base path and direct navigation to every localized HTML page.

The root opens Mongolian; every page has a corresponding English page and a language switch that keeps the current page. Core content, navigation, contact links and FAQs work without JavaScript.

## Inquiry delivery

GitHub Pages has no application backend. Employer, agency and general inquiry forms validate required fields, prepare a reviewable email, and offer email-app, clipboard and text-download actions. **Requests are not automatically submitted or stored.** The visitor must send the prepared email to `Ashidapex.consulting@gmail.com`; the UI states this explicitly. No API secrets or third-party form processors are used. Direct delivery can be added later with an owner-configured form endpoint and corresponding privacy update.

## Brand and content

The latest BRIDGE / REFINED 02 concept (angled navy supports and a connecting teal arch) is implemented as a lightweight vector adaptation of the approved reference, in deep navy #102D48 and muted teal #4E9F9B. Shared headers, footers, favicon, About page, hero illustration and social preview use this identity. The globe illustration is symbolic, not a claim of offices or an established country network. No fabricated clients, testimonials, placement statistics, licences or vacancies appear.

Phone `77777777` is the temporary number supplied by the owner. The website uses Mongolia country code +976 for the call link. WhatsApp is not shown until a WhatsApp-enabled number is confirmed. Address and company email follow supplied project content. Jobs displays an honest empty state until verified vacancies are available.

## Checks

`npm test` verifies every localized page, local link and asset, document language, canonical/alternate metadata, one primary heading, unique IDs and form label targets. Browser QA covers desktop/mobile layouts, navigation, language switching, FAQ disclosure, validation and request preview. `assets/bridge-social.png` is the raster social preview generated from `assets/bridge-social.svg`.

## Maintenance

Update `company.url` when moving to a custom domain, then rebuild to regenerate canonical URLs and sitemap. Review public contact details and legal copy as business operations change. Keep sensitive documents and credentials out of this public repository.
