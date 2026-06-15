<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

if ($id === null && method() === 'GET') {
    $positions = readJson('positions.json');
    usort($positions, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
    jsonResponse($positions);
    exit;
}

if ($id === null && method() === 'POST') {
    $userId = requireAuth();
    $users = readJson('users.json');
    $user = findUser($users, $userId);
    if (!$user || $user['type'] !== 'organization') {
        jsonResponse(['error' => 'Only organizations can create positions'], 403);
        exit;
    }
    $input = getJsonInput();
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    if (!$title || !$description) {
        jsonResponse(['error' => 'Title and description are required'], 400);
        exit;
    }
    $positions = readJson('positions.json');
    $position = [
        'id' => nextId($positions),
        'authorId' => $userId,
        'title' => $title,
        'description' => $description,
        'category' => $input['category'] ?? 'general',
        'remote' => (bool) ($input['remote'] ?? false),
        'location' => $input['location'] ?? null,
        'likeCount' => 0,
        'createdAt' => date('c'),
    ];
    $positions[] = $position;
    writeJson('positions.json', $positions);
    jsonResponse($position, 201);
    exit;
}

if ($id !== null && $sub === 'apply' && method() === 'POST') {
    $userId = requireAuth();
    $users = readJson('users.json');
    $user = findUser($users, $userId);
    if (!$user || $user['type'] !== 'volunteer') {
        jsonResponse(['error' => 'Only volunteers can apply'], 403);
        exit;
    }
    $positions = readJson('positions.json');
    $found = false;
    foreach ($positions as $p) {
        if ((int) $p['id'] === $id) {
            $found = true;
            break;
        }
    }
    if (!$found) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $applications = readJson('applications.json');
    foreach ($applications as $a) {
        if ((int) $a['positionId'] === $id && (int) $a['volunteerId'] === $userId) {
            jsonResponse(['error' => 'Already applied'], 409);
            exit;
        }
    }
    $app = [
        'id' => nextId($applications),
        'positionId' => $id,
        'volunteerId' => $userId,
        'status' => 'pending',
        'createdAt' => date('c'),
    ];
    $applications[] = $app;
    writeJson('applications.json', $applications);
    jsonResponse($app, 201);
    exit;
}

if ($id !== null && $sub === 'like' && method() === 'POST') {
    requireAuth();
    $positions = readJson('positions.json');
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
    writeJson('positions.json', $positions);
    jsonResponse($positions[$idx]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
