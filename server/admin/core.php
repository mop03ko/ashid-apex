<?php
// PHP 8.1+. Persistent data is deliberately outside public_html and the deployment package.
declare(strict_types=1);
function aac_dir(): string {
    $root = realpath(dirname(__DIR__));
    $dir = getenv('AAC_CMS_DATA') ?: dirname($root) . '/.aac-cms';
    if (!is_dir($dir) && !mkdir($dir,0700,true)) throw new RuntimeException('Cannot create private CMS storage.');
    $real=realpath($dir);
    if (!$real || $real === $root || str_starts_with($real,$root.'/')) throw new RuntimeException('CMS storage must be outside the public document root.');
    return $real;
}
function aac_read(string $name, array $fallback=[]): array {
    $p=aac_dir().'/'.$name.'.json';if(!is_file($p))return $fallback;
    $v=json_decode((string)file_get_contents($p),true,512,JSON_THROW_ON_ERROR);return is_array($v)?$v:$fallback;
}
function aac_write(string $name,array $value): void {
    $dir=aac_dir();$tmp=tempnam($dir,'.write-');chmod($tmp,0600);
    try {if(file_put_contents($tmp,json_encode($value,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),LOCK_EX)===false||!rename($tmp,$dir.'/'.$name.'.json'))throw new RuntimeException('Save failed.');}
    finally {if(is_file($tmp))unlink($tmp);}
}
function aac_lock(callable $fn) {
    $f=fopen(aac_dir().'/.lock','c');if(!$f||!flock($f,LOCK_EX))throw new RuntimeException('Storage lock failed.');
    try{return $fn();}finally{flock($f,LOCK_UN);fclose($f);}
}
function aac_defaults(): array {return json_decode((string)file_get_contents(__DIR__.'/defaults.json'),true,512,JSON_THROW_ON_ERROR);}
function aac_state(): array {return aac_read('content',['revision'=>0,'texts'=>[],'settings'=>[],'images'=>[],'jobs'=>[]]);}
function aac_h(string $s): string {return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function aac_session(): void {
    ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
    session_name('aac_admin');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/admin/','secure'=>getenv('AAC_CMS_TEST')!=='1','httponly'=>true,'samesite'=>'Strict']);
    session_start();
    if(isset($_SESSION['last'])&&time()-$_SESSION['last']>1800)$_SESSION=[];
    $_SESSION['last']=time();$_SESSION['csrf']??=bin2hex(random_bytes(32));
}
function aac_admin(): bool {
    $auth=aac_read('auth');return isset($_SESSION['auth'],$auth['version'])&&hash_equals($auth['version'],$_SESSION['auth']);
}
function aac_json(array $data,int $status=200): never {http_response_code($status);header('Content-Type: application/json; charset=utf-8');echo json_encode($data,JSON_UNESCAPED_UNICODE);exit;}
function aac_csrf(): void {if(!hash_equals($_SESSION['csrf']??'',$_SERVER['HTTP_X_CSRF_TOKEN']??''))aac_json(['error'=>'Сесс дууссан. Хуудсаа шинэчилнэ үү.'],403);}
function aac_limit(): void {
    aac_lock(function(){
        $r=aac_read('attempts');$now=time();$r=array_filter($r,fn($v)=>$v['until']>$now);
        $key=hash('sha256',$_SERVER['REMOTE_ADDR']??'unknown');$v=$r[$key]??['count'=>0,'until'=>$now+900];
        if($v['count']>=10){header('Retry-After: 900');aac_json(['error'=>'Олон удаа оролдлоо. 15 минутын дараа дахин оролдоно уу.'],429);}
        $v['count']++;$r[$key]=$v;aac_write('attempts',$r);
    });
}
function aac_token(): void {
    aac_lock(function(){if(!aac_read('auth')&&!is_file(aac_dir().'/setup-token.txt')){file_put_contents(aac_dir().'/setup-token.txt',bin2hex(random_bytes(32)),LOCK_EX);chmod(aac_dir().'/setup-token.txt',0600);}});
}
function aac_validate_password(string $p): void {if(strlen($p)<12||strlen($p)>128)aac_json(['error'=>'Нууц үг 12–128 тэмдэгттэй байна.'],422);}
