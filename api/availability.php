<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$availabilityId = isset($segments[1]) ? (int) $segments[1] : null;

/**
 * Find availability index by id.
 *
 * @param array<int, array<string, mixed>> $avail
 * @param int $id
 * @return int|null
 */
function findAvailabilityIndex(array $avail, int $id): ?int {
    foreach ($avail as $i => $row) {
        if ((int) ($row['id'] ?? 0) === $id) {
            return $i;
        }
    }
    return null;
}

/**
 * Find upsert index for an offerer + target pair.
 *
 * @param array<int, array<string, mixed>> $avail
 * @param string $offererType
 * @param int $offererId
 * @param string $targetType
 * @param int $targetId
 * @return int|null
 */
function findAvailabilityUpsertIndex(
    array $avail,
    string $offererType,
    int $offererId,
    string $targetType,
    int $targetId,
): ?int {
    foreach ($avail as $i => $row) {
        $normalized = normalizeAvailabilityOfferer($row);
        if (($normalized['offererType'] ?? '') === $offererType
            && (int) ($normalized['offererId'] ?? 0) === $offererId
            && ($normalized['targetType'] ?? '') === $targetType
            && (int) ($normalized['targetId'] ?? 0) === $targetId) {
            return $i;
        }
    }
    return null;
}

if ($availabilityId !== null && $availabilityId > 0 && method() === 'PATCH') {
    $auth = requireAuth();
    $input = getJsonInput();
    $newStatus = $input['status'] ?? '';
    if (!in_array($newStatus, ['accepted', 'rejected'], true)) {
        jsonResponse(['error' => 'status must be accepted or rejected'], 400);
        exit;
    }

    $avail = readJson(AVAILABILITY_JSON);
    $idx = findAvailabilityIndex($avail, $availabilityId);
    if ($idx === null) {
        jsonResponse(['error' => 'Skill offer not found'], 404);
        exit;
    }

    $row = normalizeAvailabilityOfferer($avail[$idx]);
    requireAvailabilityRecipient($row);

    $currentStatus = (string) ($row['status'] ?? 'pending');
    if ($currentStatus !== 'pending') {
        jsonResponse(['error' => 'Skill offer status cannot be changed'], 409);
        exit;
    }

    $avail[$idx]['status'] = $newStatus;
    $avail[$idx]['statusUpdatedAt'] = date('c');
    writeJson(AVAILABILITY_JSON, $avail);

    $actorType = $auth['type'];
    $actorId = $auth['id'];
    notifySkillOfferStatusChange($avail[$idx], $newStatus, $actorType, $actorId);

    jsonResponse(enrichAvailabilityRow($avail[$idx]));
    exit;
}

if ($availabilityId !== null && $availabilityId > 0 && method() === 'DELETE') {
    $auth = requireAuth();
    $avail = readJson(AVAILABILITY_JSON);
    $idx = findAvailabilityIndex($avail, $availabilityId);
    if ($idx === null) {
        jsonResponse(['error' => 'Skill offer not found'], 404);
        exit;
    }

    $row = $avail[$idx];
    $isOfferer = isAvailabilityOfferer($row, $auth['type'], $auth['id']);
    $isRecipient = canManageAvailabilityAsRecipient($row, $auth);
    if (!$isOfferer && !$isRecipient) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }

    array_splice($avail, $idx, 1);
    writeJson(AVAILABILITY_JSON, $avail);
    jsonResponse(['ok' => true]);
    exit;
}

