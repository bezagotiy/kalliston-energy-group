<?php
/**
 * Kalliston Energy Group — form handler.
 * Receives both website forms (seafarer application, crew request) and emails
 * them to the crewing inbox. No third-party service involved.
 */

declare(strict_types=1);

const RECIPIENT   = 'crew@kalliston.energy';
const SENDER      = 'no-reply@kalliston.energy';
const SENDER_NAME = 'Kalliston Website';
const MAX_BYTES   = 5 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

header('Content-Type: application/json; charset=utf-8');

function fail(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

function clean(string $value): string {
    return trim(str_replace(["\r", "\n", "\0"], ' ', $value));
}

function field(string $name): string {
    return isset($_POST[$name]) ? trim((string) $_POST[$name]) : '';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Method not allowed.', 405);
}

// Honeypot — bots fill hidden fields, humans do not.
if (field('botcheck') !== '') {
    echo json_encode(['success' => true]);
    exit;
}

$type = field('form_type') === 'crew_request' ? 'crew_request' : 'seafarer';

if ($type === 'crew_request') {
    $subject = 'New crew request — kalliston.energy';
    $labels = [
        'vessel_type'            => 'Vessel type',
        'rank_required'          => 'Rank required',
        'joining_port'           => 'Joining port',
        'joining_date'           => 'Joining date',
        'nationality_preference' => 'Nationality preference',
        'company'                => 'Company',
        'contact_person'         => 'Contact person',
        'email'                  => 'Email',
        'phone'                  => 'Phone / WhatsApp',
        'message'                => 'Additional details',
    ];
    $required = ['vessel_type', 'rank_required', 'joining_port', 'joining_date', 'company', 'contact_person', 'email', 'phone'];
} else {
    $subject = 'New crew application — kalliston.energy';
    $labels = [
        'full_name'   => 'Full name',
        'position'    => 'Position applied for',
        'email'       => 'Email',
        'phone'       => 'Phone / WhatsApp',
        'nationality' => 'Nationality',
        'experience'  => 'Years of sea experience',
        'message'     => 'Message',
    ];
    $required = ['full_name', 'position', 'email', 'phone'];
}

foreach ($required as $name) {
    if (field($name) === '') {
        fail('Please fill in all required fields.');
    }
}

$replyTo = filter_var(field('email'), FILTER_VALIDATE_EMAIL);
if ($replyTo === false) {
    fail('Please enter a valid email address.');
}

// ---- Body -------------------------------------------------------------------
$lines = [];
foreach ($labels as $name => $label) {
    $value = field($name);
    if ($value !== '') {
        $lines[] = $label . ': ' . $value;
    }
}
$lines[] = '';
$lines[] = 'Sent from kalliston.energy on ' . gmdate('d M Y H:i') . ' UTC';
$lines[] = 'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$body = implode("\r\n", $lines);

// ---- Attachment (seafarer form only) ----------------------------------------
$attachment = null;
if ($type === 'seafarer') {
    if (!isset($_FILES['attachment']) || $_FILES['attachment']['error'] !== UPLOAD_ERR_OK) {
        fail('Please attach your CV or application form.');
    }
    $file = $_FILES['attachment'];
    if ($file['size'] > MAX_BYTES) {
        fail('File is too large. Maximum size is 5 MB.');
    }
    $ext = strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXT, true)) {
        fail('Unsupported file type. Please upload PDF, DOC, DOCX, JPG or PNG.');
    }
    if (!is_uploaded_file($file['tmp_name'])) {
        fail('Upload failed. Please try again.');
    }
    $attachment = [
        'name' => preg_replace('/[^A-Za-z0-9._-]/', '_', (string) $file['name']),
        'data' => (string) file_get_contents($file['tmp_name']),
    ];
}

// ---- Compose ----------------------------------------------------------------
$boundary = 'kal-' . bin2hex(random_bytes(12));
$headers = [
    'From: ' . SENDER_NAME . ' <' . SENDER . '>',
    'Reply-To: ' . clean($replyTo),
    'MIME-Version: 1.0',
];

if ($attachment === null) {
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $message = $body;
} else {
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';
    $message = "--{$boundary}\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n\r\n"
        . $body . "\r\n\r\n"
        . "--{$boundary}\r\n"
        . "Content-Type: application/octet-stream; name=\"{$attachment['name']}\"\r\n"
        . "Content-Transfer-Encoding: base64\r\n"
        . "Content-Disposition: attachment; filename=\"{$attachment['name']}\"\r\n\r\n"
        . chunk_split(base64_encode($attachment['data'])) . "\r\n"
        . "--{$boundary}--";
}

$sent = mail(
    RECIPIENT,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $message,
    implode("\r\n", $headers),
    '-f' . SENDER
);

if (!$sent) {
    fail('The message could not be sent. Please email crew@kalliston.energy directly.', 500);
}

echo json_encode(['success' => true]);
