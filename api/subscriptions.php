<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;

if ($id === null && method() === 'GET') {
    $auth = requireAuth();
    if ($auth['type'] !== 'user') {
        jsonResponse(['error' => 'Only users can manage subscriptions'], 403);
        exit;
    }
    $subs = readJson(SUBSCRIPTIONS_JSON);
    $mine = array_values(array_filter($subs, fn($s) => (int) $s['userId'] === $auth['id']));
    jsonResponse($mine);
    exit;
}

if ($id === null && method() === 'POST') {
    $auth = requireAuth();
    if ($auth['type'] !== 'user') {
        jsonResponse(['error' => 'Only users can manage subscriptions'], 403);
        exit;
    }
    $input = getJsonInput();
    $filterType = $input['filterType'] ?? '';
    $value = trim($input['value'] ?? '');
    if (!in_array($filterType, ['category', 'organization', 'location'], true) || !$value) {
        jsonResponse(['error' => 'filterType and value required'], 400);
        exit;
    }
    $subs = readJson(SUBSCRIPTIONS_JSON);
    $sub = [
        'id' => nextId($subs),
        'userId' => $auth['id'],
        'filterType' => $filterType,
        'value' => $value,
        'createdAt' => date('c'),
    ];
    $subs[] = $sub;
    writeJson(SUBSCRIPTIONS_JSON, $subs);
    jsonResponse($sub, 201);
    exit;
}

if ($id !== null && method() === 'DELETE') {
    $auth = requireAuth();
    if ($auth['type'] !== 'user') {
        jsonResponse(['error' => 'Only users can manage subscriptions'], 403);
        exit;
    }
    $subs = readJson(SUBSCRIPTIONS_JSON);
    $subs = array_values(array_filter($subs, fn($s) =>
        !((int) $s['id'] === $id && (int) $s['userId'] === $auth['id'])
    ));
    writeJson(SUBSCRIPTIONS_JSON, $subs);
    jsonResponse(['ok' => true]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
