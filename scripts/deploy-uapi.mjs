// Uploads dist/cpanel/public_html to a cPanel Document Root over HTTPS (cPanel API token).
// Env: CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN or CPANEL_PASSWORD, optional CPANEL_DOCROOT (default public_html, relative to home).
// Matching files are overwritten; files that are not part of the site are left untouched.
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
process.on('uncaughtException',e=>{console.error(`::error::${e.message}`);process.exit(1);});

const {CPANEL_HOST:host='',CPANEL_USER:user='',CPANEL_TOKEN:token='',CPANEL_PASSWORD:password=''}=process.env;
const docroot=(process.env.CPANEL_DOCROOT||'public_html').replace(/^\/+|\/+$/g,'');
if(!host||!user||!(token||password)){console.error('CPANEL_HOST, CPANEL_USER and CPANEL_TOKEN or CPANEL_PASSWORD are required.');process.exit(1);}
if(/[:/\s]/.test(host)){console.error('CPANEL_HOST must be a host name only (no https://, port, path or spaces).');process.exit(1);}
const base=process.env.CPANEL_URL||`https://${host}:2083`;
// API token when available; otherwise the account password over HTTPS (Basic auth).
const headers={Authorization:token?`cpanel ${user}:${token}`:`Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`};
const source=path.resolve(process.argv[2]||'dist/cpanel/public_html');

async function call(url,init){
  const res=await fetch(url,{...init,headers});
  const text=await res.text();
  if(res.status===401||res.status===403)throw new Error(`cPanel rejected the login (HTTP ${res.status}). Check CPANEL_USER and CPANEL_TOKEN or CPANEL_PASSWORD. Two-factor authentication blocks password login.`);
  if(!res.ok)throw new Error(`HTTP ${res.status} from ${new URL(url).pathname}`);
  try{return JSON.parse(text);}catch{throw new Error(`Unexpected non-JSON response from ${new URL(url).pathname}`);}
}

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
