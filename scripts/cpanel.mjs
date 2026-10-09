// Builds a cPanel-ready copy of the site: dist/cpanel/public_html + dist/ashid-apex-cpanel.zip
// Usage: npm run cpanel -- https://your-domain.mn
import {rm,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const site=(process.argv[2]||process.env.SITE_URL||'').replace(/\/+$/,'');
if(!/^https?:\/\/[^/]+$/.test(site)){console.error('Usage: npm run cpanel -- https://your-domain.mn  (domain root, no sub-path)');process.exit(1);}
const dist=path.resolve('dist'),root=path.join(dist,'cpanel','public_html'),zip=path.join(dist,'ashid-apex-cpanel.zip');
await rm(dist,{recursive:true,force:true});await mkdir(root,{recursive:true});
const env={...process.env,OUT_DIR:root,SITE_URL:site};
execFileSync(process.execPath,['scripts/build.mjs'],{env,stdio:'inherit'});
await writeFile(path.join(root,'.htaccess'),`# Ashid Apex Consulting (cPanel / Apache)
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddDefaultCharset UTF-8
AddType image/svg+xml .svg
AddType application/xml .xml

<IfModule mod_rewrite.c>
RewriteEngine On
# Force HTTPS (enable SSL / AutoSSL in cPanel first)
RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !https
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
# Language folders without a file name
RewriteRule ^(mn|en)/?$ /$1/index.html [L,R=301]
</IfModule>

<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-Frame-Options "SAMEORIGIN"
<FilesMatch "\\.(css|js|svg|png)$">
Header set Cache-Control "public, max-age=2592000"
</FilesMatch>
<FilesMatch "\\.html$">
Header set Cache-Control "no-cache"
</FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript image/svg+xml application/xml text/plain
</IfModule>
`);
// Direct inquiry delivery (PHP mail); GitHub Pages builds fall back to the email preview.
await copyFile('server/contact.php',path.join(root,'contact.php'));
execFileSync(process.execPath,['scripts/verify.mjs',root],{stdio:'inherit'});
execFileSync('zip',['-r','-q','-X',zip,'.'],{cwd:root,stdio:'inherit'});
console.log(`cPanel package for ${site}:\n  ${path.relative('.',root)}/\n  ${path.relative('.',zip)}`);
