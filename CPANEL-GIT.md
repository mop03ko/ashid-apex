# Connect aac.mn to GitHub through cPanel

Repository: https://github.com/mop03ko/ashid-apex.git
Branch: main

## One-time setup

1. In cPanel > Domains, confirm the exact Document Root for aac.mn.
2. Confirm AutoSSL is valid for aac.mn and www.aac.mn. The existing cPanel build enables HTTPS redirects.
3. In Files > Git Version Control > Create, enable Clone a Repository.
   Use the repository URL above and a new empty repository directory OUTSIDE the website Document Root (for example, repositories/ashid-apex under your account home).
4. Select main as the checked-out branch.
5. In cPanel Terminal, enable Node.js 20+ and npm in PATH; zip, tar, realpath and shell access are required.
6. Using File Manager, create .config/ashid-apex/deploy-path under your account home. Its only line must be the absolute Document Root verified in step 1. Do not put this configuration in Git or the public website directory.
7. Git Version Control > Manage > Pull or Deploy > Update from Remote, then Deploy HEAD Commit.

The deployment builds and verifies the site for https://aac.mn, backs up the existing Document Root under ~/ashid-apex-backups, then copies only dist/cpanel/public_html contents. It replaces matching website files including .htaccess but does not remove unrelated files. Review backup storage usage periodically.

## Future updates

Commit source changes to main, then click Update from Remote and Deploy HEAD Commit. This is a manual pull-and-deploy connection: pushing to GitHub alone does not automatically update the live website.

No DNS or email changes are needed for this connection. Keep aac.mn pointing to the cPanel host. Do not merge the older GitHub Pages custom-domain proposal for this hosting setup.

If Git Version Control, shell access or Node.js is unavailable, ask the hosting provider to enable it; otherwise use the existing npm run cpanel packaging command and upload the generated archive.

cPanel documentation: https://docs.cpanel.net/cpanel/files/git-version-control/
