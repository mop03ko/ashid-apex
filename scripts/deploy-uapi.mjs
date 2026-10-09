// Uploads dist/cpanel/public_html to a cPanel Document Root over HTTPS (cPanel API token).
// Env: see scripts/cpanel-api.mjs (CPANEL_DOCROOT defaults to public_html, relative to home).
// Matching files are overwritten; files that are not part of the site are left untouched.
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';

import {call,host,user,docroot,base} from './cpanel-api.mjs';
const source=path.resolve(process.argv[2]||'dist/cpanel/public_html');

// Group files by directory, relative to the package root.
const dirs=new Map();
async function walk(rel){
  for(const e of await readdir(path.join(source,rel),{withFileTypes:true})){
    const r=rel?`${rel}/${e.name}`:e.name;
    if(e.isDirectory()){dirs.set(r,dirs.get(r)||[]);await walk(r);}
    else{if(!dirs.has(rel))dirs.set(rel,[]);dirs.get(rel).push(r);}
  }
}
dirs.set('',[]);await walk('');

let uploaded=0;
for(const [rel,files] of [...dirs].sort(([a],[b])=>a.split('/').length-b.split('/').length||a.localeCompare(b))){
  const target=rel?`${docroot}/${rel}`:docroot;
  if(rel){
    const parent=path.posix.dirname(target),name=path.posix.basename(target);
    const q=new URLSearchParams({cpanel_jsonapi_user:user,cpanel_jsonapi_apiversion:'2',cpanel_jsonapi_module:'Fileman',cpanel_jsonapi_func:'mkdir',path:parent,name});
    const r=await call(`${base}/json-api/cpanel?${q}`);
    const err=r?.cpanelresult?.error||r?.cpanelresult?.data?.[0]?.reason||'';
    if(r?.cpanelresult?.event?.result!==1&&err&&!/exist/i.test(err))throw new Error(`Could not create ${target}: ${err}`);
  }
  if(!files.length)continue;
  const form=new FormData();
  form.append('dir',target);form.append('overwrite','1');
  for(const [i,f] of files.entries())form.append(`file-${i+1}`,new Blob([await readFile(path.join(source,f))]),path.posix.basename(f));
  const r=await call(`${base}/execute/Fileman/upload_files`,{method:'POST',body:form});
  const failed=r?.data?.failed??(r?.status===1?0:files.length);
  if(r?.status!==1||failed){throw new Error(`Upload to ${target} failed: ${(r?.errors||[]).join('; ')||JSON.stringify(r?.data?.uploads?.filter(u=>!u.status)||r)}`);}
  uploaded+=files.length;console.log(`${target}/: ${files.length} file(s)`);
}
console.log(`Uploaded ${uploaded} files to ~/${docroot} on ${host}.`);
