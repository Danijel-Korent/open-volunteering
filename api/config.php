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

define('VOLUNTEERS_JSON', 'users.json');
define('ORGANIZATIONS_JSON', 'organizations.json');

/**
 * Read all volunteer records.
 *
 * @return array<int, array<string, mixed>>
 */
function readVolunteers(): array {
    return readJson(VOLUNTEERS_JSON);
}

/**
 * Read all organization records.
 *
 * @return array<int, array<string, mixed>>
 */
function readOrganizations(): array {
    return readJson(ORGANIZATIONS_JSON);
}

/**
 * Get current authenticated account from session.
 *
 * @return array{type: string, id: int, record: array<string, mixed>}|null
 */
function getCurrentAccount(): ?array {
    $type = $_SESSION['accountType'] ?? null;
    $id = isset($_SESSION['accountId']) ? (int) $_SESSION['accountId'] : null;
    if (!in_array($type, ['volunteer', 'organization'], true) || $id === null) {
        return null;
    }
    $record = resolveAccount($type, $id);
    if ($record === null) {
        return null;
    }
    return ['type' => $type, 'id' => $id, 'record' => $record];
}

/**
 * Set session for a volunteer or organization account.
 *
 * @param string $type volunteer|organization
 * @param int $id
 */
function setCurrentAccount(string $type, int $id): void {
    $_SESSION['accountType'] = $type;
    $_SESSION['accountId'] = $id;
    unset($_SESSION['userId']);
}

/**
 * Get current authenticated account ID from session (legacy helper).
 *
 * @return int|null Account ID when logged in, null otherwise
 */
function currentUserId(): ?int {
    $account = getCurrentAccount();
    return $account !== null ? $account['id'] : null;
}

/**
 * Get current authenticated account type from session.
 *
 * @return string|null volunteer|organization
 */
function currentAccountType(): ?string {
    $account = getCurrentAccount();
    return $account !== null ? $account['type'] : null;
}

/**
 * Require authentication; returns account type and ID or sends 401 and exits.
 *
 * @return array{type: string, id: int}
 */
function requireAuth(): array {
    $account = getCurrentAccount();
    if ($account === null) {
        jsonResponse(['error' => 'Authentication required'], 401);
        exit;
    }
    return ['type' => $account['type'], 'id' => $account['id']];
}

/**
 * Find volunteer by ID.
 *
 * @param array<int, array<string, mixed>> $users
 * @param int $id
 * @return array<string, mixed>|null
 */
function findVolunteer(array $users, int $id): ?array {
    foreach ($users as $user) {
        if ((int) $user['id'] === $id) {
            return $user;
        }
    }
    return null;
}

/**
 * Find organization by ID.
 *
 * @param array<int, array<string, mixed>> $orgs
 * @param int $id
 * @return array<string, mixed>|null
 */
function findOrganization(array $orgs, int $id): ?array {
    foreach ($orgs as $org) {
        if ((int) $org['id'] === $id) {
            return $org;
        }
    }
    return null;
}

/**
 * @alias findVolunteer
 * @param array<int, array<string, mixed>> $users
 * @param int $id
 * @return array<string, mixed>|null
 */
function findUser(array $users, int $id): ?array {
    return findVolunteer($users, $id);
}

/**
 * Resolve a volunteer or organization record by type and ID.
 *
 * @param string $type volunteer|organization
 * @param int $id
 * @return array<string, mixed>|null
 */
function resolveAccount(string $type, int $id): ?array {
    if ($type === 'volunteer') {
        return findVolunteer(readVolunteers(), $id);
    }
    if ($type === 'organization') {
        return findOrganization(readOrganizations(), $id);
    }
    return null;
}

/**
 * Strip sensitive fields and add type for volunteer API output.
 *
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 */
function publicVolunteer(array $user): array {
    unset($user['passwordHash']);
    $user['type'] = 'volunteer';
    return $user;
}

/**
 * Strip sensitive fields and add type for organization API output.
 *
 * @param array<string, mixed> $org
 * @return array<string, mixed>
 */
function publicOrganization(array $org): array {
    unset($org['passwordHash']);
    $org['type'] = 'organization';
    return $org;
}

/**
 * Strip sensitive fields from account record for API output.
 *
 * @param string $type volunteer|organization
 * @param array<string, mixed> $record
 * @return array<string, mixed>
 */
function publicAccount(string $type, array $record): array {
    return $type === 'organization' ? publicOrganization($record) : publicVolunteer($record);
}

/**
 * @alias publicVolunteer
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 */
function publicUser(array $user): array {
    return publicVolunteer($user);
}

/**
 * Build lookup maps for authors keyed by "type:id".
 *
 * @return array{volunteers: array<int, array<string, mixed>>, organizations: array<int, array<string, mixed>>}
 */
function buildAuthorMaps(): array {
    $volunteers = [];
    foreach (readVolunteers() as $u) {
        $volunteers[(int) $u['id']] = $u;
    }
    $organizations = [];
    foreach (readOrganizations() as $o) {
        $organizations[(int) $o['id']] = $o;
    }
    return ['volunteers' => $volunteers, 'organizations' => $organizations];
}

/**
 * Resolve author record from authorType and authorId fields.
 *
 * @param array{volunteers: array<int, array<string, mixed>>, organizations: array<int, array<string, mixed>>} $maps
 * @param string $authorType
 * @param int $authorId
 * @return array<string, mixed>|null
 */
function resolveAuthor(array $maps, string $authorType, int $authorId): ?array {
    if ($authorType === 'organization') {
        return $maps['organizations'][$authorId] ?? null;
    }
    return $maps['volunteers'][$authorId] ?? null;
}

/**
 * Check whether a display name is already taken by a volunteer or organization.
 *
 * @param string $name
 * @return bool
 */
function isNameTaken(string $name): bool {
    foreach (readVolunteers() as $u) {
        if (strcasecmp($u['name'], $name) === 0) {
            return true;
        }
    }
    foreach (readOrganizations() as $o) {
        if (strcasecmp($o['name'], $name) === 0) {
            return true;
        }
    }
    return false;
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
        'ownerType' => $file['ownerType'] ?? 'volunteer',
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
 * @param string $ownerType volunteer|organization
 * @param int $ownerId
 * @return array{idx: int, record: array<string, mixed>} Sends JSON error and exits when invalid
 */
function requireAttachableFile(int $fileId, string $ownerType, int $ownerId): array {
    $files = readJson(FILES_JSON);
    $found = findFileRecord($files, $fileId);
    if ($found === null) {
        jsonResponse(['error' => 'File not found'], 404);
        exit;
    }
    $recordOwnerType = $found['record']['ownerType'] ?? 'volunteer';
    if ($recordOwnerType !== $ownerType || (int) $found['record']['ownerId'] !== $ownerId) {
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
 * @param string $type post|user|organization
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
