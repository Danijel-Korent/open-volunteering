<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();

if (method() === 'GET') {
    $userId = currentUserId();
    $targetType = $_GET['targetType'] ?? null;
    $targetId = isset($_GET['targetId']) ? (int) $_GET['targetId'] : null;
    $forOrgId = isset($_GET['forOrgId']) ? (int) $_GET['forOrgId'] : null;
    $avail = readJson('availability.json');

    if ($forOrgId !== null) {
        // Inbound skill offers for an organization (direct org target or org-authored content).
        if ($userId === null || $userId !== $forOrgId) {
            jsonResponse(['error' => 'Forbidden'], 403);
            exit;
        }
        $users = readJson('users.json');
        $user = findUser($users, $forOrgId);
        if (!$user || $user['type'] !== 'organization') {
            jsonResponse(['error' => 'Organization not found'], 404);
            exit;
        }

        $posts = readJson('posts.json');
        $positions = readJson('positions.json');
        $events = readJson('events.json');

        $orgPostIds = [];
        foreach ($posts as $post) {
            if ((int) $post['authorId'] === $forOrgId) {
                $orgPostIds[] = (int) $post['id'];
            }
        }
        $orgPositionIds = [];
        foreach ($positions as $position) {
            if ((int) $position['authorId'] === $forOrgId) {
                $orgPositionIds[] = (int) $position['id'];
            }
        }
        $orgEventIds = [];
        foreach ($events as $event) {
            if ((int) $event['authorId'] === $forOrgId) {
                $orgEventIds[] = (int) $event['id'];
            }
        }

        $avail = array_values(array_filter($avail, function ($a) use ($forOrgId, $orgPostIds, $orgPositionIds, $orgEventIds) {
            $type = $a['targetType'] ?? '';
            $tid = (int) ($a['targetId'] ?? 0);
            if ($type === 'organization' && $tid === $forOrgId) {
                return true;
            }
            if ($type === 'post' && in_array($tid, $orgPostIds, true)) {
                return true;
            }
            if ($type === 'position' && in_array($tid, $orgPositionIds, true)) {
                return true;
            }
            if ($type === 'event' && in_array($tid, $orgEventIds, true)) {
                return true;
            }
            return false;
        }));
    } elseif ($targetType && $targetId) {
        $avail = array_values(array_filter($avail, fn($a) =>
            $a['targetType'] === $targetType && (int) $a['targetId'] === $targetId
        ));
    } elseif ($userId !== null) {
        $mine = $_GET['mine'] ?? '';
        if ($mine === '1') {
            $avail = array_values(array_filter($avail, fn($a) => (int) $a['volunteerId'] === $userId));
        }
    }
    $users = readJson('users.json');
    $result = [];
    foreach ($avail as $a) {
        $vol = findUser($users, (int) $a['volunteerId']);
        $result[] = [
            ...$a,
            'volunteer' => $vol ? publicUser($vol) : null,
        ];
    }
    jsonResponse($result);
    exit;
}

if (method() === 'POST') {
    $userId = requireAuth();
    $users = readJson('users.json');
    $user = findUser($users, $userId);
    if (!$user || $user['type'] !== 'volunteer') {
        jsonResponse(['error' => 'Only volunteers can set availability'], 403);
        exit;
    }
    $input = getJsonInput();
    $targetType = $input['targetType'] ?? '';
    $targetId = (int) ($input['targetId'] ?? 0);
    $skillsOffered = $input['skillsOffered'] ?? [];
    if (!$targetType || !$targetId) {
        jsonResponse(['error' => 'targetType and targetId required'], 400);
        exit;
    }
    $avail = readJson('availability.json');
    foreach ($avail as $i => $a) {
        if ((int) $a['volunteerId'] === $userId && $a['targetType'] === $targetType && (int) $a['targetId'] === $targetId) {
            $avail[$i]['skillsOffered'] = $skillsOffered;
            writeJson('availability.json', $avail);
            jsonResponse($avail[$i]);
            exit;
        }
    }
    $entry = [
        'id' => nextId($avail),
        'volunteerId' => $userId,
        'targetType' => $targetType,
        'targetId' => $targetId,
        'skillsOffered' => $skillsOffered,
        'createdAt' => date('c'),
    ];
    $avail[] = $entry;
    writeJson('availability.json', $avail);
    jsonResponse($entry, 201);
    exit;
}

jsonResponse(['error' => 'Method not allowed'], 405);
