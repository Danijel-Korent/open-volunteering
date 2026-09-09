<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();

if (method() === 'GET') {
    $account = getActiveAccount();
    $targetType = $_GET['targetType'] ?? null;
    $targetId = isset($_GET['targetId']) ? (int) $_GET['targetId'] : null;
    $forOrgId = isset($_GET['forOrgId']) ? (int) $_GET['forOrgId'] : null;
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
    } elseif ($account !== null) {
        $mine = $_GET['mine'] ?? '';
        if ($mine === '1' && $account['type'] === 'user') {
            $avail = array_values(array_filter($avail, fn($a) =>
                (int) ($a['userId'] ?? $a['volunteerId'] ?? 0) === $account['id']
            ));
        }
    }
    $users = readUsers();
    $result = [];
    foreach ($avail as $a) {
        $uid = (int) ($a['userId'] ?? $a['volunteerId'] ?? 0);
        $user = findUser($users, $uid);
        $result[] = [
            ...$a,
            'user' => $user ? publicUser($user) : null,
        ];
    }
    jsonResponse($result);
    exit;
}

if (method() === 'POST') {
    $auth = requireAuth();
    if ($auth['type'] !== 'user') {
        jsonResponse(['error' => 'Only users can set availability'], 403);
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
    $avail = readJson(AVAILABILITY_JSON);
    foreach ($avail as $i => $a) {
        if ((int) ($a['userId'] ?? $a['volunteerId'] ?? 0) === $auth['id']
            && $a['targetType'] === $targetType && (int) $a['targetId'] === $targetId) {
            $avail[$i]['skillsOffered'] = $skillsOffered;
            writeJson(AVAILABILITY_JSON, $avail);
            jsonResponse($avail[$i]);
            exit;
        }
    }
    $entry = [
        'id' => nextId($avail),
        'userId' => $auth['id'],
        'targetType' => $targetType,
        'targetId' => $targetId,
        'skillsOffered' => $skillsOffered,
        'createdAt' => date('c'),
    ];
    $avail[] = $entry;
    writeJson(AVAILABILITY_JSON, $avail);
    jsonResponse($entry, 201);
    exit;
}

jsonResponse(['error' => 'Method not allowed'], 405);
