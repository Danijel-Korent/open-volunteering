<?php
require_once __DIR__ . '/config.php';

/**
 * Build unified feed items from posts, positions, and events.
 *
 * @param string|null $authorType When set with authorId, filter by author
 * @param int|null $authorId
 * @return array<int, array<string, mixed>>
 */
function buildFeedItems(?string $authorType = null, ?int $authorId = null): array {
    $maps = buildAuthorMaps();
    $items = [];

    foreach (readJson('posts.json') as $p) {
        $itemAuthorType = $p['authorType'] ?? 'user';
        if ($itemAuthorType === 'volunteer') {
            $itemAuthorType = 'user';
        }
        $itemAuthorId = (int) $p['authorId'];
        if ($authorType !== null && ($itemAuthorType !== $authorType || $itemAuthorId !== $authorId)) {
            continue;
        }
        $author = resolveAuthor($maps, $itemAuthorType, $itemAuthorId);
        $item = [
            'feedType' => $p['postType'],
            'id' => (int) $p['id'],
            'authorType' => $itemAuthorType,
            'authorId' => $itemAuthorId,
            'author' => $author ? publicAccount($itemAuthorType, $author) : null,
            'content' => $p['content'],
            'likeCount' => $p['likeCount'] ?? 0,
            'shareCount' => $p['shareCount'] ?? 0,
            'createdAt' => $p['createdAt'],
            'location' => $author !== null ? ($author['location'] ?? null) : null,
        ];
        if (!empty($p['imageFileId'])) {
            $imageFileId = (int) $p['imageFileId'];
            $item['imageFileId'] = $imageFileId;
            $item['imageUrl'] = fileContentUrl($imageFileId);
        }
        $items[] = $item;
    }

    foreach (readJson('positions.json') as $p) {
        $itemAuthorType = $p['authorType'] ?? 'organization';
        $itemAuthorId = (int) $p['authorId'];
        if ($authorType !== null && ($itemAuthorType !== $authorType || $itemAuthorId !== $authorId)) {
            continue;
        }
        $author = resolveAuthor($maps, $itemAuthorType, $itemAuthorId);
        $items[] = [
            'feedType' => 'position',
            'id' => (int) $p['id'],
            'authorType' => $itemAuthorType,
            'authorId' => $itemAuthorId,
            'author' => $author ? publicAccount($itemAuthorType, $author) : null,
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
        $itemAuthorType = $e['authorType'] ?? 'user';
        if ($itemAuthorType === 'volunteer') {
            $itemAuthorType = 'user';
        }
        $itemAuthorId = (int) $e['authorId'];
        if ($authorType !== null && ($itemAuthorType !== $authorType || $itemAuthorId !== $authorId)) {
            continue;
        }
        $author = resolveAuthor($maps, $itemAuthorType, $itemAuthorId);
        $items[] = [
            'feedType' => 'event',
            'id' => (int) $e['id'],
            'authorType' => $itemAuthorType,
            'authorId' => $itemAuthorId,
            'author' => $author ? publicAccount($itemAuthorType, $author) : null,
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
$profileFeedVolunteer = ($segments[0] ?? '') === 'users' && ($segments[2] ?? '') === 'feed';
$profileFeedOrg = ($segments[0] ?? '') === 'organizations' && ($segments[2] ?? '') === 'feed';
$authorType = null;
$authorId = null;
if ($profileFeedVolunteer && isset($segments[1])) {
    $authorType = 'user';
    $authorId = (int) $segments[1];
} elseif ($profileFeedOrg && isset($segments[1])) {
    $authorType = 'organization';
    $authorId = (int) $segments[1];
}

$algorithm = $_GET['algorithm'] ?? 'newest';
$typesParam = $_GET['types'] ?? '';
$types = $typesParam ? explode(',', $typesParam) : ['user_post', 'org_post', 'position', 'event'];
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = max(1, min(50, (int) ($_GET['perPage'] ?? 10)));
$lat = isset($_GET['lat']) ? (float) $_GET['lat'] : null;
$lng = isset($_GET['lng']) ? (float) $_GET['lng'] : null;
$positionsOnly = ($_GET['positionsOnly'] ?? '') === '1';

$items = buildFeedItems($authorType, $authorId);

if ($positionsOnly) {
    $items = array_values(array_filter($items, fn($i) => $i['feedType'] === 'position'));
} else {
    $items = array_values(array_filter($items, fn($i) => in_array($i['feedType'], $types, true)));
}

if ($algorithm === 'following') {
    $account = getActiveAccount();
    if ($account !== null) {
        $follows = readJson('follows.json');
        $followingKeys = [];
        foreach ($follows as $f) {
            if ($f['followerType'] === $account['type'] && (int) $f['followerId'] === $account['id']) {
                $followingKeys[] = $f['followingType'] . ':' . $f['followingId'];
            }
        }
        $items = array_values(array_filter($items, function ($i) use ($followingKeys) {
            $key = ($i['authorType'] ?? 'user') . ':' . $i['authorId'];
            if (str_starts_with($key, 'volunteer:')) {
                $key = 'user:' . substr($key, strlen('volunteer:'));
            }
            return in_array($key, $followingKeys, true);
        }));
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
        $account = getActiveAccount();
        if ($account !== null) {
            $record = $account['record'];
            if (!empty($record['location']['lat']) && !empty($record['location']['lng'])) {
                $refLat = (float) $record['location']['lat'];
                $refLng = (float) $record['location']['lng'];
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

$account = getCurrentAccount();
if ($account !== null && $account['type'] === 'user') {
    $userId = $account['id'];
    $applications = readJson('applications.json');
    $appliedIds = [];
    foreach ($applications as $a) {
        if ((int) ($a['userId'] ?? $a['volunteerId'] ?? 0) === $userId) {
            $appliedIds[] = (int) $a['positionId'];
        }
    }
    foreach ($paged as &$item) {
        if ($item['feedType'] === 'position') {
            $item['hasApplied'] = in_array((int) $item['id'], $appliedIds, true);
        }
    }
    unset($item);
}

jsonResponse([
    'items' => $paged,
    'page' => $page,
    'perPage' => $perPage,
    'totalPages' => $totalPages,
    'totalItems' => $totalItems,
]);
