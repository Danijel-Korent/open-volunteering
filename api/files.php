<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

if ($id === null && method() === 'POST') {
    $userId = requireAuth();
    if (!isset($_FILES['file'])) {
        jsonResponse(['error' => 'File is required'], 400);
        exit;
    }

    $validated = validateImageUpload($_FILES['file']);
    if ($validated === null) {
        jsonResponse(['error' => 'Invalid image file'], 400);
        exit;
    }

    ensureUploadsDir();
    $files = readJson(FILES_JSON);
    $fileId = nextId($files);
    $storedName = $fileId . '.' . $validated['ext'];
    $dest = UPLOADS_DIR . $storedName;

    if (!move_uploaded_file($validated['tmpPath'], $dest)) {
        jsonResponse(['error' => 'Failed to store file'], 500);
        exit;
    }

    $record = [
        'id' => $fileId,
        'ownerId' => $userId,
        'originalName' => basename($_FILES['file']['name'] ?? 'upload'),
        'storedName' => $storedName,
        'mimeType' => $validated['mimeType'],
        'byteSize' => $validated['byteSize'],
        'width' => $validated['width'],
        'height' => $validated['height'],
        'createdAt' => date('c'),
    ];
    $files[] = $record;
    writeJson(FILES_JSON, $files);
    jsonResponse(publicFile($record), 201);
    exit;
}

if ($id !== null && $sub === 'content' && method() === 'GET') {
    $files = readJson(FILES_JSON);
    $found = findFileRecord($files, $id);
    if ($found === null) {
        jsonResponse(['error' => 'File not found'], 404);
        exit;
    }
    $path = fileBlobPath($found['record']);
    if (!is_file($path)) {
        jsonResponse(['error' => 'File not found'], 404);
        exit;
    }
    header('Content-Type: ' . $found['record']['mimeType']);
    header('Access-Control-Allow-Origin: *');
    header('Cache-Control: public, max-age=86400');
    readfile($path);
    exit;
}

if ($id !== null && $sub === '' && method() === 'GET') {
    $files = readJson(FILES_JSON);
    $found = findFileRecord($files, $id);
    if ($found === null) {
        jsonResponse(['error' => 'File not found'], 404);
        exit;
    }
    jsonResponse(publicFile($found['record']));
    exit;
}

if ($id !== null && $sub === '' && method() === 'DELETE') {
    $userId = requireAuth();
    $files = readJson(FILES_JSON);
    $found = findFileRecord($files, $id);
    if ($found === null) {
        jsonResponse(['error' => 'File not found'], 404);
        exit;
    }
    if ((int) $found['record']['ownerId'] !== $userId) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
    deleteStoredFile($id);
    jsonResponse(['ok' => true]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
