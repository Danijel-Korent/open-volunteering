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
 * Find user by name and verify password.
 *
 * @param string $name
 * @param string $password
 * @return array<string, mixed>|null
 */
function findUserByCredentials(string $name, string $password): ?array {
    foreach (readUsers() as $user) {
        if (strcasecmp($user['name'], $name) === 0 && password_verify($password, $user['passwordHash'])) {
            return $user;
        }
    }
    return null;
}

/**
 * Build /auth/me response with session context.
 *
 * @return array<string, mixed>
 */
function buildMeResponse(): array {
    $userId = requireUserSession();
    $active = getActiveAccount();
    if ($active === null) {
        jsonResponse(['error' => 'Not authenticated'], 401);
        exit;
    }

    $response = publicAccount($active['type'], $active['record']);
    $response['userId'] = $userId;
    $response['activeAccountType'] = $active['type'];
    $response['activeAccountId'] = $active['id'];
    $response['memberships'] = listUserMemberships($userId);

    $userRecord = findUser(readUsers(), $userId);
    if ($userRecord !== null) {
        $response['userProfile'] = publicUser($userRecord);
    }

    if ($active['type'] === 'organization') {
        $membership = getUserMembership($userId, $active['id']);
        $response['organizationRole'] = $membership['role'] ?? null;
    }

    return $response;
}

if ($action === 'register' && method() === 'POST') {
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');

    if (!$name) {
        jsonResponse(['error' => 'Name is required'], 400);
        exit;
    }
    if (isNameTaken($name)) {
        jsonResponse(['error' => 'Name already taken — choose a different name'], 409);
        exit;
    }

    $password = generateSimplePassword();
    $users = readUsers();
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
        'seekingVolunteering' => false,
        'weeklyVolunteeringHours' => 0,
        'createdAt' => date('c'),
    ];
    $users[] = $user;
    writeJson(USERS_JSON, $users);
    loginUserSession($id);
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

    $user = findUserByCredentials($name, $password);
    if ($user === null) {
        jsonResponse(['error' => 'Invalid name or password'], 401);
        exit;
    }

    loginUserSession((int) $user['id']);
    jsonResponse(buildMeResponse());
    exit;
}

if ($action === 'logout' && method() === 'POST') {
    session_destroy();
    jsonResponse(['ok' => true]);
    exit;
}

if ($action === 'me' && method() === 'GET') {
    if (getSessionUserId() === null) {
        jsonResponse(['error' => 'Not authenticated'], 401);
        exit;
    }
    jsonResponse(buildMeResponse());
    exit;
}

if ($action === 'switch' && method() === 'POST') {
    $userId = requireUserSession();
    $input = getJsonInput();
    $type = $input['activeAccountType'] ?? $input['accountType'] ?? '';
    $targetId = isset($input['activeAccountId']) ? (int) $input['activeAccountId']
        : (isset($input['accountId']) ? (int) $input['accountId'] : null);

    if ($type === 'volunteer') {
        $type = 'user';
    }

    if ($type === 'user') {
        setActiveAccount('user', $userId);
        jsonResponse(buildMeResponse());
        exit;
    }

    if ($type === 'organization') {
        if ($targetId === null) {
            jsonResponse(['error' => 'activeAccountId is required for organization context'], 400);
            exit;
        }
        if (!findOrganization(readOrganizations(), $targetId)) {
            jsonResponse(['error' => 'Organization not found'], 404);
            exit;
        }
        if (!isOrgAdmin($userId, $targetId)) {
            jsonResponse(['error' => 'Only organization admins can switch to this organization'], 403);
            exit;
        }
        setActiveAccount('organization', $targetId);
        jsonResponse(buildMeResponse());
        exit;
    }

    jsonResponse(['error' => 'activeAccountType must be user or organization'], 400);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
