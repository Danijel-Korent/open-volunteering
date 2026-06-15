<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();

if (method() === 'GET') {
    $targetType = $_GET['targetType'] ?? '';
    $targetId = isset($_GET['targetId']) ? (int) $_GET['targetId'] : 0;
    if (!$targetType || !$targetId) {
        jsonResponse(['error' => 'targetType and targetId required'], 400);
        exit;
    }
    $comments = readJson('comments.json');
    $users = readJson('users.json');
    $filtered = array_values(array_filter($comments, fn($c) =>
        $c['targetType'] === $targetType && (int) $c['targetId'] === $targetId
    ));
    usort($filtered, fn($a, $b) => strcmp($a['createdAt'], $b['createdAt']));
    $result = [];
    foreach ($filtered as $c) {
        $author = findUser($users, (int) $c['authorId']);
        $result[] = [
            ...$c,
            'author' => $author ? ['id' => $author['id'], 'name' => $author['name'], 'type' => $author['type']] : null,
        ];
    }
    jsonResponse($result);
    exit;
}

if (method() === 'POST') {
    $userId = requireAuth();
    $input = getJsonInput();
    $targetType = $input['targetType'] ?? '';
    $targetId = (int) ($input['targetId'] ?? 0);
    $content = trim($input['content'] ?? '');
    if (!$targetType || !$targetId || !$content) {
        jsonResponse(['error' => 'targetType, targetId, and content required'], 400);
        exit;
    }
    if (!in_array($targetType, ['post', 'position', 'event'], true)) {
        jsonResponse(['error' => 'Invalid targetType'], 400);
        exit;
    }
    $comments = readJson('comments.json');
    $comment = [
        'id' => nextId($comments),
        'targetType' => $targetType,
        'targetId' => $targetId,
        'authorId' => $userId,
        'content' => $content,
        'createdAt' => date('c'),
    ];
    $comments[] = $comment;
    writeJson('comments.json', $comments);
    $users = readJson('users.json');
    $author = findUser($users, $userId);
    jsonResponse([
        ...$comment,
        'author' => $author ? ['id' => $author['id'], 'name' => $author['name'], 'type' => $author['type']] : null,
    ], 201);
    exit;
}

jsonResponse(['error' => 'Method not allowed'], 405);
