<?php
require_once __DIR__ . '/config.php';

/**
 * Build unified feed items from posts, positions, and events.
 *
 * @param int|null $authorId When set, only include items by this author
 * @return array<int, array<string, mixed>>
 */
function buildFeedItems(?int $authorId = null): array {
    $users = readJson('users.json');
    $userMap = [];
    foreach ($users as $u) {
        $userMap[(int) $u['id']] = $u;
    }

    $items = [];

    foreach (readJson('posts.json') as $p) {
        if ($authorId !== null && (int) $p['authorId'] !== $authorId) continue;
        $author = $userMap[(int) $p['authorId']] ?? null;
        $items[] = [
            'feedType' => $p['postType'],
            'id' => (int) $p['id'],
            'authorId' => (int) $p['authorId'],
            'author' => $author ? publicUser($author) : null,
            'content' => $p['content'],
            'likeCount' => $p['likeCount'] ?? 0,
            'shareCount' => $p['shareCount'] ?? 0,
            'createdAt' => $p['createdAt'],
            'location' => $author['location'] ?? null,
        ];
    }

    foreach (readJson('positions.json') as $p) {
        if ($authorId !== null && (int) $p['authorId'] !== $authorId) continue;
        $author = $userMap[(int) $p['authorId']] ?? null;
        $items[] = [
            'feedType' => 'position',
            'id' => (int) $p['id'],
            'authorId' => (int) $p['authorId'],
            'author' => $author ? publicUser($author) : null,
            'title' => $p['title'],
            'content' => $p['description'],
            'category' => $p['category'] ?? 'general',
            'remote' => (bool) ($p['remote'] ?? false),
            'location' => $p['location'] ?? ($author['location'] ?? null),
            'likeCount' => $p['likeCount'] ?? 0,
            'createdAt' => $p['createdAt'],
        ];
    }

    foreach (readJson('events.json') as $e) {
        if ($authorId !== null && (int) $e['authorId'] !== $authorId) continue;
        $author = $userMap[(int) $e['authorId']] ?? null;
        $items[] = [
            'feedType' => 'event',
            'id' => (int) $e['id'],
            'authorId' => (int) $e['authorId'],
            'author' => $author ? publicUser($author) : null,
            'title' => $e['title'],
            'content' => $e['description'],
            'startDate' => $e['startDate'],
            'endDate' => $e['endDate'] ?? $e['startDate'],
            'locationType' => $e['locationType'] ?? 'physical',
            'location' => $e['location'] ?? null,
            'likeCount' => $e['likeCount'] ?? 0,
            'createdAt' => $e['createdAt'],
        ];
    }

    return $items;
}

$segments = getPathSegments();
$profileFeed = ($segments[0] ?? '') === 'users' && ($segments[2] ?? '') === 'feed';
$authorId = $profileFeed && isset($segments[1]) ? (int) $segments[1] : null;

$algorithm = $_GET['algorithm'] ?? 'newest';
$typesParam = $_GET['types'] ?? '';
$types = $typesParam ? explode(',', $typesParam) : ['user_post', 'org_post', 'position', 'event'];
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = max(1, min(50, (int) ($_GET['perPage'] ?? 10)));
$lat = isset($_GET['lat']) ? (float) $_GET['lat'] : null;
$lng = isset($_GET['lng']) ? (float) $_GET['lng'] : null;
$positionsOnly = ($_GET['positionsOnly'] ?? '') === '1';

$items = buildFeedItems($authorId);

if ($positionsOnly) {
    $items = array_values(array_filter($items, fn($i) => $i['feedType'] === 'position'));
} else {
    $items = array_values(array_filter($items, fn($i) => in_array($i['feedType'], $types, true)));
}

if ($algorithm === 'following') {
    $userId = currentUserId();
    if ($userId !== null) {
        $follows = readJson('follows.json');
        $followingIds = [];
        foreach ($follows as $f) {
            if ((int) $f['followerId'] === $userId) {
                $followingIds[] = (int) $f['followingId'];
            }
        }
        $items = array_values(array_filter($items, fn($i) => in_array($i['authorId'], $followingIds, true)));
    }
}

if ($algorithm === 'only_remote') {
    $items = array_values(array_filter($items, fn($i) =>
        ($i['feedType'] === 'position' && !empty($i['remote'])) ||
        ($i['feedType'] === 'event' && ($i['locationType'] ?? '') === 'online')
    ));
}

if ($algorithm === 'most_liked') {
    usort($items, function ($a, $b) {
        $lc = ($b['likeCount'] ?? 0) <=> ($a['likeCount'] ?? 0);
        return $lc !== 0 ? $lc : strcmp($b['createdAt'], $a['createdAt']);
    });
} elseif ($algorithm === 'by_location') {
    $refLat = $lat;
    $refLng = $lng;
    if ($refLat === null || $refLng === null) {
        $userId = currentUserId();
        if ($userId !== null) {
            $users = readJson('users.json');
            $user = findUser($users, $userId);
            if ($user && !empty($user['location']['lat']) && !empty($user['location']['lng'])) {
                $refLat = (float) $user['location']['lat'];
                $refLng = (float) $user['location']['lng'];
            }
        }
    }
    if ($refLat !== null && $refLng !== null) {
        foreach ($items as &$item) {
            $loc = $item['location'] ?? null;
            if ($loc && isset($loc['lat'], $loc['lng'])) {
                $item['_distance'] = haversineKm($refLat, $refLng, (float) $loc['lat'], (float) $loc['lng']);
            } else {
                $item['_distance'] = 99999;
            }
        }
        unset($item);
        usort($items, fn($a, $b) => ($a['_distance'] ?? 99999) <=> ($b['_distance'] ?? 99999));
    } else {
        usort($items, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
    }
} else {
    usort($items, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
}

$totalItems = count($items);
$totalPages = max(1, (int) ceil($totalItems / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;
$paged = array_slice($items, $offset, $perPage);

jsonResponse([
    'items' => $paged,
    'page' => $page,
    'perPage' => $perPage,
    'totalPages' => $totalPages,
    'totalItems' => $totalItems,
]);
