<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$action = $segments[1] ?? '';

/**
 * Generate a simple memorable password (word-number, e.g. apple-42).
 */
function generateSimplePassword(): string {
    $words = [
        'apple', 'blue', 'cat', 'dog', 'echo', 'fire', 'green', 'happy', 'iron', 'jump',
        'kite', 'leaf', 'moon', 'nest', 'oak', 'pine', 'quiz', 'red', 'star', 'tree',
        'unit', 'vine', 'wave', 'yellow', 'zebra',
    ];
    $word = $words[array_rand($words)];
    return $word . '-' . random_int(10, 99);
}

/**
 * Build a placeholder email from display name and user id (not used for login).
 */
function placeholderEmail(string $name, int $id): string {
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', trim($name)));
    $slug = trim($slug, '-') ?: 'user';
    return $slug . '-' . $id . '@open-volunteering.local';
}

if ($action === 'register' && method() === 'POST') {
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');
    $type = $input['type'] ?? 'volunteer';

    if (!$name) {
        jsonResponse(['error' => 'Name is required'], 400);
        exit;
    }
    if (!in_array($type, ['volunteer', 'organization'], true)) {
        jsonResponse(['error' => 'Type must be volunteer or organization'], 400);
        exit;
    }

    $users = readJson('users.json');
    foreach ($users as $u) {
        if (strcasecmp($u['name'], $name) === 0) {
            jsonResponse(['error' => 'Name already taken — choose a different name'], 409);
            exit;
        }
    }

    $password = generateSimplePassword();
    $id = nextId($users);
    $user = [
        'id' => $id,
        'type' => $type,
        'email' => placeholderEmail($name, $id),
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
    $response = publicUser($user);
    $response['generatedPassword'] = $password;
    jsonResponse($response, 201);
    exit;
}

if ($action === 'login' && method() === 'POST') {
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');
    $password = $input['password'] ?? '';

    if (!$name || !$password) {
        jsonResponse(['error' => 'Name and password are required'], 400);
        exit;
    }

    $users = readJson('users.json');
    foreach ($users as $user) {
        if (strcasecmp($user['name'], $name) === 0 && password_verify($password, $user['passwordHash'])) {
            $_SESSION['userId'] = (int) $user['id'];
            jsonResponse(publicUser($user));
            exit;
        }
    }
    jsonResponse(['error' => 'Invalid name or password'], 401);
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
