// cPanel-only runtime editing. GitHub Pages keeps its static build.
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export async function packageCMS(root){
 const manifest={pages:{},fields:{}},dir=path.join(root,'admin/templates');await mkdir(dir,{recursive:true});
 for(const lang of ['mn','en'])for(const slug of ['index','about','services','industries','employers','partners','process','faq','jobs','contact','privacy','terms']){
  const page=`${lang}/${slug}`,fields=[];let html=await readFile(path.join(root,`${page}.html`),'utf8');
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>|[^<]+/gi,part=>{
   if(part.startsWith('<')||!/[\p{L}\p{N}]/u.test(part)||part.includes('©')||part==='info@aac.mn'||part==='77777777')return part;
   const id=lang+'_'+createHash('sha256').update(part).digest('hex').slice(0,20);
   manifest.fields[id]=part;if(!fields.includes(id))fields.push(id);return `{{AAC:${id}}}`;
  });
  manifest.pages[page]={label:slug,fields};await writeFile(path.join(dir,`${lang}-${slug}.html`),html);
 }
 await writeFile(path.join(root,'admin/defaults.json'),JSON.stringify(manifest));
 await cp('server/admin',path.join(root,'admin'),{recursive:true});
 await cp('server/cms-page.php',path.join(root,'cms-page.php'));
 await writeFile(path.join(root,'admin/.htaccess'),`Options -Indexes\nDirectoryIndex index.php\n<FilesMatch "^(defaults\\.json|core\\.php)$">\nRequire all denied\n</FilesMatch>\n<IfModule mod_headers.c>\nHeader always set Cache-Control "no-store"\n</IfModule>\n`);
 await writeFile(path.join(dir,'.htaccess'),'Require all denied\n');
}
