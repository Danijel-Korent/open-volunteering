<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();

if (($segments[1] ?? '') === 'markers' && method() === 'GET') {
    $markers = [];

    foreach (readVolunteers() as $u) {
        if (!empty($u['location']['lat']) && !empty($u['location']['lng'])) {
            $markers[] = [
                'type' => 'volunteer',
                'id' => (int) $u['id'],
                'name' => $u['name'],
                'lat' => (float) $u['location']['lat'],
                'lng' => (float) $u['location']['lng'],
                'label' => $u['location']['label'] ?? '',
            ];
        }
    }

    foreach (readOrganizations() as $o) {
        if (!empty($o['location']['lat']) && !empty($o['location']['lng'])) {
            $markers[] = [
                'type' => 'organization',
                'id' => (int) $o['id'],
                'name' => $o['name'],
                'lat' => (float) $o['location']['lat'],
                'lng' => (float) $o['location']['lng'],
                'label' => $o['location']['label'] ?? '',
            ];
        }
    }

    foreach (readJson('positions.json') as $p) {
        $loc = $p['location'] ?? null;
        if ($loc && isset($loc['lat'], $loc['lng'])) {
            $markers[] = [
                'type' => 'position',
                'id' => (int) $p['id'],
                'name' => $p['title'],
                'lat' => (float) $loc['lat'],
                'lng' => (float) $loc['lng'],
                'label' => $loc['label'] ?? '',
            ];
        }
    }

    foreach (readJson('events.json') as $e) {
        $loc = $e['location'] ?? null;
        if ($loc && isset($loc['lat'], $loc['lng']) && ($e['locationType'] ?? '') === 'physical') {
            $markers[] = [
                'type' => 'event',
                'id' => (int) $e['id'],
                'name' => $e['title'],
                'lat' => (float) $loc['lat'],
                'lng' => (float) $loc['lng'],
                'label' => $loc['label'] ?? '',
            ];
        }
    }

    jsonResponse($markers);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
