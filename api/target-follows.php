<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$sub = $segments[1] ?? '';

if ($sub === 'mine' && method() === 'GET') {
    $auth = requireAuth();
    $result = [];
    foreach (readJson(TARGET_FOLLOWS_JSON) as $f) {
        if (($f['followerType'] ?? '') === $auth['type'] && (int) ($f['followerId'] ?? 0) === $auth['id']) {
            $result[] = [
                'targetType' => $f['targetType'],
                'targetId' => (int) $f['targetId'],
            ];
        }
    }
    jsonResponse($result);
    exit;
}

if (method() === 'GET') {
    $auth = requireAuth();
    $targetType = $_GET['targetType'] ?? '';
    $targetId = isset($_GET['targetId']) ? (int) $_GET['targetId'] : 0;
    if (!$targetType || !$targetId) {
        jsonResponse(['error' => 'targetType and targetId required'], 400);
        exit;
    }
    if (!in_array($targetType, ['post', 'position', 'event'], true)) {
        jsonResponse(['error' => 'Invalid targetType'], 400);
        exit;
    }
    jsonResponse([
        'following' => isFollowingTarget($targetType, $targetId, $auth['type'], $auth['id']),
    ]);
    exit;
}

if (method() === 'POST') {
    $auth = requireAuth();
    $input = getJsonInput();
    $targetType = $input['targetType'] ?? '';
    $targetId = (int) ($input['targetId'] ?? 0);
    if (!$targetType || !$targetId) {
        jsonResponse(['error' => 'targetType and targetId required'], 400);
        exit;
    }
    if (!in_array($targetType, ['post', 'position', 'event'], true)) {
        jsonResponse(['error' => 'Invalid targetType'], 400);
        exit;
    }
    if (!targetExists($targetType, $targetId)) {
        jsonResponse(['error' => 'Target not found'], 404);
        exit;
    }
    $author = findTargetAuthor($targetType, $targetId);
    if ($author !== null
        && $author['type'] === $auth['type']
        && $author['id'] === $auth['id']) {
        jsonResponse(['error' => 'Cannot follow your own content'], 400);
        exit;
    }
    if (isFollowingTarget($targetType, $targetId, $auth['type'], $auth['id'])) {
        jsonResponse(['ok' => true, 'following' => true]);
        exit;
    }
    $actingUserId = followActingUserId();
    if ($actingUserId === null) {
        jsonResponse(['error' => 'Authentication required'], 401);
        exit;
    }
    $follows = readJson(TARGET_FOLLOWS_JSON);
    $follows[] = [
        'followerType' => $auth['type'],
        'followerId' => $auth['id'],
        'actingUserId' => $actingUserId,
        'targetType' => $targetType,
        'targetId' => $targetId,
        'createdAt' => date('c'),
    ];
    writeJson(TARGET_FOLLOWS_JSON, $follows);
    jsonResponse(['ok' => true, 'following' => true], 201);
    exit;
}

if (method() === 'DELETE') {
    $auth = requireAuth();
    $input = getJsonInput();
    $targetType = $input['targetType'] ?? '';
    $targetId = (int) ($input['targetId'] ?? 0);
    if (!$targetType || !$targetId) {
        jsonResponse(['error' => 'targetType and targetId required'], 400);
        exit;
    }
    if (!in_array($targetType, ['post', 'position', 'event'], true)) {
        jsonResponse(['error' => 'Invalid targetType'], 400);
        exit;
    }
    $follows = readJson(TARGET_FOLLOWS_JSON);
    $follows = array_values(array_filter($follows, fn($f) =>
        !(($f['targetType'] ?? '') === $targetType
            && (int) ($f['targetId'] ?? 0) === $targetId
            && ($f['followerType'] ?? '') === $auth['type']
            && (int) ($f['followerId'] ?? 0) === $auth['id'])
    ));
    writeJson(TARGET_FOLLOWS_JSON, $follows);
    jsonResponse(['ok' => true, 'following' => false]);
    exit;
}

jsonResponse(['error' => 'Method not allowed'], 405);
