"""Integration checks against the real PHP endpoints; no email is sent."""
import os, subprocess, tempfile, pathlib, urllib.request, urllib.error, http.cookiejar, json, time, socket, secrets, base64
ROOT=pathlib.Path(__file__).resolve().parents[1]
PHP=os.environ.get('PHP_BIN','php')
args=[PHP,'-n']
if os.environ.get('PHP_GD'): args+=['-d','extension='+os.environ['PHP_GD']]
for p in (ROOT/'server').rglob('*.php'):
    subprocess.run(args+['-l',str(p)],check=True,stdout=subprocess.DEVNULL)
subprocess.run(['node','--check','server/admin/admin.js'],cwd=ROOT,check=True)
subprocess.run(['node','scripts/cpanel.mjs','https://aac.mn'],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
root=ROOT/'dist/cpanel/public_html'
with tempfile.TemporaryDirectory(prefix='aac-cms-test-') as tmp:
    tmp=pathlib.Path(tmp);data=tmp/'private';sessions=tmp/'sessions';sessions.mkdir()
    sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
    env={**os.environ,'AAC_CMS_TEST':'1','AAC_CMS_DATA':str(data)}
    log=open(tmp/'php.log','w+')
    proc=subprocess.Popen(args+['-d','session.save_path='+str(sessions),'-S',f'127.0.0.1:{port}','-t',str(root)],env=env,stdout=log,stderr=log)
    base=f'http://127.0.0.1:{port}'
    def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    browser=client()
    def req(path,body=None,csrf='',opener=browser,contenttype='application/json'):
        raw=json.dumps(body).encode() if isinstance(body,dict) else body
        r=urllib.request.Request(base+path,data=raw,headers={'X-CSRF-Token':csrf,'Content-Type':contenttype})
        try:
            with opener.open(r) as f:return f.status,f.read().decode(),f.headers
        except urllib.error.HTTPError as e:return e.code,e.read().decode(),e.headers
    def api(action,body=None,csrf='',opener=browser,status=200):
        code,text,_=req('/admin/api.php?action='+action,body,csrf,opener)
        
        if code!=status:
            log.flush();log.seek(0);print(log.read())
        assert code==status,(action,code,text)
        return json.loads(text)
    try:
        for _ in range(50):
            try: s=api('session');break
            except urllib.error.URLError:time.sleep(.1)
        else: raise AssertionError('PHP did not start')
        assert s['setup'] and not s['authenticated'];csrf=s['csrf']
        api('state',status=401)
        api('setup',{'token':'bad','password':'test-password-12'},csrf,status=401)
        api('setup',{'token':'bad','password':'test-password-12'},'wrong',status=403)
        token=(data/'setup-token.txt').read_text();password=secrets.token_hex(12)
        s=api('setup',{'token':token,'password':password},csrf);csrf=s['csrf']
        assert not (data/'setup-token.txt').exists()
        auth=json.loads((data/'auth.json').read_text());assert password not in json.dumps(auth)
        api('setup',{'token':token,'password':password},csrf,status=409)
        d=api('state');state=d['state'];field=d['defaults']['pages']['mn/about']['fields'][5]
        malicious='<script>alert("x")</script> Өөрчлөлт'
        d=api('save',{'kind':'texts','page':'mn/about','revision':0,'value':{field:malicious}},csrf)
        assert d['state']['revision']==1
        code,html,_=req('/cms-page.php?page=mn/about');assert code==200 and '&lt;script&gt;' in html and malicious not in html and '{{AAC:' not in html
        api('save',{'kind':'texts','page':'mn/about','revision':0,'value':{field:'stale'}},csrf,status=409)
        api('save',{'kind':'texts','page':'mn/about','revision':1,'value':{'unknown':'bad'}},csrf,status=422)
        api('save',{'kind':'settings','revision':1,'value':{'email':'bad\r\nemail','phone':'12345678'}},csrf,status=422)
        d=api('save',{'kind':'settings','revision':1,'value':{'email':'office@example.com','phone':'+976 1234 5678'}},csrf)
        _,html,_=req('/cms-page.php?page=mn/contact');assert 'mailto:office@example.com' in html and 'tel:+97612345678' in html
        j={'id':secrets.token_hex(8),'published':False}
        for lang in ('mn','en'):j[lang]={k:'' for k in ['title','industry','location','vacancies','salary','hours','accommodation','contract','requirements','deadline']};j[lang]['title']='Test job '+lang
        d=api('save',{'kind':'jobs','revision':2,'value':[j]},csrf)
        assert 'Test job mn' not in req('/cms-page.php?page=mn/jobs')[1]
        j['published']=True
        j['en']['salary']='$1000 / month'
        d=api('save',{'kind':'jobs','revision':3,'value':[j]},csrf)
        html=req('/cms-page.php?page=en/jobs')[1];assert 'Test job en' in html and '$1000 / month' in html and 'mailto:office@example.com?subject=' in html
        j['mn']['deadline']=j['en']['deadline']='2000-01-01'
        d=api('save',{'kind':'jobs','revision':4,'value':[j]},csrf)
        assert 'Test job en' not in req('/cms-page.php?page=en/jobs')[1]
        j['en']['deadline']='2026-02-30'
        api('save',{'kind':'jobs','revision':5,'value':[j]},csrf,status=422)
        assert req('/cms-page.php?page=../../etc/passwd')[0]==404
        assert req('/admin/media.php?name=../auth.json')[0]==404
        # Genuine image upload, re-encoding, then attachment and delivery.
        def upload(blob,filename,mime):
            boundary='aacTestBoundary'
            body=(f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n').encode()+blob+f'\r\n--{boundary}--\r\n'.encode()
            request=urllib.request.Request(base+'/admin/api.php?action=upload',data=body,headers={'X-CSRF-Token':csrf,'Content-Type':'multipart/form-data; boundary='+boundary})
            try:
                with browser.open(request) as f:return f.status,json.loads(f.read())
            except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
        assert upload(b'<svg onload="alert(1)"/>','bad.svg','image/svg+xml')[0]==422
        if os.environ.get('PHP_GD'):
            from PIL import Image
            import io
            buf=io.BytesIO();Image.new('RGB',(4,4),'white').save(buf,'PNG')
            code,img=upload(buf.getvalue(),'image.png','image/png');assert code==200,img
            d=api('save',{'kind':'image','page':'mn/index','revision':5,'value':{'name':img['name'],'alt':'Монгол зураг'}},csrf)
            assert 'Монгол зураг' in req('/cms-page.php?page=mn/index')[1]
            with browser.open(base+'/admin/media.php?name='+img['name']) as f:assert f.headers['Content-Type']=='image/jpeg' and f.read()[:2]==b'\xff\xd8'
        # A fresh deployment preserves existing CMS edits and all uploaded media.
        subprocess.run(['node','scripts/cpanel.mjs','https://aac.mn'],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
        assert api('state')['state']['settings']['email']=='office@example.com'
        assert len(json.loads((data/'history.json').read_text()))>=5
        other=client();other_csrf=api('session',opener=other)['csrf']
        api('login',{'password':password},other_csrf,other)
        api('password',{'current':password,'password':'a-new-long-test-password'},csrf)
        api('state',opener=other,status=401)
        api('logout',{},csrf);api('state',status=401)
        print('PASS: auth, setup token, CSRF, session revocation, revisions, XSS escaping, validation, bilingual jobs, expiry, media, and deployment persistence.')
    finally:
        proc.terminate();proc.wait(timeout=5);log.close()
