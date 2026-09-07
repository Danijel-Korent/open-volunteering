<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();

if (method() === 'GET') {
    $account = getCurrentAccount();
    $targetType = $_GET['targetType'] ?? null;
    $targetId = isset($_GET['targetId']) ? (int) $_GET['targetId'] : null;
    $forOrgId = isset($_GET['forOrgId']) ? (int) $_GET['forOrgId'] : null;
    $avail = readJson('availability.json');

    if ($forOrgId !== null) {
        if ($account === null || $account['type'] !== 'organization' || $account['id'] !== $forOrgId) {
            jsonResponse(['error' => 'Forbidden'], 403);
            exit;
        }
        if (findOrganization(readOrganizations(), $forOrgId) === null) {
            jsonResponse(['error' => 'Organization not found'], 404);
            exit;
        }

        $posts = readJson('posts.json');
        $positions = readJson('positions.json');
        $events = readJson('events.json');

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
        if ($mine === '1' && $account['type'] === 'volunteer') {
            $avail = array_values(array_filter($avail, fn($a) => (int) $a['volunteerId'] === $account['id']));
        }
    }
    $users = readVolunteers();
    $result = [];
    foreach ($avail as $a) {
        $vol = findVolunteer($users, (int) $a['volunteerId']);
        $result[] = [
            ...$a,
            'volunteer' => $vol ? publicVolunteer($vol) : null,
        ];
    }
    jsonResponse($result);
    exit;
}

if (method() === 'POST') {
    $auth = requireAuth();
    if ($auth['type'] !== 'volunteer') {
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
        if ((int) $a['volunteerId'] === $auth['id'] && $a['targetType'] === $targetType && (int) $a['targetId'] === $targetId) {
            $avail[$i]['skillsOffered'] = $skillsOffered;
            writeJson('availability.json', $avail);
            jsonResponse($avail[$i]);
            exit;
        }
    }
    $entry = [
        'id' => nextId($avail),
        'volunteerId' => $auth['id'],
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