if (method() === 'GET') {
    $account = getActiveAccount();
    $targetType = $_GET['targetType'] ?? null;
    $targetId = isset($_GET['targetId']) ? (int) $_GET['targetId'] : null;
    $forOrgId = isset($_GET['forOrgId']) ? (int) $_GET['forOrgId'] : null;
    $forUserId = isset($_GET['forUserId']) ? (int) $_GET['forUserId'] : null;
    $avail = readJson(AVAILABILITY_JSON);

    if ($forOrgId !== null) {
        requireOrgAdminSession($forOrgId);
        if (findOrganization(readOrganizations(), $forOrgId) === null) {
            jsonResponse(['error' => 'Organization not found'], 404);
            exit;
        }

        $posts = readJson(POSTS_JSON);
        $positions = readJson(POSITIONS_JSON);
        $events = readJson(EVENTS_JSON);

        $orgPostIds = [];
        foreach ($posts as $post) {
            if (($post['authorType'] ?? '') === 'organization' && (int) $post['authorId'] === $forOrgId) {
                $orgPostIds[] = (int) $post['id'];
            }
        }
        $orgPositionIds = [];
        foreach ($positions as $position) {
            if (($position['authorType'] ?? '') === 'organization' && (int) $position['authorId'] === $forOrgId) {
                $orgPositionIds[] = (int) $position['id'];
            }
        }
        $orgEventIds = [];
        foreach ($events as $event) {
            if (($event['authorType'] ?? '') === 'organization' && (int) $event['authorId'] === $forOrgId) {
                $orgEventIds[] = (int) $event['id'];
            }
        }

        $avail = array_values(array_filter(
            $avail,
            fn($a) => availabilityInboundToOrg($a, $forOrgId, $orgPostIds, $orgPositionIds, $orgEventIds),
        ));
    } elseif ($forUserId !== null) {
        $sessionUserId = requireUserSession();
        if ($sessionUserId !== $forUserId) {
            jsonResponse(['error' => 'Forbidden'], 403);
            exit;
        }
        $avail = array_values(array_filter($avail, function ($a) use ($forUserId) {
            $recipient = resolveAvailabilityRecipient(
                (string) ($a['targetType'] ?? ''),
                (int) ($a['targetId'] ?? 0),
            );
            return $recipient !== null
                && $recipient['kind'] === 'user'
                && (int) ($recipient['userId'] ?? 0) === $forUserId;
        }));
    } elseif ($targetType && $targetId) {
        $avail = array_values(array_filter($avail, fn($a) =>
            ($a['targetType'] ?? '') === $targetType && (int) ($a['targetId'] ?? 0) === $targetId
        ));
    } elseif ($account !== null) {
        $mine = $_GET['mine'] ?? '';
        if ($mine === '1') {
            $avail = array_values(array_filter(
                $avail,
                fn($a) => isAvailabilityOfferer($a, $account['type'], $account['id']),
            ));
        }
    }

    $result = [];
    foreach ($avail as $a) {
        $result[] = enrichAvailabilityRow($a);
    }
    jsonResponse($result);
    exit;
}

if (method() === 'POST') {
    $auth = requireAuth();
    if (!in_array($auth['type'], ['user', 'organization'], true)) {
        jsonResponse(['error' => 'Invalid account type'], 403);
        exit;
    }

    $offererType = $auth['type'];
    $offererId = $auth['id'];
    if ($offererType === 'organization') {
        requireOrgAdminSession($offererId);
    }

    $input = getJsonInput();
    $targetType = trim((string) ($input['targetType'] ?? ''));
    $targetId = (int) ($input['targetId'] ?? 0);
    $skillsOffered = parseNonEmptyStringList($input['skillsOffered'] ?? []);

    if ($targetType === '' || $targetId <= 0) {
        jsonResponse(['error' => 'targetType and targetId required'], 400);
        exit;
    }
    if ($skillsOffered === []) {
        jsonResponse(['error' => 'At least one skill is required'], 400);
        exit;
    }

    if ($offererType === 'organization') {
        $targetOrgId = resolveOrgIdFromAvailabilityTarget($targetType, $targetId);
        if ($targetOrgId !== null && $targetOrgId === $offererId) {
            jsonResponse(['error' => 'Cannot offer skills to your own organization'], 400);
            exit;
        }
    }

    $avail = readJson(AVAILABILITY_JSON);
    $upsertIdx = findAvailabilityUpsertIndex($avail, $offererType, $offererId, $targetType, $targetId);
    if ($upsertIdx !== null) {
        $avail[$upsertIdx]['skillsOffered'] = $skillsOffered;
        writeJson(AVAILABILITY_JSON, $avail);
        jsonResponse(enrichAvailabilityRow($avail[$upsertIdx]));
        exit;
    }

    $entry = [
        'id' => nextId($avail),
        'offererType' => $offererType,
        'offererId' => $offererId,
        'targetType' => $targetType,
        'targetId' => $targetId,
        'skillsOffered' => $skillsOffered,
        'status' => 'pending',
        'createdAt' => date('c'),
    ];
    if ($offererType === 'user') {
        $entry['userId'] = $offererId;
    }
    $avail[] = $entry;
    writeJson(AVAILABILITY_JSON, $avail);

    notifyOnNewSkillOffer($entry, $offererType, $offererId);

    jsonResponse(enrichAvailabilityRow($entry), 201);
    exit;
}

jsonResponse(['error' => 'Method not allowed'], 405);
