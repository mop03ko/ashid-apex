// Shared cPanel API session for deploy and diagnostic scripts.
// Env: CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN or CPANEL_PASSWORD, optional CPANEL_DOCROOT.
process.on('uncaughtException',e=>{console.error(`::error::${e.message}`);process.exit(1);});

const {CPANEL_HOST:host='',CPANEL_USER:user='',CPANEL_TOKEN:token='',CPANEL_PASSWORD:password=''}=process.env;
const docroot=(process.env.CPANEL_DOCROOT||'public_html').replace(/^\/+|\/+$/g,'');
if(!host||!user||!(token||password)){console.error('CPANEL_HOST, CPANEL_USER and CPANEL_TOKEN or CPANEL_PASSWORD are required.');process.exit(1);}
if(/[:/\s]/.test(host)){console.error('CPANEL_HOST must be a host name only (no https://, port, path or spaces).');process.exit(1);}
const origin=process.env.CPANEL_URL||`https://${host}:2083`;
// API token when available; otherwise sign in with the account password like the cPanel login page.
const headers={};let base=origin;
if(token)headers.Authorization=`cpanel ${user}:${token}`;
else{
  const res=await fetch(`${origin}/login/?login_only=1`,{method:'POST',body:new URLSearchParams({user,pass:password}),redirect:'manual'});
  let r={};try{r=JSON.parse(await res.text());}catch{}
  if(r.status!==1||!r.security_token){
    const reason=r.message||r.reason||`HTTP ${res.status}`;
    throw new Error(`cPanel login failed (${reason}). Check CPANEL_USER (the cPanel username, not an email) and CPANEL_PASSWORD by signing in at ${origin}. Two-factor authentication blocks password login.`);
  }
  headers.Cookie=(res.headers.getSetCookie?.()||[]).map(c=>c.split(';')[0]).join('; ');
  base=origin+r.security_token;
}
export async function call(url,init){
  const res=await fetch(url,{...init,headers});
  const text=await res.text();
  if(res.status===401||res.status===403)throw new Error(`cPanel rejected the login (HTTP ${res.status}). Check CPANEL_USER and CPANEL_TOKEN.`);
  if(!res.ok)throw new Error(`HTTP ${res.status} from ${new URL(url).pathname}`);
  try{return JSON.parse(text);}catch{throw new Error(`Unexpected non-JSON response from ${new URL(url).pathname}`);}
}

export {host,user,docroot,base};
