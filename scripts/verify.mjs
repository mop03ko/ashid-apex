import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('docs');let pages=0,links=0;
for(const lang of ['mn','en'])for(const name of await readdir(path.join(root,lang))){
 const file=path.join(root,lang,name),html=await readFile(file,'utf8');pages++;
 assert(html.includes(`<html lang="${lang}">`),file+': language');
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file+': one h1');
 assert(html.includes('rel="canonical"')&&html.includes('hreflang="en"')&&html.includes('hreflang="mn"'),file+': SEO');
 for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g))if(!/^(https?:|mailto:|tel:|#)/.test(url)){await access(path.resolve(path.dirname(file),url.split(/[?#]/)[0]));links++;}
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,file+': duplicate IDs');
 for(const [,id] of html.matchAll(/\bfor="([^"]+)"/g))assert(ids.includes(id),file+': label target '+id);
 assert(!/undefined|\[object Object\]/.test(html),file+': accidental placeholder');
}
assert.equal(pages,24);console.log(`Verified ${pages} localized pages and ${links} local links/assets, labels, IDs, headings and SEO tags.`);

