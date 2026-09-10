<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$sub = $segments[1] ?? '';
$id = isset($segments[1]) && is_numeric($segments[1]) ? (int) $segments[1] : null;
$action = $segments[2] ?? '';

if (method() === 'GET' && $sub === 'unread-count') {
    $userId = requireUserSession();
    $notifications = readJson(NOTIFICATION_INBOX_JSON);
    $totalUnread = 0;
    foreach ($notifications as $n) {
        if ((int) ($n['recipientUserId'] ?? 0) === $userId && empty($n['readAt'])) {
            $totalUnread++;
        }
    }
    jsonResponse(['totalUnread' => $totalUnread]);
    exit;
}

if (method() === 'GET' && $sub === '') {
    $userId = requireUserSession();
    $limit = isset($_GET['limit']) ? max(1, min(100, (int) $_GET['limit'])) : 50;
    $notifications = readJson(NOTIFICATION_INBOX_JSON);
    $mine = array_values(array_filter(
        $notifications,
        fn($n) => (int) ($n['recipientUserId'] ?? 0) === $userId,
    ));
    usort($mine, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));
    $totalUnread = 0;
    foreach ($mine as $n) {
        if (empty($n['readAt'])) {
            $totalUnread++;
        }
    }
    $slice = array_slice($mine, 0, $limit);
    $items = [];
    foreach ($slice as $n) {
        $items[] = enrichNotification($n);
    }
    jsonResponse([
        'items' => $items,
        'totalUnread' => $totalUnread,
        'totalItems' => count($mine),
    ]);
    exit;
}

if (method() === 'POST' && $sub === 'read-all') {
    $userId = requireUserSession();
    $notifications = readJson(NOTIFICATION_INBOX_JSON);
    $now = date('c');
    foreach ($notifications as $i => $n) {
        if ((int) ($n['recipientUserId'] ?? 0) === $userId && empty($n['readAt'])) {
            $notifications[$i]['readAt'] = $now;
        }
    }
    writeJson(NOTIFICATION_INBOX_JSON, $notifications);
    jsonResponse(['ok' => true]);
    exit;
}

if (method() === 'POST' && $id !== null && $action === 'read') {
    $userId = requireUserSession();
    $notifications = readJson(NOTIFICATION_INBOX_JSON);
    $found = false;
    foreach ($notifications as $i => $n) {
        if ((int) ($n['id'] ?? 0) === $id) {
            if ((int) ($n['recipientUserId'] ?? 0) !== $userId) {
                jsonResponse(['error' => 'Forbidden'], 403);
                exit;
            }
            $notifications[$i]['readAt'] = date('c');
            $found = true;
            break;
        }
    }
    if (!$found) {
        jsonResponse(['error' => 'Notification not found'], 404);
        exit;
    }
    writeJson(NOTIFICATION_INBOX_JSON, $notifications);
    jsonResponse(['ok' => true]);
    exit;
}

jsonResponse(['error' => 'Method not allowed'], 405);
