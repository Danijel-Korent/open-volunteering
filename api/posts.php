<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

if ($id === null && method() === 'GET') {
    $posts = readJson('posts.json');
    jsonResponse($posts);
    exit;
}

if ($id === null && method() === 'POST') {
    $userId = requireAuth();
    $users = readJson('users.json');
    $user = findUser($users, $userId);
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
        exit;
    }
    $input = getJsonInput();
    $content = trim($input['content'] ?? '');
    if (!$content) {
        jsonResponse(['error' => 'Content is required'], 400);
        exit;
    }
    $postType = $user['type'] === 'organization' ? 'org_post' : 'user_post';
    $posts = readJson('posts.json');
    $post = [
        'id' => nextId($posts),
        'authorId' => $userId,
        'postType' => $postType,
        'content' => $content,
        'likeCount' => 0,
        'shareCount' => 0,
        'createdAt' => date('c'),
    ];
    $posts[] = $post;
    writeJson('posts.json', $posts);
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
