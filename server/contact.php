<?php
// Receives website inquiry forms and emails them to the company inbox.
// Deployed to the cPanel Document Root by scripts/cpanel.mjs; not used on GitHub Pages.
declare(strict_types=1);

const RECIPIENT = 'info@aac.mn';
const ALLOWED_HOSTS = ['aac.mn', 'www.aac.mn'];
const SUBJECTS = [
  'employers' => 'Workforce request / Ажилтан авах хүсэлт',
  'partners' => 'Agency partnership inquiry / Хамтран ажиллах хүсэлт',
  'contact' => 'General inquiry / Холбоо барих хүсэлт',
];
const RATE_LIMIT = 5;       // requests
const RATE_WINDOW = 600;    // seconds

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $code, array $data): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function clean(string $value, int $max): string {
  $value = str_replace(["\r\n", "\r"], "\n", trim($value));
  $value = preg_replace('/[^\P{C}\n\t]/u', '', $value) ?? '';
  return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Allow: POST');
  reply(405, ['ok' => false, 'error' => 'method']);
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$ownHost = strtolower((string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
$originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
if ($origin !== '' && $originHost !== $ownHost && !in_array($originHost, ALLOWED_HOSTS, true)) {
  reply(403, ['ok' => false, 'error' => 'origin']);
}

// Bots fill the hidden field; pretend success so they do not retry.
if (trim((string) ($_POST['website'] ?? '')) !== '') {
  reply(200, ['ok' => true]);
}

$kind = (string) ($_POST['kind'] ?? '');
$name = clean((string) ($_POST['name'] ?? ''), 200);
$email = clean((string) ($_POST['email'] ?? ''), 254);
$body = clean((string) ($_POST['body'] ?? ''), 40000);
$lang = ($_POST['lang'] ?? '') === 'en' ? 'en' : 'mn';

if (!isset(SUBJECTS[$kind]) || $name === '' || $body === '' || ($_POST['consent'] ?? '') !== 'on'
    || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) {
  reply(422, ['ok' => false, 'error' => 'invalid']);
}

// Simple per-IP rate limit. Only a hash of the IP is kept, for RATE_WINDOW seconds.
$ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __FILE__);
$store = sys_get_temp_dir() . '/ashid-apex-contact-' . substr($ipHash, 0, 32);
$now = time();
$hits = array_filter(
  array_map('intval', is_file($store) ? (array) json_decode((string) file_get_contents($store), true) : []),
  fn(int $t) => $t > $now - RATE_WINDOW
);
if (count($hits) >= RATE_LIMIT) {
  reply(429, ['ok' => false, 'error' => 'rate']);
}
$hits[] = $now;
@file_put_contents($store, json_encode(array_values($hits)), LOCK_EX);

$subject = 'Ashid Apex website: ' . SUBJECTS[$kind];
$message = $body . "\n\n---\nSent from the aac.mn " . ($lang === 'en' ? 'English' : 'Mongolian')
  . ' inquiry form on ' . gmdate('Y-m-d H:i') . " UTC.\nReply to this email to answer " . $name . '.';
$fromName = '=?UTF-8?B?' . base64_encode('Ashid Apex website') . '?=';
$headers = implode("\r\n", [
  'From: ' . $fromName . ' <' . RECIPIENT . '>',
  'Reply-To: ' . '=?UTF-8?B?' . base64_encode($name) . '?= <' . $email . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  'X-Mailer: ashid-apex-contact',
]);

$sent = mail(
  RECIPIENT,
  '=?UTF-8?B?' . base64_encode($subject) . '?=',
  chunk_split(base64_encode($message)),
  $headers,
  '-f' . RECIPIENT
);

reply($sent ? 200 : 502, ['ok' => $sent]);
