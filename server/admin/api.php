<?php
declare(strict_types=1);
require __DIR__.'/core.php';
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('X-Frame-Options: DENY');
try {
 aac_session();$action=$_GET['action']??'state';
 if($action==='session'){
  if(!aac_read('auth'))aac_token();
  aac_json(['authenticated'=>aac_admin(),'setup'=>!aac_read('auth'),'csrf'=>$_SESSION['csrf']]);
 }
 if($_SERVER['REQUEST_METHOD']==='POST')aac_csrf();
 elseif($action!=='state')aac_json(['error'=>'Method not allowed'],405);
 $input=[];if($_SERVER['REQUEST_METHOD']==='POST'&&str_starts_with($_SERVER['CONTENT_TYPE']??'','application/json')){
  if((int)($_SERVER['CONTENT_LENGTH']??0)>2000000)aac_json(['error'=>'Request too large'],413);
  $input=json_decode(file_get_contents('php://input'),true,128,JSON_THROW_ON_ERROR);
  if(!is_array($input))aac_json(['error'=>'Invalid input'],422);
 }
 if($action==='login'||$action==='setup'){
  aac_limit();$password=(string)($input['password']??'');
  aac_lock(function() use($action,$input,$password){
   $auth=aac_read('auth');
   if($action==='setup'){
    if($auth)aac_json(['error'=>'Админ бүртгэл үүссэн байна.'],409);
    $token=is_file(aac_dir().'/setup-token.txt')?trim(file_get_contents(aac_dir().'/setup-token.txt')):'';
    if(!$token||!hash_equals($token,(string)($input['token']??'')))aac_json(['error'=>'Баталгаажуулах код буруу байна.'],401);
    aac_validate_password($password);$auth=['hash'=>password_hash($password,PASSWORD_DEFAULT),'version'=>bin2hex(random_bytes(20))];aac_write('auth',$auth);unlink(aac_dir().'/setup-token.txt');
   }elseif(!$auth||!password_verify($password,$auth['hash']))aac_json(['error'=>'Нууц үг буруу байна.'],401);
   session_regenerate_id(true);$_SESSION['auth']=$auth['version'];$_SESSION['csrf']=bin2hex(random_bytes(32));
  });aac_json(['ok'=>true,'csrf'=>$_SESSION['csrf']]);
 }
 if(!aac_admin())aac_json(['error'=>'Нэвтэрнэ үү.'],401);
 if($action==='state'){aac_json(['state'=>aac_state(),'defaults'=>aac_defaults()]);}
 if($action==='logout'){$_SESSION=[];session_destroy();aac_json(['ok'=>true]);}
 if($action==='password'){
  aac_validate_password((string)($input['password']??''));
  aac_lock(function()use($input){$auth=aac_read('auth');if(!password_verify((string)($input['current']??''),$auth['hash']))aac_json(['error'=>'Одоогийн нууц үг буруу.'],422);$auth=['hash'=>password_hash($input['password'],PASSWORD_DEFAULT),'version'=>bin2hex(random_bytes(20))];aac_write('auth',$auth);$_SESSION['auth']=$auth['version'];session_regenerate_id(true);});aac_json(['ok'=>true]);
 }
 if($action==='upload'){
  $f=$_FILES['image']??null;if(!$f||$f['error']!==UPLOAD_ERR_OK||$f['size']>5*1024*1024)aac_json(['error'=>'5 MB хүртэлх JPG, PNG эсвэл WebP зураг сонгоно уу.'],422);
  $info=@getimagesize($f['tmp_name']);if(!$info||!in_array($info['mime'],['image/jpeg','image/png','image/webp'],true)||$info[0]*$info[1]>16000000)aac_json(['error'=>'Зураг буруу эсвэл хэт том (дээд тал нь 16 MP).'],422);
  if(!extension_loaded('gd'))aac_json(['error'=>'Хостинг дээр PHP GD өргөтгөлийг идэвхжүүлнэ үү.'],503);
  $image=@imagecreatefromstring(file_get_contents($f['tmp_name']));if(!$image)aac_json(['error'=>'Зургийг уншиж чадсангүй.'],422);
  $name=bin2hex(random_bytes(16)).'.jpg';$media=aac_dir().'/media';if(!is_dir($media))mkdir($media,0700);
  // Re-encode to discard executable payloads and metadata, flatten alpha onto white.
  $w=imagesx($image);$h=imagesy($image);$scale=min(1,2400/max($w,$h));$out=imagecreatetruecolor((int)($w*$scale),(int)($h*$scale));imagefill($out,0,0,imagecolorallocate($out,255,255,255));imagecopyresampled($out,$image,0,0,0,0,imagesx($out),imagesy($out),$w,$h);
  if(!imagejpeg($out,$media.'/'.$name,88))throw new RuntimeException('Image save failed.');chmod($media.'/'.$name,0600);imagedestroy($out);imagedestroy($image);aac_json(['ok'=>true,'name'=>$name]);
 }
 if($action==='save'){
  $result=aac_lock(function()use($input){
   $state=aac_state();if(($input['revision']??-1)!==$state['revision'])aac_json(['error'=>'Өөр цонхноос засвар орсон байна. Хуудсаа шинэчлээд дахин оролдоно уу.'],409);
   $defaults=aac_defaults();$kind=$input['kind']??'';$value=$input['value']??[];if(!is_array($value))aac_json(['error'=>'Invalid input'],422);
   if($kind==='texts'){
    $page=$input['page']??'';if(!isset($defaults['pages'][$page]))aac_json(['error'=>'Invalid page'],422);
    foreach($value as $key=>$text){if(!in_array($key,$defaults['pages'][$page]['fields'],true)||!is_string($text)||strlen($text)>20000)aac_json(['error'=>'Текстийн талбар буруу.'],422);$state['texts'][$key]=$text;}
   }elseif($kind==='settings'){
    $email=trim((string)($value['email']??''));$phone=trim((string)($value['phone']??''));
    if(!filter_var($email,FILTER_VALIDATE_EMAIL)||!preg_match('/^\+?[0-9 ()-]{6,30}$/',$phone))aac_json(['error'=>'Имэйл эсвэл утасны дугаар буруу.'],422);
    $state['settings']=['email'=>$email,'phone'=>$phone];
   }elseif($kind==='image'){
    $page=$input['page']??'';$name=$value['name']??'';$alt=$value['alt']??'';
    if(!isset($defaults['pages'][$page])||!is_string($alt)||strlen($alt)>500||($name!==''&&(!preg_match('/^[a-f0-9]{32}\.jpg$/',$name)||!is_file(aac_dir().'/media/'.$name))))aac_json(['error'=>'Зургийн мэдээлэл буруу.'],422);
    $state['images'][$page]=['name'=>$name,'alt'=>$alt];
   }elseif($kind==='jobs'){
    if(count($value)>100)aac_json(['error'=>'100 хүртэл ажлын зар хадгална.'],422);
    $jobs=[];
    foreach($value as $job){
     if(!is_array($job))aac_json(['error'=>'Invalid job'],422);
     $j=['id'=>(string)($job['id']??bin2hex(random_bytes(8))),'published'=>($job['published']??false)===true];
     if(!preg_match('/^[a-f0-9]{16,32}$/',$j['id']))aac_json(['error'=>'Invalid job ID'],422);
     foreach(['mn','en'] as $lang){$j[$lang]=[];foreach(['title','industry','location','vacancies','salary','hours','accommodation','contract','requirements','deadline'] as $key){$v=$job[$lang][$key]??'';if(!is_string($v)||strlen($v)>10000)aac_json(['error'=>'Ажлын зарын талбар буруу.'],422);$j[$lang][$key]=$v;}if($j['published']&&trim($j[$lang]['title'])==='')aac_json(['error'=>'Нийтлэхийн өмнө хоёр хэл дээр гарчиг оруулна уу.'],422);$d=$j[$lang]['deadline'];if($d!==''&&(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$d)||!checkdate((int)substr($d,5,2),(int)substr($d,8,2),(int)substr($d,0,4))))aac_json(['error'=>'Огноо буруу байна.'],422);}
     $jobs[]=$j;
    }$state['jobs']=$jobs;
   }else aac_json(['error'=>'Invalid action'],422);
   // Retain the last 20 revisions outside the public web root.
   $history=aac_read('history');$history[]=['at'=>gmdate('c'),'state'=>aac_state()];aac_write('history',array_slice($history,-20));
   $state['revision']++;$state['updated']=gmdate('c');aac_write('content',$state);return $state;
  });aac_json(['ok'=>true,'state'=>$result]);
 }
 aac_json(['error'=>'Unknown action'],404);
}catch(Throwable $e){error_log('AAC CMS: '.$e->getMessage());aac_json(['error'=>'Үйлдэл амжилтгүй. Хостингийн тохиргоог шалгана уу.'],500);}
