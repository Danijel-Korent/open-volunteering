<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

if ($id === null && method() === 'GET') {
    jsonResponse(readJson('posts.json'));
    exit;
}

if ($id === null && method() === 'POST') {
    $auth = requireAuth();
    if ($auth['type'] === 'organization') {
        requireOrgAdminSession($auth['id']);
    }
    $account = getActiveAccount();
    if ($account === null) {
        jsonResponse(['error' => 'Authentication required'], 401);
        exit;
    }
    $input = getJsonInput();
    $content = trim($input['content'] ?? '');
    if (!$content) {
        jsonResponse(['error' => 'Content is required'], 400);
        exit;
    }
    $postType = $auth['type'] === 'organization' ? 'org_post' : 'user_post';
    $posts = readJson('posts.json');
    $imageFileId = isset($input['imageFileId']) ? (int) $input['imageFileId'] : null;
    if ($imageFileId) {
        requireAttachableFile($imageFileId, $auth['type'], $auth['id']);
    }
    $post = [
        'id' => nextId($posts),
        'authorType' => $auth['type'],
        'authorId' => $auth['id'],
        'postType' => $postType,
        'content' => $content,
        'likeCount' => 0,
        'shareCount' => 0,
        'createdAt' => date('c'),
    ];
    if ($imageFileId) {
        $post['imageFileId'] = $imageFileId;
    }
    $posts[] = $post;
    writeJson('posts.json', $posts);
    if ($imageFileId) {
        attachFileTo($imageFileId, 'post', (int) $post['id']);
    }
    jsonResponse($post, 201);
    exit;
}

if ($id !== null && $sub === 'like' && method() === 'POST') {
    requireAuth();
    $posts = readJson('posts.json');
    $idx = null;
    foreach ($posts as $i => $p) {
        if ((int) $p['id'] === $id) {
            $idx = $i;
            break;
        }
    }
    if ($idx === null) {
        jsonResponse(['error' => 'Post not found'], 404);
        exit;
    }
    $posts[$idx]['likeCount'] = ($posts[$idx]['likeCount'] ?? 0) + 1;
    writeJson('posts.json', $posts);
    jsonResponse($posts[$idx]);
    exit;
}

if ($id !== null && $sub === 'share' && method() === 'POST') {
    requireAuth();
    $posts = readJson('posts.json');
    $idx = null;
    foreach ($posts as $i => $p) {
        if ((int) $p['id'] === $id) {
            $idx = $i;
            break;
        }
    }
    if ($idx === null) {
        jsonResponse(['error' => 'Post not found'], 404);
        exit;
    }
    $posts[$idx]['shareCount'] = ($posts[$idx]['shareCount'] ?? 0) + 1;
    writeJson('posts.json', $posts);
    jsonResponse($posts[$idx]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
