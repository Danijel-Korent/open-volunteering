<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();

if (method() === 'GET') {
    $userId = currentUserId();
    $targetType = $_GET['targetType'] ?? null;
    $targetId = isset($_GET['targetId']) ? (int) $_GET['targetId'] : null;
    $avail = readJson('availability.json');
    if ($targetType && $targetId) {
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
