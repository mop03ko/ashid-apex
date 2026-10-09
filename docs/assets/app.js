(() => {
 const menu=document.querySelector('.menu-toggle'), nav=document.querySelector('#site-menu');
 menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.hidden=!open;menu.replaceChildren(document.createTextNode(open?menu.dataset.close:menu.dataset.open));const symbol=document.createElement('span');symbol.setAttribute('aria-hidden','true');symbol.textContent=open?'×':'☰';menu.append(symbol);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.click();menu.focus();}});
 const form=document.querySelector('[data-inquiry]');if(!form)return;
 const en=form.dataset.language==='en',panel=form.closest('.form-panel'),preview=panel.querySelector('.request-preview'),text=preview.querySelector('textarea'),status=preview.querySelector('.form-status');
 const sent=panel.querySelector('.request-sent'),submit=form.querySelector('[type=submit]'),label=submit.innerHTML;
 let body='',subject='';
 const showPreview=()=>{text.value=body;preview.querySelector('.email-action').href='mailto:info@aac.mn?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);form.hidden=true;preview.hidden=false;status.textContent=form.dataset.failed;preview.focus({preventScroll:true});preview.scrollIntoView({block:'start',behavior:'instant'});};
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!form.reportValidity()||submit.disabled)return;
  const data=new FormData(form);subject='Ashid Apex — '+((en?{employers:'Workforce request',partners:'Agency partnership inquiry',contact:'General inquiry'}:{employers:'Ажилтан авах хүсэлт',partners:'Хамтран ажиллах хүсэлт',contact:'Холбоо барих хүсэлт'})[form.dataset.inquiry]);
  body=subject+'\n\n'+Array.from(data.entries()).filter(([key])=>key!=='consent'&&key!=='website').map(([key,value])=>{const el=form.elements.namedItem(key);return (el.labels?.[0]?.childNodes[0]?.textContent.trim()||key)+': '+String(value).trim();}).join('\n\n');
  data.append('kind',form.dataset.inquiry);data.append('lang',en?'en':'mn');data.append('body',body);
  submit.disabled=true;submit.textContent=submit.dataset.sending;
  let ok=false;
  try{const res=await fetch(new URL('../contact.php',location.href),{method:'POST',body:data,headers:{Accept:'application/json'}});ok=res.ok&&(await res.json()).ok===true;}catch{}
  submit.disabled=false;submit.innerHTML=label;
  if(ok){form.reset();form.hidden=true;sent.hidden=false;sent.focus({preventScroll:true});sent.scrollIntoView({block:'start',behavior:'instant'});}
  else showPreview();
 });
 sent.querySelector('.new-action').addEventListener('click',()=>{sent.hidden=true;form.hidden=false;form.querySelector('input').focus();});
 preview.querySelector('.edit-action').addEventListener('click',()=>{preview.hidden=true;form.hidden=false;form.querySelector('input').focus();});
 preview.querySelector('.copy-action').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(body);status.textContent=en?'Copied. Paste it into your email.':'Хүсэлтийг хууллаа. Имэйлдээ буулгаж илгээнэ үү.';}catch{status.textContent=en?'Select the request text to copy, or download it below.':'Хуулж чадсангүй. Хүсэлтийн текстийг сонгож хуулах эсвэл файл болгон татаж авна уу.';text.focus();text.select();}});
 preview.querySelector('.download-action').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob(['\uFEFF'+body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ashid-apex-request.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
})();


