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
 * Build a placeholder email from display name and account id (not used for login).
 */
function placeholderEmail(string $name, int $id): string {
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', trim($name)));
    $slug = trim($slug, '-') ?: 'user';
    return $slug . '-' . $id . '@open-volunteering.local';
}

/**
 * Find account by name and verify password.
 *
 * @param string $name
 * @param string $password
 * @return array{type: string, record: array<string, mixed>}|null
 */
function findAccountByCredentials(string $name, string $password): ?array {
    foreach (readVolunteers() as $user) {
        if (strcasecmp($user['name'], $name) === 0 && password_verify($password, $user['passwordHash'])) {
            return ['type' => 'volunteer', 'record' => $user];
        }
    }
    foreach (readOrganizations() as $org) {
        if (strcasecmp($org['name'], $name) === 0 && password_verify($password, $org['passwordHash'])) {
            return ['type' => 'organization', 'record' => $org];
        }
    }
    return null;
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
    if (isNameTaken($name)) {
        jsonResponse(['error' => 'Name already taken — choose a different name'], 409);
        exit;
    }

    $password = generateSimplePassword();

    if ($type === 'organization') {
        $orgs = readOrganizations();
        $id = nextId($orgs);
        $org = [
            'id' => $id,
            'email' => placeholderEmail($name, $id),
            'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
            'name' => $name,
            'bio' => '',
            'location' => null,
            'createdAt' => date('c'),
        ];
        $orgs[] = $org;
        writeJson(ORGANIZATIONS_JSON, $orgs);
        setCurrentAccount('organization', $id);
        $response = publicOrganization($org);
    } else {
        $users = readVolunteers();
        $id = nextId($users);
        $user = [
            'id' => $id,
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
        writeJson(VOLUNTEERS_JSON, $users);
        setCurrentAccount('volunteer', $id);
        $response = publicVolunteer($user);
    }

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

    $found = findAccountByCredentials($name, $password);
    if ($found === null) {
        jsonResponse(['error' => 'Invalid name or password'], 401);
        exit;
    }

    $id = (int) $found['record']['id'];
    setCurrentAccount($found['type'], $id);
    jsonResponse(publicAccount($found['type'], $found['record']));
    exit;
}

if ($action === 'logout' && method() === 'POST') {
    session_destroy();
    jsonResponse(['ok' => true]);
    exit;
}

if ($action === 'me' && method() === 'GET') {
    $account = getCurrentAccount();
    if ($account === null) {
        jsonResponse(['error' => 'Not authenticated'], 401);
        exit;
    }
    jsonResponse(publicAccount($account['type'], $account['record']));
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
