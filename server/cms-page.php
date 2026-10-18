<?php
declare(strict_types=1);
require __DIR__.'/admin/core.php';
$page=$_GET['page']??'';
if(!preg_match('~^(mn|en)/(index|about|services|industries|employers|partners|process|faq|jobs|contact|privacy|terms)$~D',$page)){http_response_code(404);exit;}
header('Content-Type: text/html; charset=utf-8');header('Cache-Control: no-cache');
try {
 $state=aac_state();$defaults=aac_defaults();$html=file_get_contents(__DIR__.'/admin/templates/'.str_replace('/','-',$page).'.html');
 $tokens=[];foreach($defaults['pages'][$page]['fields'] as $id)$tokens['{{AAC:'.$id.'}}']=array_key_exists($id,$state['texts'])?aac_h($state['texts'][$id]):$defaults['fields'][$id];
 $html=strtr($html,$tokens);$email=$state['settings']['email']??'info@aac.mn';$phone=$state['settings']['phone']??'+97677777777';
 // Contact settings apply consistently to visible details and mailto/tel links.
 $html=strtr($html,['info@aac.mn'=>aac_h($email),'+97677777777'=>aac_h(preg_replace('/[^+0-9]/','',$phone)),'77777777'=>aac_h($phone)]);
 $image=$state['images'][$page]??[];
 if(!empty($image['name']))$html=str_replace('<main id="main" tabindex="-1">','<main id="main" tabindex="-1"><figure class="wrap cms-banner"><img src="/admin/media.php?name='.rawurlencode($image['name']).'" alt="'.aac_h($image['alt']).'" width="1440" height="640"></figure>',$html);
 if(str_ends_with($page,'/jobs')){
  $lang=substr($page,0,2);$en=$lang==='en';$cards='';$today=(new DateTimeImmutable('now',new DateTimeZone('Asia/Ulaanbaatar')))->format('Y-m-d');
  $labels=$en?['industry'=>'Industry','location'=>'Location','vacancies'=>'Vacancies','salary'=>'Salary / benefits','hours'=>'Working hours','accommodation'=>'Accommodation','contract'=>'Contract','requirements'=>'Requirements','deadline'=>'Apply by']:['industry'=>'Салбар','location'=>'Байршил','vacancies'=>'Орон тоо','salary'=>'Цалин / хангамж','hours'=>'Ажлын цаг','accommodation'=>'Байр','contract'=>'Гэрээний хугацаа','requirements'=>'Шаардлага','deadline'=>'Анкет авах хугацаа'];
  foreach($state['jobs'] as $job){$j=$job[$lang];if(!$job['published']||($j['deadline']!==''&&$j['deadline']<$today))continue;
   $cards.='<article class="cms-job"><p class="eyebrow">'.($en?'OPEN POSITION':'НЭЭЛТТЭЙ АЖЛЫН БАЙР').'</p><h2>'.aac_h($j['title']).'</h2><dl>';
   foreach($labels as $k=>$label)if($j[$k]!=='')$cards.='<div><dt>'.$label.'</dt><dd>'.nl2br(aac_h($j[$k])).'</dd></div>';
   $cards.='</dl><a class="button" href="mailto:'.aac_h($email).'?subject='.rawurlencode(($en?'Job application: ':'Ажлын байрны хүсэлт: ').$j['title']).'">'.($en?'Apply by email ↗':'Имэйлээр хүсэлт илгээх ↗').'</a></article>';
  }
  if($cards!=='')$html=preg_replace('~<div class="empty-state">.*?</div>~s','<div class="cms-jobs">'.$cards.'</div>',$html,1);
 }
 $html=str_replace('</head>','<link rel="stylesheet" href="/admin/public.css?v=1"></head>',$html);
 echo $html;
}catch(Throwable $e){error_log('AAC CMS render: '.$e->getMessage());http_response_code(503);header('Retry-After: 60');echo 'Сайтыг түр шинэчилж байна. Please try again shortly.';}
