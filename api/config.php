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
    if (str_starts_with($raw, "\xEF\xBB\xBF")) {
        $raw = substr($raw, 3);
    }
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
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
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

define('USERS_JSON', 'users.json');
define('ORGANIZATIONS_JSON', 'organizations.json');
define('ORGANIZATION_MEMBERS_JSON', 'organization_members.json');

define('POSTS_JSON', 'content/posts.json');
define('POSITIONS_JSON', 'content/positions.json');
define('EVENTS_JSON', 'content/events.json');
define('PROJECTS_JSON', 'content/projects.json');
define('PROJECT_POSTS_JSON', 'content/project_posts.json');
define('COMMENTS_JSON', 'content/comments.json');

define('FOLLOWS_JSON', 'social/follows.json');
define('APPLICATIONS_JSON', 'social/applications.json');
define('EVENT_RSVPS_JSON', 'social/event_rsvps.json');
define('SUBSCRIPTIONS_JSON', 'social/subscriptions.json');
define('AVAILABILITY_JSON', 'social/availability.json');
define('NOTIFICATIONS_JSON', 'social/notifications.json');

define('CONVERSATIONS_JSON', 'messaging/conversations.json');
define('CONVERSATION_PARTICIPANTS_JSON', 'messaging/conversation_participants.json');
define('MESSAGES_JSON', 'messaging/messages.json');

/** @deprecated Use USERS_JSON */
define('VOLUNTEERS_JSON', USERS_JSON);

/**
 * Read all user records.
 *
 * @return array<int, array<string, mixed>>
 */
function readUsers(): array {
    return readJson(USERS_JSON);
}

/**
 * @return array<int, array<string, mixed>>
 * @deprecated Use readUsers()
 */
function readVolunteers(): array {
    return readUsers();
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
 * Read organization membership records.
 *
 * @return array<int, array<string, mixed>>
 */
function readOrganizationMembers(): array {
    return readJson(ORGANIZATION_MEMBERS_JSON);
}

/**
 * Write organization membership records.
 *
 * @param array<int, array<string, mixed>> $members
 */
function writeOrganizationMembers(array $members): void {
    writeJson(ORGANIZATION_MEMBERS_JSON, $members);
}

/**
 * Get logged-in user id from session (always set after login).
 *
 * @return int|null
 */
function getSessionUserId(): ?int {
    return isset($_SESSION['userId']) ? (int) $_SESSION['userId'] : null;
}

/**
 * Get active account context from session.
 *
 * @return array{type: string, id: int, record: array<string, mixed>}|null
 */
function getActiveAccount(): ?array {
    $type = $_SESSION['activeAccountType'] ?? null;
    $id = isset($_SESSION['activeAccountId']) ? (int) $_SESSION['activeAccountId'] : null;
    if (!in_array($type, ['user', 'organization'], true) || $id === null) {
        return null;
    }
    $record = resolveAccount($type, $id);
    if ($record === null) {
        return null;
    }
    return ['type' => $type, 'id' => $id, 'record' => $record];
}

/**
 * @return array{type: string, id: int, record: array<string, mixed>}|null
 * @deprecated Use getActiveAccount()
 */
function getCurrentAccount(): ?array {
    return getActiveAccount();
}

/**
 * Set active account context; preserves session userId.
 *
 * @param string $type user|organization
 * @param int $id
 */
function setActiveAccount(string $type, int $id): void {
    $_SESSION['activeAccountType'] = $type;
    $_SESSION['activeAccountId'] = $id;
}

/**
 * Start a user session and set active context to the user profile.
 *
 * @param int $userId
 */
function loginUserSession(int $userId): void {
    $_SESSION['userId'] = $userId;
    setActiveAccount('user', $userId);
}

/**
 * @param string $type user|organization
 * @param int $id
 * @deprecated Use setActiveAccount()
 */
function setCurrentAccount(string $type, int $id): void {
    if ($type === 'volunteer') {
        $type = 'user';
    }
    setActiveAccount($type, $id);
}

/**
 * @return int|null
 */
function currentUserId(): ?int {
    return getSessionUserId();
}

/**
 * @return string|null user|organization
 */
function currentAccountType(): ?string {
    $account = getActiveAccount();
    return $account !== null ? $account['type'] : null;
}

/**
 * Require authentication; returns active account type and ID.
 *
 * @return array{type: string, id: int}
 */
function requireAuth(): array {
    $account = getActiveAccount();
    if ($account === null || getSessionUserId() === null) {
        jsonResponse(['error' => 'Authentication required'], 401);
        exit;
    }
    return ['type' => $account['type'], 'id' => $account['id']];
}

/**
 * Require a logged-in user session.
 *
 * @return int User id
 */
function requireUserSession(): int {
    $userId = getSessionUserId();
    if ($userId === null) {
        jsonResponse(['error' => 'Authentication required'], 401);
        exit;
    }
    return $userId;
}

/**
 * Require active org context where the logged-in user is an admin.
 *
 * @param int $orgId
 */
function requireOrgAdminSession(int $orgId): void {
    $auth = requireAuth();
    if ($auth['type'] !== 'organization' || $auth['id'] !== $orgId) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
    $userId = requireUserSession();
    if (!isOrgAdmin($userId, $orgId)) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
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
        if ((int) $user['id'] === $id) {
            return $user;
        }
    }
    return null;
}

