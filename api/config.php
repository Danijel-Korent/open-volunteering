<?php
define('DATA_DIR', dirname(__DIR__) . '/data/');
define('UPLOADS_DIR', DATA_DIR . 'uploads/');
define('FILES_JSON', 'files.json');
define('MAX_UPLOAD_BYTES', 2 * 1024 * 1024);

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

/**
 * Public API-relative URL for file binary content.
 *
 * @param int $id File id
 * @return string
 */
function fileContentUrl(int $id): string {
    return 'files/' . $id . '/content';
}

/**
 * Find a stored file record by id.
 *
 * @param array<int, array<string, mixed>> $files
 * @param int $id
 * @return array{idx: int, record: array<string, mixed>}|null
 */
function findFileRecord(array $files, int $id): ?array {
    foreach ($files as $i => $file) {
        if ((int) $file['id'] === $id) {
            return ['idx' => $i, 'record' => $file];
        }
    }
    return null;
}

/**
 * Build API response shape for a stored file.
 *
 * @param array<string, mixed> $file
 * @return array<string, mixed>
 */
function publicFile(array $file): array {
    $id = (int) $file['id'];
    return [
        'id' => $id,
        'ownerId' => (int) $file['ownerId'],
        'originalName' => $file['originalName'],
        'mimeType' => $file['mimeType'],
        'byteSize' => (int) $file['byteSize'],
        'width' => (int) $file['width'],
        'height' => (int) $file['height'],
        'createdAt' => $file['createdAt'],
        'url' => fileContentUrl($id),
        'attachedTo' => $file['attachedTo'] ?? null,
    ];
}

/**
 * Absolute path to a stored file blob on disk.
 *
 * @param array<string, mixed> $file
 * @return string
 */
function fileBlobPath(array $file): string {
    return UPLOADS_DIR . $file['storedName'];
}

/**
 * Delete a file record and its blob from disk.
 *
 * @param int $fileId
 */
function deleteStoredFile(int $fileId): void {
    $files = readJson(FILES_JSON);
    $found = findFileRecord($files, $fileId);
    if ($found === null) {
        return;
    }
    $blob = fileBlobPath($found['record']);
    if (is_file($blob)) {
        unlink($blob);
    }
    array_splice($files, $found['idx'], 1);
    writeJson(FILES_JSON, array_values($files));
}

/**
 * Ensure the uploads directory exists.
 */
function ensureUploadsDir(): void {
    if (!is_dir(UPLOADS_DIR)) {
        mkdir(UPLOADS_DIR, 0755, true);
    }
}

/**
 * Validate an uploaded image and return normalized metadata.
 *
 * @param array<string, mixed> $upload $_FILES entry
 * @return array{ext: string, mimeType: string, byteSize: int, width: int, height: int, tmpPath: string}|null
 */
function validateImageUpload(array $upload): ?array {
    if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return null;
    }
    $tmpPath = $upload['tmp_name'] ?? '';
    if (!$tmpPath || !is_uploaded_file($tmpPath)) {
        return null;
    }
    $byteSize = (int) ($upload['size'] ?? 0);
    if ($byteSize <= 0 || $byteSize > MAX_UPLOAD_BYTES) {
        return null;
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($tmpPath) ?: '';
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!isset($allowed[$mimeType])) {
        return null;
    }

    $info = @getimagesize($tmpPath);
    if ($info === false || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
        return null;
    }

    return [
        'ext' => $allowed[$mimeType],
        'mimeType' => $mimeType,
        'byteSize' => $byteSize,
        'width' => (int) $info[0],
        'height' => (int) $info[1],
        'tmpPath' => $tmpPath,
    ];
}

/**
 * Verify the current user may attach a file they own.
 *
 * @param int $fileId
 * @param int $userId
 * @return array{idx: int, record: array<string, mixed>} Sends JSON error and exits when invalid
 */
function requireAttachableFile(int $fileId, int $userId): array {
    $files = readJson(FILES_JSON);
    $found = findFileRecord($files, $fileId);
    if ($found === null) {
        jsonResponse(['error' => 'File not found'], 404);
        exit;
    }
    if ((int) $found['record']['ownerId'] !== $userId) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
    if (!empty($found['record']['attachedTo'])) {
        jsonResponse(['error' => 'File is already attached'], 400);
        exit;
    }
    return $found;
}

/**
 * Mark a file as attached to a parent entity.
 *
 * @param int $fileId
 * @param string $type post|user
 * @param int $parentId
 */
function attachFileTo(int $fileId, string $type, int $parentId): void {
    $files = readJson(FILES_JSON);
    $found = findFileRecord($files, $fileId);
    if ($found === null) {
        return;
    }
    $files[$found['idx']]['attachedTo'] = ['type' => $type, 'id' => $parentId];
    writeJson(FILES_JSON, $files);
}
