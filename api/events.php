<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

if ($id === null && method() === 'GET') {
    $events = readJson(EVENTS_JSON);
    usort($events, fn($a, $b) => strcmp($a['startDate'], $b['startDate']));
    jsonResponse($events);
    exit;
}

if ($id === null && method() === 'POST') {
    $auth = requireAuth();
    if ($auth['type'] === 'organization') {
        requireOrgAdminSession($auth['id']);
    }
    $input = getJsonInput();
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $startDate = $input['startDate'] ?? '';
    if (!$title || !$description || !$startDate) {
        jsonResponse(['error' => 'Title, description, and startDate are required'], 400);
        exit;
    }
    $events = readJson(EVENTS_JSON);
    $event = [
        'id' => nextId($events),
        'authorType' => $auth['type'],
        'authorId' => $auth['id'],
        'title' => $title,
        'description' => $description,
        'startDate' => $startDate,
        'endDate' => $input['endDate'] ?? $startDate,
        'locationType' => $input['locationType'] ?? 'physical',
        'location' => $input['location'] ?? null,
        'likeCount' => 0,
        'createdAt' => date('c'),
    ];
    $events[] = $event;
    writeJson(EVENTS_JSON, $events);
    notifyProfileFollowersOnNewContent(
        'event',
        $auth['type'],
        $auth['id'],
        (int) $event['id'],
    );
    jsonResponse($event, 201);
    exit;
}

if ($id !== null && $sub === 'rsvp' && method() === 'POST') {
    $auth = requireAuth();
    $input = getJsonInput();
    $status = $input['status'] ?? 'going';
    if (!in_array($status, ['going', 'maybe'], true)) {
        jsonResponse(['error' => 'Status must be going or maybe'], 400);
        exit;
    }
    $events = readJson(EVENTS_JSON);
    $found = false;
    foreach ($events as $e) {
        if ((int) $e['id'] === $id) {
            $found = true;
            break;
        }
    }
    if (!$found) {
        jsonResponse(['error' => 'Event not found'], 404);
        exit;
    }
    $rsvps = readJson(EVENT_RSVPS_JSON);
    $updated = false;
    foreach ($rsvps as $i => $r) {
        if ((int) $r['eventId'] === $id
            && ($r['accountType'] ?? 'user') === $auth['type']
            && (int) $r['accountId'] === $auth['id']) {
            $rsvps[$i]['status'] = $status;
            $updated = true;
            break;
        }
    }
    if (!$updated) {
        $rsvps[] = [
            'eventId' => $id,
            'accountType' => $auth['type'],
            'accountId' => $auth['id'],
            'status' => $status,
        ];
    }
    writeJson(EVENT_RSVPS_JSON, $rsvps);
    jsonResponse([
        'eventId' => $id,
        'accountType' => $auth['type'],
        'accountId' => $auth['id'],
        'status' => $status,
    ]);
    exit;
}

if ($id !== null && $sub === 'like' && method() === 'POST') {
    requireAuth();
    $events = readJson(EVENTS_JSON);
    $idx = null;
    foreach ($events as $i => $e) {
        if ((int) $e['id'] === $id) {
            $idx = $i;
            break;
        }
    }
    if ($idx === null) {
        jsonResponse(['error' => 'Event not found'], 404);
        exit;
    }
    $events[$idx]['likeCount'] = ($events[$idx]['likeCount'] ?? 0) + 1;
    writeJson(EVENTS_JSON, $events);
    jsonResponse($events[$idx]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
