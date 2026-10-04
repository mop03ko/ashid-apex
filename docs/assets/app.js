(() => {
 const menu=document.querySelector('.menu-toggle'), nav=document.querySelector('#site-menu');
 menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.hidden=!open;menu.replaceChildren(document.createTextNode(open?menu.dataset.close:menu.dataset.open));const symbol=document.createElement('span');symbol.setAttribute('aria-hidden','true');symbol.textContent=open?'×':'☰';menu.append(symbol);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.click();menu.focus();}});
 const form=document.querySelector('[data-inquiry]');if(!form)return;
 const en=form.dataset.language==='en',panel=form.closest('.form-panel'),preview=panel.querySelector('.request-preview'),text=preview.querySelector('textarea'),status=preview.querySelector('.form-status');
 let body='',subject='';
 form.addEventListener('submit',e=>{
  e.preventDefault();if(!form.reportValidity())return;
  const data=new FormData(form);subject='Ashid Apex — '+({employers:'Workforce request',partners:'Agency partnership inquiry',contact:'General inquiry'}[form.dataset.inquiry]);
  body=subject+'\n\n'+Array.from(data.entries()).filter(([key])=>key!=='consent').map(([key,value])=>{const el=form.elements.namedItem(key);return (el.labels?.[0]?.childNodes[0]?.textContent.trim()||key)+': '+String(value).trim();}).join('\n\n');
  text.value=body;preview.querySelector('.email-action').href='mailto:Ashidapex.consulting@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);form.hidden=true;preview.hidden=false;status.textContent='';preview.focus({preventScroll:true});preview.scrollIntoView({block:'start',behavior:'instant'});
 });
 preview.querySelector('.edit-action').addEventListener('click',()=>{preview.hidden=true;form.hidden=false;form.querySelector('input').focus();});
 preview.querySelector('.copy-action').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(body);status.textContent=en?'Copied. Paste it into your email.':'Хууллаа. Имэйлдээ буулгаад илгээнэ үү.';}catch{status.textContent=en?'Select the request text to copy, or download it below.':'Хүсэлтийн текстийг сонгон хуулах эсвэл татаж авна уу.';text.focus();text.select();}});
 preview.querySelector('.download-action').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob(['\uFEFF'+body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ashid-apex-request.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
})();



