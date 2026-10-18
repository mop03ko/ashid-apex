# Ashid Apex website administration

The cPanel package includes `/admin/`, a single-owner CMS for the existing bilingual site. PHP **8.1+**, PHP sessions, GD (image uploads), Apache mod_rewrite, and writable private storage are required. GitHub Pages builds remain static.

## First activation — owner only

1. After successful deployment open **https://aac.mn/admin/**. The page creates a cryptographically random, one-use setup token on the hosting account; it is never returned in an HTTP response.
2. In cPanel → File Manager → Settings, enable **Show Hidden Files**. Open `/home/aacmn/.aac-cms/setup-token.txt` (for the existing `/home/aacmn/public_html` document root).
3. Copy that code into the admin setup form. Choose a new password of at least 12 characters. Do not paste the code or password into chat, source control, or GitHub secrets.
4. The token is deleted on successful setup. Later visits use the password. Sessions expire after 30 minutes of inactivity. Changing the password invalidates other sessions.

The public setup page cannot create an administrator without the private token. If the token file is absent before setup, first open the admin page. If storage cannot be created, the hosting provider should allow the PHP account to write the private directory. Never relocate it inside public_html.

## Editing

- **Хуудасны контент:** choose Mongolian or English and one of 12 pages. Search and edit text, then save. Identical source text in the same language shares an edit across pages (navigation, footer, and repeated labels). Rich HTML is not accepted. Titles are editable; layout, links, and technical metadata are source-controlled.
- **Ажлын зар:** create a bilingual draft with title, industry, location, headcount, salary, hours, accommodation, contract, requirements, and deadline. Enable publishing only when ready. Both titles are required to publish. Turning publishing off closes the listing. Expired listings are hidden based on Ulaanbaatar's date. Applicants use the configured company email; this is not a CV storage/review system.
- **Зураг:** attach or remove a top-of-page banner for each language/page. JPEG/PNG/WebP up to 5 MB and 16 megapixels. Images are re-encoded as JPEG, flattened onto white, stripped of metadata, and resized to a maximum edge of 2400 px. Logo changes remain source-controlled.
- **Тохиргоо:** change public contact email/phone and inquiry recipient. SMTP sender credentials remain unchanged; verify delivery with your mail provider after changing recipient. Addresses are edited as page text.
- Saves publish immediately. A revision conflict prevents overwriting another tab's edits; reload before trying again. Leaving unsaved work shows a confirmation.

## Persistent files, backup, and recovery

`/home/aacmn/.aac-cms/` is outside the document root and is not part of Git deployment. It contains `auth.json`, `content.json`, `history.json` (last 20 revisions), `attempts.json`, and `media/`. Back this directory up with the hosting account. Files are written atomically; updates are serialized with a filesystem lock. A matching source-text hash retains edits on subsequent code deployments; if developers change the original wording, that new field uses the new default and should be reviewed in the admin panel. Source changes to layout may also require checking existing banners.

Password recovery requires cPanel ownership: rename `auth.json` to a private backup in the same directory, open `/admin/`, and use the newly created token. Existing content is retained. Do not delete `content.json` or the media directory.

For rollback, the hosting owner can restore a saved `state` object from `history.json` into `content.json`, with the site briefly in maintenance mode, or restore a full account backup. There is no in-browser rollback button yet. Unused uploads are kept for recovery; do not remove them without checking current content and history references.

## Verification

```sh
npm run cpanel -- https://aac.mn
python3 tests/cms.py
# To include image re-encoding tests when GD is installed:
PHP_GD="$(php -r 'echo ini_get("extension_dir");')/gd.so" python3 tests/cms.py
```

Tests run a temporary PHP server on loopback with isolated storage. `AAC_CMS_TEST=1` permits non-HTTPS test cookies only; **never set that variable on hosting**. `AAC_CMS_DATA` is an optional absolute private directory override and is rejected if inside the document root. Production cookies are Secure/HttpOnly/SameSite=Strict. CSRF tokens protect writes, repeated login attempts are throttled, uploads cannot execute, and content is HTML-escaped on output.

After deployment verify `/admin/`, `/mn/index.html`, `/en/index.html`, both job pages, and PHP/GD availability. Admin defaults and templates are protected by Apache `.htaccess`; do not serve the package from an unconfigured static server. If PHP routing fails, restore the pre-deployment `.htaccess` to return to the static HTML pages while investigating. Private edits remain intact.
