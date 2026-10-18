<?php
// Deployment readiness check. No configuration values or account details are exposed.
header('Content-Type: application/json');header('Cache-Control: no-store');
if (PHP_VERSION_ID < 80100 || !extension_loaded('gd') || !extension_loaded('session')) {
    http_response_code(503);echo '{"ok":false}';exit;
}
try {
    require __DIR__.'/core.php';
    $dir=aac_dir();$f=tempnam($dir,'.health-');
    if (!$f) throw new RuntimeException('Storage not writable');
    unlink($f);
    aac_defaults();
    echo '{"ok":true}';
} catch (Throwable $e) {http_response_code(503);echo '{"ok":false}';}