/**
 * @param array<int, array<string, mixed>> $users
 * @param int $id
 * @return array<string, mixed>|null
 * @deprecated Use findUser()
 */
function findVolunteer(array $users, int $id): ?array {
    return findUser($users, $id);
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
 * Resolve a user or organization record by type and ID.
 *
 * @param string $type user|organization
 * @param int $id
 * @return array<string, mixed>|null
 */
function resolveAccount(string $type, int $id): ?array {
    if ($type === 'user' || $type === 'volunteer') {
        return findUser(readUsers(), $id);
    }
    if ($type === 'organization') {
        return findOrganization(readOrganizations(), $id);
    }
    return null;
}

/**
 * Strip sensitive fields and add type for user API output.
 *
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 */
function publicUser(array $user): array {
    unset($user['passwordHash']);
    $user['type'] = 'user';
    return $user;
}

/**
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 * @deprecated Use publicUser()
 */
function publicVolunteer(array $user): array {
    return publicUser($user);
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
 * @param string $type user|organization
 * @param array<string, mixed> $record
 * @return array<string, mixed>
 */
function publicAccount(string $type, array $record): array {
    if ($type === 'volunteer') {
        $type = 'user';
    }
    return $type === 'organization' ? publicOrganization($record) : publicUser($record);
}

/**
 * Build lookup maps for authors keyed by type.
 *
 * @return array{users: array<int, array<string, mixed>>, organizations: array<int, array<string, mixed>>}
 */
function buildAuthorMaps(): array {
    $users = [];
    foreach (readUsers() as $u) {
        $users[(int) $u['id']] = $u;
    }
    $organizations = [];
    foreach (readOrganizations() as $o) {
        $organizations[(int) $o['id']] = $o;
    }
    return ['users' => $users, 'organizations' => $organizations];
}

/**
 * Resolve author record from authorType and authorId fields.
 *
 * @param array{users: array<int, array<string, mixed>>, organizations: array<int, array<string, mixed>>} $maps
 * @param string $authorType
 * @param int $authorId
 * @return array<string, mixed>|null
 */
function resolveAuthor(array $maps, string $authorType, int $authorId): ?array {
    if ($authorType === 'organization') {
        return $maps['organizations'][$authorId] ?? null;
    }
    return $maps['users'][$authorId] ?? null;
}

/**
 * Get membership row for a user in an organization.
 *
 * @param int $userId
 * @param int $orgId
 * @return array<string, mixed>|null
 */
function getUserMembership(int $userId, int $orgId): ?array {
    foreach (readOrganizationMembers() as $m) {
        if ((int) $m['userId'] === $userId && (int) $m['organizationId'] === $orgId) {
            return $m;
        }
    }
    return null;
}

/**
 * @param int $userId
 * @param int $orgId
 */
function isOrgAdmin(int $userId, int $orgId): bool {
    $m = getUserMembership($userId, $orgId);
    return $m !== null && ($m['role'] ?? '') === 'admin';
}

/**
 * @param int $userId
 * @param int $orgId
 */
function isOrgMember(int $userId, int $orgId): bool {
    return getUserMembership($userId, $orgId) !== null;
}

/**
 * List org memberships for a user with org name.
 *
 * @param int $userId
 * @return array<int, array<string, mixed>>
 */
function listUserMemberships(int $userId): array {
    $orgs = readOrganizations();
    $orgById = [];
    foreach ($orgs as $o) {
        $orgById[(int) $o['id']] = $o;
    }
    $result = [];
    foreach (readOrganizationMembers() as $m) {
        if ((int) $m['userId'] !== $userId) {
            continue;
        }
        $orgId = (int) $m['organizationId'];
        $org = $orgById[$orgId] ?? null;
        $result[] = [
            'organizationId' => $orgId,
            'organizationName' => $org['name'] ?? 'Organization',
            'role' => $m['role'],
            'joinedAt' => $m['joinedAt'] ?? null,
        ];
    }
    return $result;
}

/**
 * Count admins for an organization.
 *
 * @param int $orgId
 */
function countOrgAdmins(int $orgId): int {
    $count = 0;
    foreach (readOrganizationMembers() as $m) {
        if ((int) $m['organizationId'] === $orgId && ($m['role'] ?? '') === 'admin') {
            $count++;
        }
    }
    return $count;
}

/**
 * List user IDs of admins for an organization.
 *
 * @param int $orgId
 * @return array<int, int>
 */
function listOrgAdminUserIds(int $orgId): array {
    $ids = [];
    foreach (readOrganizationMembers() as $m) {
        if ((int) $m['organizationId'] === $orgId && ($m['role'] ?? '') === 'admin') {
            $ids[] = (int) $m['userId'];
        }
    }
    return $ids;
}

/**
 * Resolve owning organization id from an availability target.
 *
 * @param string $targetType organization|post|position|event
 * @param int $targetId
 * @return int|null
 */
function resolveOrgIdFromAvailabilityTarget(string $targetType, int $targetId): ?int {
    if ($targetType === 'organization') {
        return $targetId;
    }
    if ($targetType === 'post') {
        foreach (readJson(POSTS_JSON) as $post) {
            if ((int) $post['id'] === $targetId
                && ($post['authorType'] ?? '') === 'organization') {
                return (int) $post['authorId'];
            }
        }
        return null;
    }
    if ($targetType === 'position') {
        foreach (readJson(POSITIONS_JSON) as $position) {
            if ((int) $position['id'] === $targetId
                && ($position['authorType'] ?? '') === 'organization') {
                return (int) $position['authorId'];
            }
        }
        return null;
    }
    if ($targetType === 'event') {
        foreach (readJson(EVENTS_JSON) as $event) {
            if ((int) $event['id'] === $targetId
                && ($event['authorType'] ?? '') === 'organization') {
                return (int) $event['authorId'];
            }
        }
        return null;
    }
    return null;
}

/**
 * Check whether an identical notification already exists for a recipient.
 *
 * @param array<int, array<string, mixed>> $notifications
 * @param int $recipientUserId
 * @param string $type
 * @param string $targetType
 * @param int $targetId
 * @param string $actorType
 * @param int $actorId
 */
function notificationExists(
    array $notifications,
    int $recipientUserId,
    string $type,
    string $targetType,
    int $targetId,
    string $actorType,
    int $actorId,
): bool {
    foreach ($notifications as $n) {
        if ((int) ($n['recipientUserId'] ?? 0) === $recipientUserId
            && ($n['type'] ?? '') === $type
            && ($n['targetType'] ?? '') === $targetType
            && (int) ($n['targetId'] ?? 0) === $targetId
            && ($n['actorType'] ?? '') === $actorType
            && (int) ($n['actorId'] ?? 0) === $actorId) {
            return true;
        }
    }
    return false;
}

/**
 * Create an in-app notification for a single user.
 *
 * @param int $recipientUserId
 * @param string $type post_comment|position_application|skill_offer
 * @param string $actorType user|organization
 * @param int $actorId
 * @param string $targetType
 * @param int $targetId
 * @param int|null $organizationId
 * @param string|null $organizationName
 */
function createNotificationForUser(
    int $recipientUserId,
    string $type,
    string $actorType,
    int $actorId,
    string $targetType,
    int $targetId,
    ?int $organizationId = null,
    ?string $organizationName = null,
): void {
    if ($recipientUserId <= 0) {
        return;
    }
    if ($actorType === 'user' && $actorId === $recipientUserId) {
        return;
    }

    $notifications = readJson(NOTIFICATIONS_JSON);
    if (notificationExists(
        $notifications,
        $recipientUserId,
        $type,
        $targetType,
        $targetId,
        $actorType,
        $actorId,
    )) {
        return;
    }

    $notifications[] = [
        'id' => nextId($notifications),
        'recipientUserId' => $recipientUserId,
        'type' => $type,
        'organizationId' => $organizationId,
        'organizationName' => $organizationName,
        'actorType' => $actorType,
        'actorId' => $actorId,
        'targetType' => $targetType,
        'targetId' => $targetId,
        'readAt' => null,
        'createdAt' => date('c'),
    ];
    writeJson(NOTIFICATIONS_JSON, $notifications);
}

/**
 * Create in-app notifications for all admins of an organization.
 *
 * @param int $orgId
 * @param string $type post_comment|position_application|skill_offer
 * @param string $actorType user|organization
 * @param int $actorId
 * @param string $targetType
 * @param int $targetId
 * @param int|null $excludeUserId Skip this user id (e.g. applicant or commenter)
 */
function createNotificationsForOrgAdmins(
    int $orgId,
    string $type,
    string $actorType,
    int $actorId,
    string $targetType,
    int $targetId,
    ?int $excludeUserId = null,
): void {
    $org = findOrganization(readOrganizations(), $orgId);
    if ($org === null) {
        return;
    }
    $orgName = (string) ($org['name'] ?? 'Organization');
    foreach (listOrgAdminUserIds($orgId) as $adminUserId) {
        if ($excludeUserId !== null && $adminUserId === $excludeUserId) {
            continue;
        }
        createNotificationForUser(
            $adminUserId,
            $type,
            $actorType,
            $actorId,
            $targetType,
            $targetId,
            $orgId,
            $orgName,
        );
    }
}

/**
 * Build public actor summary for a notification.
 *
 * @param array<string, mixed> $notification
 * @return array{id: int, name: string, type: string}|null
 */
function publicNotificationActor(array $notification): ?array {
    $actorType = $notification['actorType'] ?? 'user';
    if ($actorType === 'volunteer') {
        $actorType = 'user';
    }
    $actorId = (int) ($notification['actorId'] ?? 0);
    $actor = resolveAccount($actorType, $actorId);
    if ($actor === null) {
        return null;
    }
    return [
        'id' => $actorId,
        'name' => (string) ($actor['name'] ?? 'Unknown'),
        'type' => $actorType,
    ];
}

/**
 * Find a post record by id.
 *
 * @param int $postId
 * @return array<string, mixed>|null
 */
function findPostById(int $postId): ?array {
    foreach (readJson(POSTS_JSON) as $post) {
        if ((int) $post['id'] === $postId) {
            return $post;
        }
    }
    return null;
}

/**
 * Find a position record by id.
 *
 * @param int $positionId
 * @return array<string, mixed>|null
 */
function findPositionById(int $positionId): ?array {
    foreach (readJson(POSITIONS_JSON) as $position) {
        if ((int) $position['id'] === $positionId) {
            return $position;
        }
    }
    return null;
}

/**
 * Enrich a notification with message, link, and actor for API output.
 *
 * @param array<string, mixed> $notification
 * @return array<string, mixed>
 */
function enrichNotification(array $notification): array {
    $actor = publicNotificationActor($notification);
    $actorName = $actor['name'] ?? 'Someone';
    $type = $notification['type'] ?? '';
    $orgName = $notification['organizationName'] ?? null;
    $targetType = $notification['targetType'] ?? '';
    $targetId = (int) ($notification['targetId'] ?? 0);
    $message = '';
    $link = '#/feed';

    if ($type === 'post_comment' && $targetType === 'post') {
        $post = findPostById($targetId);
        if ($post !== null) {
            $authorType = $post['authorType'] ?? 'user';
            $authorId = (int) ($post['authorId'] ?? 0);
            if ($authorType === 'organization') {
                $message = "{$actorName} commented on a post";
                $link = "#/organization/{$authorId}?highlight=post-{$targetId}";
            } else {
                $message = "{$actorName} commented on your post";
                $link = "#/profile/{$authorId}?highlight=post-{$targetId}";
            }
        } else {
            $message = "{$actorName} commented on a post";
        }
    } elseif ($type === 'position_application' && $targetType === 'position') {
        $position = findPositionById($targetId);
        $title = $position !== null ? (string) ($position['title'] ?? 'a position') : 'a position';
        $orgId = (int) ($notification['organizationId'] ?? ($position['authorId'] ?? 0));
        $message = "{$actorName} applied for {$title}";
        $link = "#/organization/{$orgId}?section=applicants";
    } elseif ($type === 'skill_offer') {
        $orgId = (int) ($notification['organizationId'] ?? 0);
        $message = "{$actorName} offered skills";
        $link = "#/organization/{$orgId}?section=availability";
    }

    return [
        ...$notification,
        'message' => $message,
        'link' => $link,
        'actor' => $actor,
    ];
}

/**
 * Attach public member list to organization payload.
 *
 * @param array<string, mixed> $org
 * @return array<string, mixed>
 */
function enrichOrganizationWithMembers(array $org): array {
    $orgId = (int) $org['id'];
    $users = readUsers();
    $members = [];
    foreach (readOrganizationMembers() as $m) {
        if ((int) $m['organizationId'] !== $orgId) {
            continue;
        }
        $user = findUser($users, (int) $m['userId']);
        if ($user === null) {
            continue;
        }
        $pub = publicUser($user);
        $members[] = [
            'userId' => (int) $m['userId'],
            'role' => $m['role'],
            'joinedAt' => $m['joinedAt'] ?? null,
            'user' => [
                'id' => $pub['id'],
                'name' => $pub['name'],
                'type' => 'user',
            ],
        ];
    }
    $org['members'] = $members;
    return $org;
}

/**
 * Check whether a display name is already taken by a user or organization.
 *
 * @param string $name
 * @return bool
 */
function isNameTaken(string $name): bool {
    foreach (readUsers() as $u) {
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
        'ownerType' => $file['ownerType'] ?? 'user',
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
 * @param string $ownerType user|organization
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
    $recordOwnerType = $found['record']['ownerType'] ?? 'user';
    if ($recordOwnerType === 'volunteer') {
        $recordOwnerType = 'user';
    }
    if ($ownerType === 'volunteer') {
        $ownerType = 'user';
    }
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
