<?php
require_once __DIR__ . '/config.php';

const APPLICATION_MESSAGE_MAX_LENGTH = 500;

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';
$applicationId = isset($segments[3]) ? (int) $segments[3] : null;

/**
 * Find a position index and record by id.
 *
 * @param array<int, array<string, mixed>> $positions
 * @param int $positionId
 * @return array{idx: int, record: array<string, mixed>}|null
 */
function findPositionIndex(array $positions, int $positionId): ?array {
    foreach ($positions as $i => $p) {
        if ((int) $p['id'] === $positionId) {
            return ['idx' => $i, 'record' => $p];
        }
    }
    return null;
}

/**
 * Require org admin access to the position's owning organization.
 *
 * @param array<string, mixed> $position
 */
function requirePositionOrgAdmin(array $position): void {
    $auth = requireAuth();
    if (($position['authorType'] ?? 'organization') !== 'organization'
        || $auth['type'] !== 'organization'
        || (int) $position['authorId'] !== $auth['id']) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
    requireOrgAdminSession((int) $position['authorId']);
}

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
    $imageFileId = isset($input['imageFileId']) ? (int) $input['imageFileId'] : null;
    if ($imageFileId) {
        requireAttachableFile($imageFileId, $auth['type'], $auth['id']);
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
    if ($imageFileId) {
        $position['imageFileId'] = $imageFileId;
    }
    $positions[] = $position;
    writeJson(POSITIONS_JSON, $positions);
    if ($imageFileId) {
        attachFileTo($imageFileId, 'position', (int) $position['id']);
    }
    notifyProfileFollowersOnNewContent(
        'position',
        'organization',
        $auth['id'],
        (int) $position['id'],
    );
    jsonResponse($position, 201);
    exit;
}

