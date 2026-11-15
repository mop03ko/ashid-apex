(() => {
 const menu=document.querySelector('.menu-toggle'), nav=document.querySelector('#site-menu');
 menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.hidden=!open;menu.replaceChildren(document.createTextNode(open?menu.dataset.close:menu.dataset.open));const symbol=document.createElement('span');symbol.setAttribute('aria-hidden','true');symbol.textContent=open?'×':'☰';menu.append(symbol);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.click();menu.focus();}});

 // Gentle reveal for content below the fold. Skipped for reduced motion; content stays visible without JS.
 if('IntersectionObserver' in window&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
  const below=[...document.querySelectorAll('.pillars article,.industry-card,.service-row,.audiences article,.steps li,.mission article,.faq-list details,.photo-band,.cms-job,.country-list li')].filter(el=>el.getBoundingClientRect().top>window.innerHeight);
  if(below.length){
   document.documentElement.classList.add('reveal-ready');
   const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target;el.classList.add('is-visible');io.unobserve(el);setTimeout(()=>{el.style.transitionDelay='';},900);}),{rootMargin:'0px 0px -8% 0px'});
   below.forEach(el=>{el.style.transitionDelay=Math.min([...el.parentElement.children].indexOf(el),5)*70+'ms';el.classList.add('reveal');io.observe(el);});
  }
 }

 // Office map: loads Google Maps only when the visitor asks for it.
 document.querySelectorAll('.map-frame').forEach(frame=>{const load=frame.querySelector('.map-load');if(!load)return;load.hidden=false;load.addEventListener('click',()=>{const map=document.createElement('iframe');map.src=frame.dataset.mapSrc;map.title=frame.dataset.mapTitle;map.loading='lazy';map.referrerPolicy='no-referrer-when-downgrade';map.allowFullscreen=true;frame.replaceChildren(map);map.focus();});});

 // Industry filter for published job listings (rendered by the CMS on aac.mn).
 const jobs=[...document.querySelectorAll('.cms-job')];
 if(jobs.length>1){
  const en=document.documentElement.lang==='en';
  const industryOf=card=>{for(const row of card.querySelectorAll('dl>div')){const label=row.querySelector('dt')?.textContent.trim();if(label==='Industry'||label==='Салбар')return row.querySelector('dd')?.textContent.trim()||'';}return '';};
  const values=[...new Set(jobs.map(industryOf).filter(Boolean))];
  if(values.length>1){
   const bar=document.createElement('div');bar.className='job-filter';bar.setAttribute('role','group');bar.setAttribute('aria-label',en?'Filter by industry':'Салбараар шүүх');
   const make=(text,value)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-pressed',String(value===''));b.addEventListener('click',()=>{bar.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));jobs.forEach(card=>{card.hidden=value!==''&&industryOf(card)!==value;});});return b;};
   bar.append(make(en?'All':'Бүгд',''),...values.map(v=>make(v,v)));
   jobs[0].parentElement.before(bar);
  }
 }

 const form=document.querySelector('[data-inquiry]');if(!form)return;
 const en=form.dataset.language==='en',panel=form.closest('.form-panel'),preview=panel.querySelector('.request-preview'),text=preview.querySelector('textarea'),status=preview.querySelector('.form-status');
 const sent=panel.querySelector('.request-sent'),submit=form.querySelector('[type=submit]'),label=submit.innerHTML;
 let body='',subject='';

 // Multi-step employer and partner forms: one fieldset at a time, validated before moving on.
 const steps=[...form.querySelectorAll('.form-step')];
 const fieldsOf=step=>[...step.querySelectorAll('input,select,textarea')];
 const stepValid=step=>fieldsOf(step).every(el=>el.checkValidity()||(el.reportValidity(),false));
 let current=0,show=()=>{};
 if(steps.length>1){
  form.classList.add('js-steps');
  const consent=form.querySelector('.consent');
  const progress=document.createElement('ol');progress.className='form-progress';
  steps.forEach(step=>{const li=document.createElement('li');li.textContent=step.querySelector('legend').textContent;progress.append(li);});
  form.prepend(progress);
  const button=(html,cls)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.innerHTML=html;return b;};
  const back=button(en?'← Back':'← Буцах','button secondary step-back'),next=button((en?'Next':'Дараах')+' <span aria-hidden="true">→</span>','button step-next');
  const bar=document.createElement('div');bar.className='step-nav';submit.replaceWith(bar);bar.append(back,next,submit);
  show=(i,focus)=>{
   current=i;const last=i===steps.length-1;
   steps.forEach((step,j)=>{step.hidden=j!==i;});
   [...progress.children].forEach((li,j)=>{li.classList.toggle('done',j<i);if(j===i)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
   consent.hidden=!last;submit.hidden=!last;next.hidden=last;back.hidden=i===0;
   if(focus){fieldsOf(steps[i])[0]?.focus({preventScroll:true});progress.scrollIntoView({block:'nearest'});}
  };
  next.addEventListener('click',()=>{if(stepValid(steps[current]))show(current+1,true);});
  back.addEventListener('click',()=>show(current-1,true));
  // Browsers skip implicit submission while the send button is hidden, so Enter in a text field moves to the next step.
  form.addEventListener('keydown',e=>{if(e.key==='Enter'&&current<steps.length-1&&e.target.matches('input:not([type=checkbox])')){e.preventDefault();if(stepValid(steps[current]))show(current+1,true);}});
  show(0);
 }

 const showPreview=()=>{text.value=body;preview.querySelector('.email-action').href='mailto:'+(document.querySelector('.topbar a[href^="mailto:"]')?.textContent.trim()||'info@aac.mn')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);form.hidden=true;preview.hidden=false;status.textContent=form.dataset.failed;preview.focus({preventScroll:true});preview.scrollIntoView({block:'start',behavior:'instant'});};
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(steps.length>1){
   // Enter on an earlier step moves forward instead of sending.
   if(current<steps.length-1){if(stepValid(steps[current]))show(current+1,true);return;}
   const bad=steps.findIndex(step=>!fieldsOf(step).every(el=>el.checkValidity()));
   if(bad>-1&&bad!==current){show(bad,true);stepValid(steps[bad]);return;}
  }
  if(!form.reportValidity()||submit.disabled)return;
  const data=new FormData(form);subject='Ashid Apex — '+((en?{employers:'Workforce request',partners:'Agency partnership inquiry',contact:'General inquiry'}:{employers:'Ажилтан авах хүсэлт',partners:'Хамтран ажиллах хүсэлт',contact:'Холбоо барих хүсэлт'})[form.dataset.inquiry]);
  body=subject+'\n\n'+Array.from(data.entries()).filter(([key])=>key!=='consent'&&key!=='website').map(([key,value])=>{const el=form.elements.namedItem(key);return (el.labels?.[0]?.childNodes[0]?.textContent.trim()||key)+': '+String(value).trim();}).join('\n\n');
  data.append('kind',form.dataset.inquiry);data.append('lang',en?'en':'mn');data.append('body',body);
  submit.disabled=true;submit.textContent=submit.dataset.sending;
  let ok=false;
  try{const res=await fetch(new URL('../contact.php',location.href),{method:'POST',body:data,headers:{Accept:'application/json'}});ok=res.ok&&(await res.json()).ok===true;}catch{}
  submit.disabled=false;submit.innerHTML=label;
  if(ok){form.reset();show(0);form.hidden=true;sent.hidden=false;sent.focus({preventScroll:true});sent.scrollIntoView({block:'start',behavior:'instant'});}
  else showPreview();
 });
 sent.querySelector('.new-action').addEventListener('click',()=>{sent.hidden=true;form.hidden=false;(steps.length>1?fieldsOf(steps[current])[0]:form.querySelector('input'))?.focus();});
 preview.querySelector('.edit-action').addEventListener('click',()=>{preview.hidden=true;form.hidden=false;(steps.length>1?fieldsOf(steps[current])[0]:form.querySelector('input'))?.focus();});
 preview.querySelector('.copy-action').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(body);status.textContent=en?'Copied. Paste it into your email.':'Хүсэлтийг хууллаа. Имэйлдээ буулгаж илгээнэ үү.';}catch{status.textContent=en?'Select the request text to copy, or download it below.':'Хуулж чадсангүй. Хүсэлтийн текстийг сонгож хуулах эсвэл файл болгон татаж авна уу.';text.focus();text.select();}});
 preview.querySelector('.download-action').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob(['﻿'+body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ashid-apex-request.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
})();
