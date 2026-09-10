<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$sub = $segments[1] ?? '';
$id = isset($segments[1]) && $segments[1] !== 'me' ? (int) $segments[1] : null;
$subAction = $segments[2] ?? '';

$users = readUsers();

if ($sub === 'me' && $subAction === 'memberships' && method() === 'GET') {
    $userId = requireUserSession();
    jsonResponse(listUserMemberships($userId));
    exit;
}

if ($id === null && method() === 'GET') {
    jsonResponse(array_map('publicUser', $users));
    exit;
}

if ($id !== null && $subAction === '' && method() === 'GET') {
    $user = findUser($users, $id);
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
        exit;
    }
    jsonResponse(publicUser($user));
    exit;
}

if ($id !== null && $subAction === '' && method() === 'PATCH') {
    $auth = requireAuth();
    $userId = requireUserSession();
    if ($auth['type'] !== 'user' || $auth['id'] !== $userId || $userId !== $id) {
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

    $allowed = ['name', 'bio', 'location', 'skills', 'experience', 'avatarFileId', 'seekingVolunteering', 'weeklyVolunteeringHours'];
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
                requireAttachableFile($avatarFileId, 'user', $id);
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
    writeJson(USERS_JSON, $users);
    jsonResponse(publicUser($users[$idx]));
    exit;
}

if ($id !== null && $subAction === 'follow' && method() === 'GET') {
    $auth = requireAuth();
    jsonResponse([
        'following' => isFollowingProfile('user', $id, $auth['type'], $auth['id']),
    ]);
    exit;
}

if ($id !== null && $subAction === 'follow' && method() === 'POST') {
    $auth = requireAuth();
    if ($auth['type'] === 'user' && $auth['id'] === $id) {
        jsonResponse(['error' => 'Cannot follow yourself'], 400);
        exit;
    }
    if (!findUser($users, $id)) {
        jsonResponse(['error' => 'User not found'], 404);
        exit;
    }
    $follows = readJson(PROFILE_FOLLOWS_JSON);
    foreach ($follows as $f) {
        if ($f['followerType'] === $auth['type'] && (int) $f['followerId'] === $auth['id']
            && $f['followingType'] === 'user' && (int) $f['followingId'] === $id) {
            jsonResponse(['ok' => true, 'following' => true]);
            exit;
        }
    }
    $actingUserId = followActingUserId();
    if ($actingUserId === null) {
        jsonResponse(['error' => 'Authentication required'], 401);
        exit;
    }
    $follows[] = [
        'followerType' => $auth['type'],
        'followerId' => $auth['id'],
        'actingUserId' => $actingUserId,
        'followingType' => 'user',
        'followingId' => $id,
        'createdAt' => date('c'),
    ];
    writeJson(PROFILE_FOLLOWS_JSON, $follows);
    jsonResponse(['ok' => true, 'following' => true], 201);
    exit;
}

if ($id !== null && $subAction === 'follow' && method() === 'DELETE') {
    $auth = requireAuth();
    $follows = readJson(PROFILE_FOLLOWS_JSON);
    $follows = array_values(array_filter($follows, fn($f) =>
        !($f['followerType'] === $auth['type'] && (int) $f['followerId'] === $auth['id']
            && $f['followingType'] === 'user' && (int) $f['followingId'] === $id)
    ));
    writeJson(PROFILE_FOLLOWS_JSON, $follows);
    jsonResponse(['ok' => true, 'following' => false]);
    exit;
}

if ($id !== null && $subAction === 'feed' && method() === 'GET') {
    require __DIR__ . '/feed.php';
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
