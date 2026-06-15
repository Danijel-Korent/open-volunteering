<?php
require_once __DIR__ . '/config.php';

if (method() === 'OPTIONS') {
    jsonResponse(null, 204);
    exit;
}

$segments = getPathSegments();
$resource = $segments[0] ?? '';

$routes = [
    'auth' => 'auth.php',
    'users' => 'users.php',
    'posts' => 'posts.php',
    'positions' => 'positions.php',
    'events' => 'events.php',
    'comments' => 'comments.php',
    'feed' => 'feed.php',
    'projects' => 'projects.php',
    'subscriptions' => 'subscriptions.php',
    'availability' => 'availability.php',
    'map' => 'map.php',
];

if (isset($routes[$resource])) {
    require __DIR__ . '/' . $routes[$resource];
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
