// Checks which outbound SMTP ports the cPanel server can reach, using a temporary PHP file.
// The probe holds no credentials and is deleted right after it runs.
import {randomBytes} from 'node:crypto';
import {call,base,user,docroot} from './cpanel-api.mjs';

const name=`probe-${randomBytes(8).toString('hex')}.php`;
const php=`<?php
header('Content-Type: text/plain');
foreach (['smtp.mail.mn','mx.mail.mn'] as $h) foreach ([465,587,25,2525] as $p) {
  $t=microtime(true); $fp=@fsockopen($h,$p,$no,$err,6);
  echo "$h:$p ", $fp ? 'open' : "closed ($err)", ' ', round(microtime(true)-$t,1), "s\\n";
  if ($fp) fclose($fp);
}
echo 'PHP ', PHP_VERSION, "\\n";
`;
const form=new FormData();form.append('dir',docroot);form.append('file',name);form.append('content',php);
const r=await call(`${base}/execute/Fileman/save_file_content`,{method:'POST',body:form});
if(r?.status!==1)throw new Error('Could not create probe: '+(r?.errors||[]).join('; '));
try{
  const res=await fetch(`https://${process.env.CPANEL_HOST}/${name}`);
  console.log((await res.text()).trim());
}finally{
  const q=new URLSearchParams({cpanel_jsonapi_user:user,cpanel_jsonapi_apiversion:'2',cpanel_jsonapi_module:'Fileman',cpanel_jsonapi_func:'fileop',op:'unlink',sourcefiles:`${docroot}/${name}`,doubledecode:'0'});
  const d=await call(`${base}/json-api/cpanel?${q}`);
  console.log(d?.cpanelresult?.data?.[0]?.result===1||d?.cpanelresult?.event?.result===1?'Probe removed.':'::warning::Remove '+docroot+'/'+name+' manually.');
}
