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
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$fromName = '=?UTF-8?B?' . base64_encode('Ashid Apex website') . '?=';
$headers = [
  'From: ' . $fromName . ' <' . RECIPIENT . '>',
  'Reply-To: ' . '=?UTF-8?B?' . base64_encode($name) . '?= <' . $email . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  'X-Mailer: ashid-apex-contact',
];
$encodedBody = chunk_split(base64_encode($message));

// SMTP settings live outside the Document Root (written by scripts/deploy-uapi.mjs).
$configFile = dirname(__DIR__) . '/.ashid-apex-smtp.php';
$smtp = is_file($configFile) ? (array) include $configFile : [];

if (!empty($smtp['host']) && !empty($smtp['user']) && !empty($smtp['pass'])) {
  $error = smtp_send($smtp, RECIPIENT, $encodedSubject, $headers, $encodedBody);
  if ($error !== null) {
    error_log('contact.php SMTP: ' . $error);
  }
  reply($error === null ? 200 : 502, ['ok' => $error === null]);
}

$sent = mail(RECIPIENT, $encodedSubject, $encodedBody, implode("\r\n", $headers), '-f' . RECIPIENT);
reply($sent ? 200 : 502, ['ok' => $sent]);

// Minimal authenticated SMTP client (implicit TLS on 465, STARTTLS otherwise).
// Returns null on success or a short error without credentials.
function smtp_send(array $cfg, string $to, string $subject, array $headers, string $body): ?string {
  $host = (string) $cfg['host'];
  $port = (int) ($cfg['port'] ?? 465);
  $implicit = ($cfg['secure'] ?? ($port === 465 ? 'ssl' : 'tls')) === 'ssl';
  $ctx = stream_context_create(['ssl' => ['peer_name' => $host, 'verify_peer' => true, 'verify_peer_name' => true]]);
  $fp = @stream_socket_client(($implicit ? 'ssl://' : 'tcp://') . $host . ':' . $port, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
  if (!$fp) {
    return "connect $host:$port failed: $errstr ($errno)";
  }
  stream_set_timeout($fp, 15);
  $read = function () use ($fp): string {
    $data = '';
    while (($line = fgets($fp, 1024)) !== false) {
      $data .= $line;
      if (strlen($line) < 4 || $line[3] === ' ') {
        break;
      }
    }
    return $data;
  };
  $cmd = function (?string $line, int $expect) use ($fp, $read): ?string {
    if ($line !== null) {
      fwrite($fp, $line . "\r\n");
    }
    $res = $read();
    return ((int) substr($res, 0, 3)) === $expect ? null : (trim(substr($res, 0, 200)) ?: 'no response');
  };
  $user = (string) $cfg['user'];
  $steps = [[null, 220, 'greeting'], ['EHLO aac.mn', 250, 'EHLO']];
  foreach ($steps as [$line, $code, $label]) {
    if (($e = $cmd($line, $code)) !== null) { fclose($fp); return "$label: $e"; }
  }
  if (!$implicit) {
    if (($e = $cmd('STARTTLS', 220)) !== null) { fclose($fp); return "STARTTLS: $e"; }
    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) { fclose($fp); return 'TLS negotiation failed'; }
    if (($e = $cmd('EHLO aac.mn', 250)) !== null) { fclose($fp); return "EHLO after TLS: $e"; }
  }
  $date = 'Date: ' . date(DATE_RFC2822);
  $id = 'Message-ID: <' . bin2hex(random_bytes(12)) . '@aac.mn>';
  $data = implode("\r\n", array_merge([$date, $id, 'To: <' . $to . '>', 'Subject: ' . $subject], $headers))
    . "\r\n\r\n" . preg_replace('/^\./m', '..', $body);
  $steps = [
    ['AUTH LOGIN', 334, 'AUTH'],
    [base64_encode($user), 334, 'AUTH user'],
    [base64_encode((string) $cfg['pass']), 235, 'AUTH password'],
    ['MAIL FROM:<' . $user . '>', 250, 'MAIL FROM'],
    ['RCPT TO:<' . $to . '>', 250, 'RCPT TO'],
    ['DATA', 354, 'DATA'],
    [$data . "\r\n.", 250, 'message'],
  ];
  foreach ($steps as [$line, $code, $label]) {
    if (($e = $cmd($line, $code)) !== null) { fclose($fp); return "$label: $e"; }
  }
  $cmd('QUIT', 221);
  fclose($fp);
  return null;
}
