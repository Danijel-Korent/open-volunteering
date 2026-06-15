<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$action = $segments[1] ?? '';

if ($action === 'register' && method() === 'POST') {
    $input = getJsonInput();
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $name = trim($input['name'] ?? '');
    $type = $input['type'] ?? 'volunteer';

    if (!$email || !$password || !$name) {
        jsonResponse(['error' => 'Email, password, and name are required'], 400);
        exit;
    }
    if (!in_array($type, ['volunteer', 'organization'], true)) {
        jsonResponse(['error' => 'Type must be volunteer or organization'], 400);
        exit;
    }

    $users = readJson('users.json');
    foreach ($users as $u) {
        if (strcasecmp($u['email'], $email) === 0) {
            jsonResponse(['error' => 'Email already registered'], 409);
            exit;
        }
    }

    $user = [
        'id' => nextId($users),
        'type' => $type,
        'email' => $email,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'name' => $name,
        'bio' => '',
        'location' => null,
        'skills' => [],
        'experience' => [],
        'createdAt' => date('c'),
    ];
    $users[] = $user;
    writeJson('users.json', $users);

    $_SESSION['userId'] = $user['id'];
    jsonResponse(publicUser($user), 201);
    exit;
}

if ($action === 'login' && method() === 'POST') {
    $input = getJsonInput();
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    $users = readJson('users.json');
    foreach ($users as $user) {
        if (strcasecmp($user['email'], $email) === 0 && password_verify($password, $user['passwordHash'])) {
            $_SESSION['userId'] = (int) $user['id'];
            jsonResponse(publicUser($user));
            exit;
        }
    }
    jsonResponse(['error' => 'Invalid email or password'], 401);
    exit;
}

if ($action === 'logout' && method() === 'POST') {
    session_destroy();
    jsonResponse(['ok' => true]);
    exit;
}

if ($action === 'me' && method() === 'GET') {
    $userId = currentUserId();
    if ($userId === null) {
        jsonResponse(['error' => 'Not authenticated'], 401);
        exit;
    }
    $users = readJson('users.json');
    $user = findUser($users, $userId);
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
        exit;
    }
    jsonResponse(publicUser($user));
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
