// Reports why website email to info@aac.mn may not arrive, using the cPanel API.
// Output is redacted for public Actions logs: other email addresses are hidden.
import {call,base} from './cpanel-api.mjs';

const MAILBOX='info@aac.mn',DOMAIN='aac.mn';
const redact=v=>String(v??'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,m=>m.toLowerCase()===MAILBOX?m:'<email>');
const uapi=async(mod,fn,params={})=>{
  try{const r=await call(`${base}/execute/${mod}/${fn}?${new URLSearchParams(params)}`);
    if(r.status!==1)console.log(`  ${mod}::${fn} error: ${redact((r.errors||[]).join('; '))}`);return Array.isArray(r.data)?r.data:null;}
  catch(e){console.log(`  ${mod}::${fn} unavailable: ${redact(e.message)}`);return null;}
};

// --set-remote: route aac.mn mail to its public MX (mail.mn) instead of local cPanel mailboxes.
if(process.argv.includes('--set-remote')){
  console.log('0. Set mail routing to remote');
  const r=await call(`${base}/execute/Email/set_always_accept?${new URLSearchParams({domain:DOMAIN,mxcheck:'remote'})}`);
  console.log(r.status===1?'  done':`  failed: ${redact((r.errors||[]).join('; '))}`);
}

console.log('1. Mailbox');
const pops=await uapi('Email','list_pops');
if(pops)console.log(`  ${MAILBOX} exists: ${pops.some(p=>String(p.email).toLowerCase()===MAILBOX)?'yes':'NO'} (mailboxes on account: ${pops.length})`);

console.log('2. Forwarders for '+DOMAIN);
const fwd=await uapi('Email','list_forwarders',{domain:DOMAIN});
if(fwd)console.log(`  forwarders from ${MAILBOX}: ${fwd.filter(f=>String(f.dest||f.html_dest).toLowerCase()===MAILBOX).length}`);

console.log('3. Mail routing (MX)');
const mx=await uapi('Email','list_mxs',{domain:DOMAIN});
for(const d of mx||[])if(String(d.domain).toLowerCase()===DOMAIN)
  console.log(`  routing: ${d.mxcheck} (detected: ${d.detected}); MX: ${(d.entries||[]).map(e=>`${e.priority} ${e.mx}`).join(', ')||'none'}`);

console.log('4. Recent deliveries to '+MAILBOX+' (newest first)');
const track=await uapi('EmailTrack','search',{success:1,defer:1,failure:1,inprogress:1,max_results_by_type:50,'api.sort_column':'sendunixtime','api.sort_reverse':1});
const rows=(track||[]).filter(t=>[t.recipient,t.email,t.deliveredto].some(x=>String(x||'').toLowerCase().includes(MAILBOX))).slice(0,10);
if(track&&!rows.length)console.log(`  no tracked messages to ${MAILBOX} (total tracked: ${track.length})`);
for(const t of rows){
  const when=t.sendunixtime?new Date(t.sendunixtime*1000).toISOString().slice(0,16).replace('T',' '):t.actiontime||'';
  console.log(`  ${when} UTC | ${t.type||t.status||''} | delivered to: ${redact(t.deliveredto||'-')} | ${redact(t.message||t.reason||'').slice(0,240)}`);
}

console.log('5. Recent contact.php errors (public_html/error_log)');
try{
  const r=await call(`${base}/execute/Fileman/get_file_content?${new URLSearchParams({dir:'public_html',file:'error_log'})}`);
  const lines=String(r?.data?.content||'').split('\n').filter(l=>l.includes('contact.php')).slice(-8);
  console.log(lines.length?lines.map(l=>'  '+redact(l).slice(0,300)).join('\n'):`  none${r?.status!==1?' ('+redact((r?.errors||[]).join('; '))+')':''}`);
}catch(e){console.log('  unavailable: '+redact(e.message));}
