<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

$users = readJson('users.json');

if ($id === null && method() === 'GET') {
    jsonResponse(array_map('publicUser', $users));
    exit;
}

if ($id !== null && $sub === '' && method() === 'GET') {
    $user = findUser($users, $id);
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
        exit;
    }
    jsonResponse(publicUser($user));
    exit;
}

if ($id !== null && $sub === '' && method() === 'PATCH') {
    $userId = requireAuth();
    if ($userId !== $id) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
    $input = getJsonInput();
    $idx = null;
    foreach ($users as $i => $u) {
        if ((int) $u['id'] === $id) {
            $idx = $i;
            break;
        }
    }
    if ($idx === null) {
        jsonResponse(['error' => 'User not found'], 404);
        exit;
    }

    $allowed = ['name', 'bio', 'location', 'skills', 'experience', 'avatarFileId'];
    foreach ($allowed as $field) {
        if (!array_key_exists($field, $input)) {
            continue;
        }
        if ($field === 'avatarFileId') {
            $avatarFileId = $input['avatarFileId'] !== null ? (int) $input['avatarFileId'] : null;
            if ($avatarFileId === null || $avatarFileId === 0) {
                $oldAvatarId = isset($users[$idx]['avatarFileId']) ? (int) $users[$idx]['avatarFileId'] : null;
                if ($oldAvatarId) {
                    deleteStoredFile($oldAvatarId);
                }
                unset($users[$idx]['avatarFileId']);
            } else {
                requireAttachableFile($avatarFileId, $userId);
                $oldAvatarId = isset($users[$idx]['avatarFileId']) ? (int) $users[$idx]['avatarFileId'] : null;
                if ($oldAvatarId && $oldAvatarId !== $avatarFileId) {
                    deleteStoredFile($oldAvatarId);
                }
                $users[$idx]['avatarFileId'] = $avatarFileId;
                attachFileTo($avatarFileId, 'user', $id);
            }
            continue;
        }
        $users[$idx][$field] = $input[$field];
    }
    writeJson('users.json', $users);
    jsonResponse(publicUser($users[$idx]));
    exit;
}

if ($id !== null && $sub === 'follow' && method() === 'POST') {
    $followerId = requireAuth();
    if ($followerId === $id) {
        jsonResponse(['error' => 'Cannot follow yourself'], 400);
        exit;
    }
    if (!findUser($users, $id)) {
        jsonResponse(['error' => 'User not found'], 404);
        exit;
    }
    $follows = readJson('follows.json');
    foreach ($follows as $f) {
        if ((int) $f['followerId'] === $followerId && (int) $f['followingId'] === $id) {
            jsonResponse(['ok' => true, 'following' => true]);
            exit;
        }
    }
    $follows[] = [
        'followerId' => $followerId,
        'followingId' => $id,
        'createdAt' => date('c'),
    ];
    writeJson('follows.json', $follows);
    jsonResponse(['ok' => true, 'following' => true], 201);
    exit;
}

if ($id !== null && $sub === 'follow' && method() === 'DELETE') {
    $followerId = requireAuth();
    $follows = readJson('follows.json');
    $follows = array_values(array_filter($follows, fn($f) =>
        !((int) $f['followerId'] === $followerId && (int) $f['followingId'] === $id)
    ));
    writeJson('follows.json', $follows);
    jsonResponse(['ok' => true, 'following' => false]);
    exit;
}

if ($id !== null && $sub === 'feed' && method() === 'GET') {
    require __DIR__ . '/feed.php';
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