if ($id !== null && $sub === 'applications' && $applicationId !== null && method() === 'PATCH') {
    $positions = readJson(POSITIONS_JSON);
    $found = findPositionIndex($positions, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $position = $found['record'];
    requirePositionOrgAdmin($position);

    $input = getJsonInput();
    $newStatus = $input['status'] ?? '';
    if (!in_array($newStatus, ['accepted', 'rejected'], true)) {
        jsonResponse(['error' => 'status must be accepted or rejected'], 400);
        exit;
    }

    $applications = readJson(APPLICATIONS_JSON);
    $appIdx = null;
    foreach ($applications as $i => $a) {
        if ((int) $a['id'] === $applicationId && (int) $a['positionId'] === $id) {
            $appIdx = $i;
            break;
        }
    }
    if ($appIdx === null) {
        jsonResponse(['error' => 'Application not found'], 404);
        exit;
    }

    $currentStatus = (string) ($applications[$appIdx]['status'] ?? 'pending');
    if ($currentStatus !== 'pending') {
        jsonResponse(['error' => 'Application status cannot be changed'], 409);
        exit;
    }

    $applications[$appIdx]['status'] = $newStatus;
    $applications[$appIdx]['statusUpdatedAt'] = date('c');
    writeJson(APPLICATIONS_JSON, $applications);

    $applicantUserId = (int) ($applications[$appIdx]['userId'] ?? $applications[$appIdx]['volunteerId'] ?? 0);
    $orgId = (int) ($position['authorId'] ?? 0);
    $notifyType = $newStatus === 'accepted'
        ? 'position_application_accepted'
        : 'position_application_rejected';
    if ($applicantUserId > 0 && $orgId > 0) {
        createNotificationForUser(
            $applicantUserId,
            $notifyType,
            'organization',
            $orgId,
            'position',
            $id,
            $orgId,
        );
    }

    $users = readUsers();
    $user = findUser($users, $applicantUserId);
    jsonResponse([
        ...$applications[$appIdx],
        'user' => $user ? publicUser($user) : null,
    ]);
    exit;
}

if ($id !== null && $sub === 'applications' && $applicationId === null && method() === 'GET') {
    $auth = requireAuth();
    $positions = readJson(POSITIONS_JSON);
    $found = findPositionIndex($positions, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $position = $found['record'];
    requirePositionOrgAdmin($position);

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
    $positions = readJson(POSITIONS_JSON);
    $found = findPositionIndex($positions, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $position = $found['record'];
    if (!empty($position['closedAt'])) {
        jsonResponse(['error' => 'This position is closed'], 403);
        exit;
    }

    $input = getJsonInput();
    $message = trim((string) ($input['message'] ?? ''));
    if (strlen($message) > APPLICATION_MESSAGE_MAX_LENGTH) {
        jsonResponse(['error' => 'Message is too long'], 400);
        exit;
    }

    $applications = readJson(APPLICATIONS_JSON);
    $existingIdx = null;
    foreach ($applications as $i => $a) {
        if ((int) $a['positionId'] === $id && (int) ($a['userId'] ?? $a['volunteerId'] ?? 0) === $userId) {
            $existingIdx = $i;
            break;
        }
    }

    $now = date('c');
    if ($existingIdx !== null) {
        $existingStatus = (string) ($applications[$existingIdx]['status'] ?? 'pending');
        if ($existingStatus === 'pending' || $existingStatus === 'accepted') {
            jsonResponse(['error' => 'Already applied'], 409);
            exit;
        }
        $applications[$existingIdx]['status'] = 'pending';
        $applications[$existingIdx]['createdAt'] = $now;
        unset($applications[$existingIdx]['statusUpdatedAt']);
        if ($message !== '') {
            $applications[$existingIdx]['message'] = $message;
        } else {
            unset($applications[$existingIdx]['message']);
        }
        $app = $applications[$existingIdx];
        writeJson(APPLICATIONS_JSON, $applications);
    } else {
        $app = [
            'id' => nextId($applications),
            'positionId' => $id,
            'userId' => $userId,
            'status' => 'pending',
            'createdAt' => $now,
        ];
        if ($message !== '') {
            $app['message'] = $message;
        }
        $applications[] = $app;
        writeJson(APPLICATIONS_JSON, $applications);
    }

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
    $found = findPositionIndex($positions, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $idx = $found['idx'];
    $positions[$idx]['likeCount'] = (int) ($positions[$idx]['likeCount'] ?? 0) + 1;
    writeJson(POSITIONS_JSON, $positions);
    jsonResponse($positions[$idx]);
    exit;
}

if ($id !== null && $sub === '' && method() === 'PATCH') {
    $positions = readJson(POSITIONS_JSON);
    $found = findPositionIndex($positions, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $idx = $found['idx'];
    $position = $found['record'];
    requireContentAuthorSession($position);
    $auth = requireAuth();
    $input = getJsonInput();

    $allowed = ['title', 'description', 'category', 'remote', 'location'];
    foreach ($allowed as $field) {
        if (!array_key_exists($field, $input)) {
            continue;
        }
        if ($field === 'remote') {
            $positions[$idx]['remote'] = (bool) $input['remote'];
            continue;
        }
        if ($field === 'location') {
            if ($input['location'] === null) {
                $positions[$idx]['location'] = null;
            } elseif (is_array($input['location'])) {
                $positions[$idx]['location'] = $input['location'];
            }
            continue;
        }
        $positions[$idx][$field] = $input[$field];
    }

    if (array_key_exists('closed', $input)) {
        if ((bool) $input['closed']) {
            $positions[$idx]['closedAt'] = date('c');
        } else {
            unset($positions[$idx]['closedAt']);
        }
    }

    if (array_key_exists('imageFileId', $input)) {
        $imageFileId = $input['imageFileId'] !== null ? (int) $input['imageFileId'] : null;
        if ($imageFileId === null || $imageFileId === 0) {
            $oldImageId = isset($positions[$idx]['imageFileId']) ? (int) $positions[$idx]['imageFileId'] : null;
            if ($oldImageId) {
                deleteStoredFile($oldImageId);
            }
            unset($positions[$idx]['imageFileId']);
        } else {
            requireAttachableFile($imageFileId, $auth['type'], $auth['id']);
            $oldImageId = isset($positions[$idx]['imageFileId']) ? (int) $positions[$idx]['imageFileId'] : null;
            if ($oldImageId && $oldImageId !== $imageFileId) {
                deleteStoredFile($oldImageId);
            }
            $positions[$idx]['imageFileId'] = $imageFileId;
            attachFileTo($imageFileId, 'position', $id);
        }
    }

    $title = trim((string) ($positions[$idx]['title'] ?? ''));
    $description = trim((string) ($positions[$idx]['description'] ?? ''));
    if ($title === '' || $description === '') {
        jsonResponse(['error' => 'Title and description are required'], 400);
        exit;
    }
    $positions[$idx]['title'] = $title;
    $positions[$idx]['description'] = $description;

    writeJson(POSITIONS_JSON, $positions);
    jsonResponse($positions[$idx]);
    exit;
}

if ($id !== null && $sub === '' && method() === 'DELETE') {
    $positions = readJson(POSITIONS_JSON);
    $found = findPositionIndex($positions, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Position not found'], 404);
        exit;
    }
    $idx = $found['idx'];
    $position = $found['record'];
    requireContentAuthorSession($position);
    purgeContentTarget('position', $id);
    $imageFileId = isset($position['imageFileId']) ? (int) $position['imageFileId'] : 0;
    if ($imageFileId > 0) {
        deleteStoredFile($imageFileId);
    }
    array_splice($positions, $idx, 1);
    writeJson(POSITIONS_JSON, array_values($positions));
    jsonResponse(['ok' => true]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
