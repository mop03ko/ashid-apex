# Deploy aac.mn from GitHub

## Automatic deployment (GitHub Actions, recommended)

Every push to `main` runs `.github/workflows/deploy-aac.yml`: it tests the site, builds the package for https://aac.mn, and uploads `dist/cpanel/public_html/` to the Document Root through the cPanel API over HTTPS (port 2083, `scripts/deploy-uapi.mjs`). Matching files are overwritten; unrelated files on the server are not deleted. It can also be started manually from Actions > Deploy to aac.mn > Run workflow. FTP is not used, so FTP passive ports do not need to be open.

One-time setup:

1. cPanel > Security > Manage API Tokens > Create: name it `github-deploy`, no expiry or a planned rotation date. Copy the token; it is shown only once.
2. Back up the current Document Root (cPanel > Backup or File Manager > Compress), because uploads replace matching files.
3. GitHub > repository Settings > Secrets and variables > Actions > New repository secret:
   - `CPANEL_HOST`: the host you use to open cPanel, without `https://` or port (for example `aac.mn` or the server hostname)
   - `CPANEL_USER`: the cPanel account username
   - `CPANEL_TOKEN`: the API token from step 1
   - `CPANEL_DOCROOT` (optional): Document Root relative to the account home. Defaults to `public_html`.
4. Push to `main` or run the workflow manually, then confirm https://aac.mn.

Never commit the token to the repository. Revoke it in Manage API Tokens if it is exposed. FTP secrets from the earlier setup are no longer used and can be deleted.

Use only one method. If automatic deployment is active, do not also use the cPanel Git deployment below.

## Alternative: manual cPanel Git Version Control

Repository: https://github.com/mop03ko/ashid-apex.git
Branch: main

### One-time setup

1. In cPanel > Domains, confirm the exact Document Root for aac.mn.
2. Confirm AutoSSL is valid for aac.mn and www.aac.mn. The existing cPanel build enables HTTPS redirects.
3. In Files > Git Version Control > Create, enable Clone a Repository.
   Use the repository URL above and a new empty repository directory OUTSIDE the website Document Root (for example, repositories/ashid-apex under your account home).
4. Select main as the checked-out branch.
5. In cPanel Terminal, enable Node.js 20+ and npm in PATH; zip, tar, realpath and shell access are required.
6. Using File Manager, create .config/ashid-apex/deploy-path under your account home. Its only line must be the absolute Document Root verified in step 1. Do not put this configuration in Git or the public website directory.
7. Git Version Control > Manage > Pull or Deploy > Update from Remote, then Deploy HEAD Commit.

The deployment builds and verifies the site for https://aac.mn, backs up the existing Document Root under ~/ashid-apex-backups, then copies only dist/cpanel/public_html contents. It replaces matching website files including .htaccess but does not remove unrelated files. Review backup storage usage periodically.

### Future updates

Commit source changes to main, then click Update from Remote and Deploy HEAD Commit. This is a manual pull-and-deploy connection: pushing to GitHub alone does not automatically update the live website.

No DNS or email changes are needed for this connection. Keep aac.mn pointing to the cPanel host. Do not merge the older GitHub Pages custom-domain proposal for this hosting setup.

If Git Version Control, shell access or Node.js is unavailable, ask the hosting provider to enable it; otherwise use the existing npm run cpanel packaging command and upload the generated archive.

cPanel documentation: https://docs.cpanel.net/cpanel/files/git-version-control/
