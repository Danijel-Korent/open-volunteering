<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();

/**
 * Build public author summary from comment authorType and authorId.
 *
 * @param array<string, mixed> $comment
 * @return array{id: int, name: string, type: string}|null
 */
function publicCommentAuthor(array $comment): ?array {
    $authorType = $comment['authorType'] ?? 'volunteer';
    $authorId = (int) $comment['authorId'];
    $author = resolveAccount($authorType, $authorId);
    if ($author === null) {
        return null;
    }
    return [
        'id' => $authorId,
        'name' => $author['name'],
        'type' => $authorType,
    ];
}

if (method() === 'GET') {
    $targetType = $_GET['targetType'] ?? '';
    $targetId = isset($_GET['targetId']) ? (int) $_GET['targetId'] : 0;
    if (!$targetType || !$targetId) {
        jsonResponse(['error' => 'targetType and targetId required'], 400);
        exit;
    }
    $comments = readJson('comments.json');
    $filtered = array_values(array_filter($comments, fn($c) =>
        $c['targetType'] === $targetType && (int) $c['targetId'] === $targetId
    ));
    usort($filtered, fn($a, $b) => strcmp($a['createdAt'], $b['createdAt']));
    $result = [];
    foreach ($filtered as $c) {
        $result[] = [
            ...$c,
            'author' => publicCommentAuthor($c),
        ];
    }
    jsonResponse($result);
    exit;
}

if (method() === 'POST') {
    $auth = requireAuth();
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
        'authorType' => $auth['type'],
        'authorId' => $auth['id'],
        'content' => $content,
        'createdAt' => date('c'),
    ];
    $comments[] = $comment;
    writeJson('comments.json', $comments);
    jsonResponse([
        ...$comment,
        'author' => publicCommentAuthor($comment),
    ], 201);
    exit;
}

jsonResponse(['error' => 'Method not allowed'], 405);
