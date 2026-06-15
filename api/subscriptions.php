<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;

if ($id === null && method() === 'GET') {
    $userId = requireAuth();
    $subs = readJson('subscriptions.json');
    $mine = array_values(array_filter($subs, fn($s) => (int) $s['userId'] === $userId));
    jsonResponse($mine);
    exit;
}

if ($id === null && method() === 'POST') {
    $userId = requireAuth();
    $input = getJsonInput();
    $filterType = $input['filterType'] ?? '';
    $value = trim($input['value'] ?? '');
    if (!in_array($filterType, ['category', 'organization', 'location'], true) || !$value) {
        jsonResponse(['error' => 'filterType and value required'], 400);
        exit;
    }
    $subs = readJson('subscriptions.json');
    $sub = [
        'id' => nextId($subs),
        'userId' => $userId,
        'filterType' => $filterType,
        'value' => $value,
        'createdAt' => date('c'),
    ];
    $subs[] = $sub;
    writeJson('subscriptions.json', $subs);
    jsonResponse($sub, 201);
    exit;
}

if ($id !== null && method() === 'DELETE') {
    $userId = requireAuth();
    $subs = readJson('subscriptions.json');
    $subs = array_values(array_filter($subs, fn($s) =>
        !((int) $s['id'] === $id && (int) $s['userId'] === $userId)
    ));
    writeJson('subscriptions.json', $subs);
    jsonResponse(['ok' => true]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
