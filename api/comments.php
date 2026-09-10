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
    $authorType = $comment['authorType'] ?? 'user';
    if ($authorType === 'volunteer') {
        $authorType = 'user';
    }
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
    $comments = readJson(COMMENTS_JSON);
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
    $comments = readJson(COMMENTS_JSON);
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
    writeJson(COMMENTS_JSON, $comments);

    // Notify post owner when someone comments on a post.
    if ($targetType === 'post') {
        $post = findPostById($targetId);
        if ($post !== null) {
            $authorType = $post['authorType'] ?? 'user';
            $authorId = (int) ($post['authorId'] ?? 0);
            $commenterUserId = $auth['type'] === 'user' ? $auth['id'] : null;
            if ($authorType === 'user') {
                createNotificationForUser(
                    $authorId,
                    'post_comment',
                    $auth['type'],
                    $auth['id'],
                    'post',
                    $targetId,
                );
            } elseif ($authorType === 'organization') {
                createNotificationsForOrgAdmins(
                    $authorId,
                    'post_comment',
                    $auth['type'],
                    $auth['id'],
                    'post',
                    $targetId,
                    $commenterUserId,
                );
            }
        }
    }

    notifyTargetFollowersOnComment($targetType, $targetId, $auth['type'], $auth['id']);

    jsonResponse([
        ...$comment,
        'author' => publicCommentAuthor($comment),
    ], 201);
    exit;
}

jsonResponse(['error' => 'Method not allowed'], 405);
