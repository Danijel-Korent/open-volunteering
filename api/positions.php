<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

if ($id === null && method() === 'GET') {
    $positions = readJson(POSITIONS_JSON);
    usort($positions, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
    jsonResponse($positions);
    exit;
}

if ($id === null && method() === 'POST') {
    $auth = requireAuth();
    if ($auth['type'] !== 'organization') {
        jsonResponse(['error' => 'Only organizations can create positions'], 403);
        exit;
    }
    requireOrgAdminSession($auth['id']);
    $input = getJsonInput();
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    if (!$title || !$description) {
        jsonResponse(['error' => 'Title and description are required'], 400);
        exit;
    }
    $positions = readJson(POSITIONS_JSON);
    $position = [
        'id' => nextId($positions),
        'authorType' => 'organization',
        'authorId' => $auth['id'],
        'title' => $title,
        'description' => $description,
        'category' => $input['category'] ?? 'general',
        'remote' => (bool) ($input['remote'] ?? false),
        'location' => $input['location'] ?? null,
        'likeCount' => 0,
        'createdAt' => date('c'),
    ];
    $positions[] = $position;
    writeJson(POSITIONS_JSON, $positions);
    notifyProfileFollowersOnNewContent(
        'position',
        'organization',
        $auth['id'],
        (int) $position['id'],
    );
    jsonResponse($position, 201);
    exit;
}

if ($id !== null && $sub === 'applications' && method() === 'GET') {
    $auth = requireAuth();
    $positions = readJson(POSITIONS_JSON);
    $position = null;
    foreach ($positions as $p) {
        if ((int) $p['id'] === $id) {
            $position = $p;
            break;
        }
    }
    if ($position === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    if (($position['authorType'] ?? 'organization') !== 'organization'
        || (int) $position['authorId'] !== $auth['id']
        || $auth['type'] !== 'organization') {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }

    requireOrgAdminSession((int) $position['authorId']);

    $applications = readJson(APPLICATIONS_JSON);
    $users = readUsers();
    $filtered = array_values(array_filter(
        $applications,
        fn($a) => (int) $a['positionId'] === $id
    ));
    usort($filtered, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));

    $result = [];
    foreach ($filtered as $app) {
        $appUserId = (int) ($app['userId'] ?? $app['volunteerId'] ?? 0);
        $user = findUser($users, $appUserId);
        $result[] = [
            ...$app,
            'user' => $user ? publicUser($user) : null,
        ];
    }
    jsonResponse($result);
    exit;
}

if ($id !== null && $sub === 'apply' && method() === 'POST') {
    $auth = requireAuth();
    $userId = requireUserSession();
    if ($auth['type'] !== 'user' || $auth['id'] !== $userId) {
        jsonResponse(['error' => 'Switch to your user profile to apply'], 403);
        exit;
    }
    $user = findUser(readUsers(), $userId);
    if ($user === null || empty($user['seekingVolunteering'])) {
        jsonResponse(['error' => 'Enable volunteering preferences on your profile to apply'], 403);
        exit;
    }
    $positions = readJson(POSITIONS_JSON);
    $position = null;
    foreach ($positions as $p) {
        if ((int) $p['id'] === $id) {
            $position = $p;
            break;
        }
    }
    if ($position === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $applications = readJson(APPLICATIONS_JSON);
    foreach ($applications as $a) {
        if ((int) $a['positionId'] === $id && (int) ($a['userId'] ?? $a['volunteerId'] ?? 0) === $userId) {
            jsonResponse(['error' => 'Already applied'], 409);
            exit;
        }
    }
    $app = [
        'id' => nextId($applications),
        'positionId' => $id,
        'userId' => $userId,
        'status' => 'pending',
        'createdAt' => date('c'),
    ];
    $applications[] = $app;
    writeJson(APPLICATIONS_JSON, $applications);

    // Notify org admins when someone applies for a position.
    $orgId = (int) ($position['authorId'] ?? 0);
    if (($position['authorType'] ?? '') === 'organization' && $orgId > 0) {
        createNotificationsForOrgAdmins(
            $orgId,
            'position_application',
            'user',
            $userId,
            'position',
            $id,
            $userId,
        );
    }

    jsonResponse($app, 201);
    exit;
}

if ($id !== null && $sub === 'like' && method() === 'POST') {
    requireAuth();
    $positions = readJson(POSITIONS_JSON);
    $idx = null;
    foreach ($positions as $i => $p) {
        if ((int) $p['id'] === $id) {
            $idx = $i;
            break;
        }
    }
    if ($idx === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $positions[$idx]['likeCount'] = ($positions[$idx]['likeCount'] ?? 0) + 1;
    writeJson(POSITIONS_JSON, $positions);
    jsonResponse($positions[$idx]);
    exit;
}

if ($id !== null && $sub === '' && method() === 'DELETE') {
    $positions = readJson(POSITIONS_JSON);
    $idx = null;
    foreach ($positions as $i => $p) {
        if ((int) $p['id'] === $id) {
            $idx = $i;
            break;
        }
    }
    if ($idx === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $position = $positions[$idx];
    requireContentAuthorSession($position);
    purgeContentTarget('position', $id);
    array_splice($positions, $idx, 1);
    writeJson(POSITIONS_JSON, array_values($positions));
    jsonResponse(['ok' => true]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
