<?php
define('DATA_DIR', dirname(__DIR__) . '/data/');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Send JSON response with CORS headers.
 *
 * @param mixed $data Data to encode as JSON
 * @param int $code HTTP status code
 */
function jsonResponse(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    echo json_encode($data);
}

/**
 * Read and decode a JSON file from the data directory.
 *
 * @param string $file Filename (e.g. 'users.json')
 * @return array<int|string, mixed>
 */
function readJson(string $file): array {
    $path = DATA_DIR . $file;
    if (!file_exists($path)) return [];
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Encode data as JSON and write to a file in the data directory.
 *
 * @param string $file Filename
 * @param mixed $data Data to encode
 */
function writeJson(string $file, mixed $data): void {
    $path = DATA_DIR . $file;
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * Read and decode JSON from the request body.
 *
 * @return array<string, mixed>
 */
function getJsonInput(): array {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

/**
 * Generate next integer ID for a JSON array.
 *
 * @param array<int, array<string, mixed>> $items
 * @return int
 */
function nextId(array $items): int {
    $max = 0;
    foreach ($items as $item) {
        if (isset($item['id']) && $item['id'] > $max) {
            $max = (int) $item['id'];
        }
    }
    return $max + 1;
}

/**
 * Get current authenticated user ID from session.
 *
 * @return int|null User ID when logged in, null otherwise
 */
function currentUserId(): ?int {
    return isset($_SESSION['userId']) ? (int) $_SESSION['userId'] : null;
}

/**
 * Require authentication; returns user ID or sends 401 and exits.
 *
 * @return int Authenticated user ID
 */
function requireAuth(): int {
    $id = currentUserId();
    if ($id === null) {
        jsonResponse(['error' => 'Authentication required'], 401);
        exit;
    }
    return $id;
}

/**
 * Find user by ID.
 *
 * @param array<int, array<string, mixed>> $users
 * @param int $id
 * @return array<string, mixed>|null
 */
function findUser(array $users, int $id): ?array {
    foreach ($users as $user) {
        if ((int) $user['id'] === $id) return $user;
    }
    return null;
}

/**
 * Strip sensitive fields from user record for API output.
 *
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 */
function publicUser(array $user): array {
    unset($user['passwordHash']);
    return $user;
}

/**
 * Haversine distance in km between two lat/lng points.
 *
 * @param float $lat1 Latitude of first point
 * @param float $lng1 Longitude of first point
 * @param float $lat2 Latitude of second point
 * @param float $lng2 Longitude of second point
 * @return float Distance in kilometres
 */
function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float {
    $r = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
}

/**
 * Parse request path segments from router.
 *
 * @return array<int, string>
 */
function getPathSegments(): array {
    $path = isset($_GET['path']) ? trim($_GET['path'], '/') : '';
    return $path ? explode('/', $path) : [];
}

/**
 * Get HTTP request method.
 *
 * @return string Uppercase method name (e.g. GET, POST)
 */
function method(): string {
    return $_SERVER['REQUEST_METHOD'];
}
