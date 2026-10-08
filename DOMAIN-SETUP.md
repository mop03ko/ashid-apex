# aac.mn migration

Prepared for GitHub Pages publishing from `main` / `docs`.

As checked on 2026-10-08, public DNS returned NXDOMAIN for aac.mn. Confirm domain registration and active nameservers first. Do not merge this migration until DNS access is ready: adding CNAME may redirect the existing github.io site to the new domain.

1. Confirm control of aac.mn and active DNS hosting.
2. Merge this change; confirm Settings > Pages > Custom domain is aac.mn.
3. Configure the following DNS records at the active provider:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | mop03ko.github.io |

TTL: provider default or 3600 seconds. Replace only conflicting website records for @ and www. Preserve email MX/TXT and other unrelated records. Do not use URL forwarding or include /ashid-apex in the CNAME target.

4. Wait for GitHub DNS validation and certificate issuance, then enable Enforce HTTPS.
5. Verify https://aac.mn/, both languages, assets, forms, https://www.aac.mn/, sitemap and old github.io redirects.

Build regenerates docs/CNAME, canonical URLs, hreflang, Open Graph URLs, organization URL, sitemap and robots using company.url.

Source: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
