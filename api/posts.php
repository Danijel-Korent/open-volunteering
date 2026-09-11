<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

if ($id === null && method() === 'GET') {
    jsonResponse(readJson(POSTS_JSON));
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
    $posts = readJson(POSTS_JSON);
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
    writeJson(POSTS_JSON, $posts);
    if ($imageFileId) {
        attachFileTo($imageFileId, 'post', (int) $post['id']);
    }
    notifyProfileFollowersOnNewContent(
        'post',
        $auth['type'],
        $auth['id'],
        (int) $post['id'],
    );
    jsonResponse($post, 201);
    exit;
}

if ($id !== null && $sub === 'like' && method() === 'POST') {
    requireAuth();
    $posts = readJson(POSTS_JSON);
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
    writeJson(POSTS_JSON, $posts);
    jsonResponse($posts[$idx]);
    exit;
}

if ($id !== null && $sub === 'share' && method() === 'POST') {
    requireAuth();
    $posts = readJson(POSTS_JSON);
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
    writeJson(POSTS_JSON, $posts);
    jsonResponse($posts[$idx]);
    exit;
}

if ($id !== null && $sub === '' && method() === 'PATCH') {
    $auth = requireAuth();
    $posts = readJson(POSTS_JSON);
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
    $post = $posts[$idx];
    requireContentAuthorSession($post);
    $input = getJsonInput();

    if (array_key_exists('content', $input)) {
        $content = trim((string) $input['content']);
        if ($content === '') {
            jsonResponse(['error' => 'Content is required'], 400);
            exit;
        }
        $posts[$idx]['content'] = $content;
    }

    if (array_key_exists('imageFileId', $input)) {
        $imageFileId = $input['imageFileId'] !== null ? (int) $input['imageFileId'] : null;
        if ($imageFileId === null || $imageFileId === 0) {
            $oldImageId = isset($posts[$idx]['imageFileId']) ? (int) $posts[$idx]['imageFileId'] : null;
            if ($oldImageId) {
                deleteStoredFile($oldImageId);
            }
            unset($posts[$idx]['imageFileId']);
        } else {
            requireAttachableFile($imageFileId, $auth['type'], $auth['id']);
            $oldImageId = isset($posts[$idx]['imageFileId']) ? (int) $posts[$idx]['imageFileId'] : null;
            if ($oldImageId && $oldImageId !== $imageFileId) {
                deleteStoredFile($oldImageId);
            }
            $posts[$idx]['imageFileId'] = $imageFileId;
            attachFileTo($imageFileId, 'post', $id);
        }
    }

    $mergedContent = trim((string) ($posts[$idx]['content'] ?? ''));
    if ($mergedContent === '') {
        jsonResponse(['error' => 'Content is required'], 400);
        exit;
    }

    writeJson(POSTS_JSON, $posts);
    jsonResponse($posts[$idx]);
    exit;
}

if ($id !== null && $sub === '' && method() === 'DELETE') {
    $posts = readJson(POSTS_JSON);
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
    $post = $posts[$idx];
    requireContentAuthorSession($post);
    purgeContentTarget('post', $id);
    $imageFileId = isset($post['imageFileId']) ? (int) $post['imageFileId'] : 0;
    if ($imageFileId > 0) {
        deleteStoredFile($imageFileId);
    }
    array_splice($posts, $idx, 1);
    writeJson(POSTS_JSON, array_values($posts));
    jsonResponse(['ok' => true]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
