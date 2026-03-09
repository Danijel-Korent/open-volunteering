<?php
/**
 * API router: parses request path and delegates to users.php or positions.php.
 * Handles CORS preflight (OPTIONS). Returns 404 for unknown routes.
 */
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

$path = isset($_GET['path']) ? trim($_GET['path'], '/') : '';
$segments = $path ? explode('/', $path) : [];

// Route: /api/users or /api/users/{id}
if ($segments[0] === 'users') {
    require __DIR__ . '/users.php';
    exit;
}

// Route: /api/positions or /api/positions/{id} or /api/positions/{id}/comments
if ($segments[0] === 'positions') {
    require __DIR__ . '/positions.php';
    exit;
}

// Route: /api/comments (for POST to positions/{id}/comments - handled in positions.php)
jsonResponse(['error' => 'Not found'], 404);
