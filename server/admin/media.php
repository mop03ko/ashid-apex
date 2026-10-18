<?php
declare(strict_types=1);
require __DIR__.'/core.php';
$name=$_GET['name']??'';
if(!preg_match('/^[a-f0-9]{32}\.jpg$/D',$name)){http_response_code(404);exit;}
try{$file=aac_dir().'/media/'.$name;if(!is_file($file)){http_response_code(404);exit;}header('Content-Type: image/jpeg');header('X-Content-Type-Options: nosniff');header('Cache-Control: public, max-age=31536000, immutable');header('Content-Length: '.filesize($file));readfile($file);}catch(Throwable $e){http_response_code(503);}
