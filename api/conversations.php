<?php
/**
 * Conversations API — private direct and group messaging.
 *
 * Routes: GET/POST /conversations, GET /conversations/{id},
 * GET/POST /conversations/{id}/messages, POST /conversations/{id}/read
 */
require_once __DIR__ . '/config.php';

const MAX_GROUP_SIZE = 20;
const MAX_MESSAGE_LENGTH = 2000;
const PREVIEW_LENGTH = 120;

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

/**
 * Build a unique key for an account reference.
 *
 * @param string $accountType
 * @param int $accountId
 * @return string
 */
function accountKey(string $accountType, int $accountId): string {
    return $accountType . ':' . $accountId;
}

/**
 * Find a conversation by id.
 *
 * @param array<int, array<string, mixed>> $conversations
 * @param int $conversationId
 * @return array{idx: int, record: array<string, mixed>}|null
 */
function findConversation(array $conversations, int $conversationId): ?array {
    foreach ($conversations as $i => $conversation) {
        if ((int) $conversation['id'] === $conversationId) {
            return ['idx' => $i, 'record' => $conversation];
        }
    }
    return null;
}

/**
 * Get participant rows for a conversation.
 *
 * @param array<int, array<string, mixed>> $participants
 * @param int $conversationId
 * @return array<int, array<string, mixed>>
 */
function participantsForConversation(array $participants, int $conversationId): array {
    return array_values(array_filter(
        $participants,
        fn($p) => (int) $p['conversationId'] === $conversationId
    ));
}

/**
 * Get participant row for an account in a conversation.
 *
 * @param array<int, array<string, mixed>> $participants
 * @param int $conversationId
 * @param string $accountType
 * @param int $accountId
 * @return array<string, mixed>|null
 */
function findParticipant(array $participants, int $conversationId, string $accountType, int $accountId): ?array {
    foreach ($participants as $p) {
        if ((int) $p['conversationId'] === $conversationId
            && ($p['accountType'] ?? 'user') === $accountType
            && (int) $p['accountId'] === $accountId) {
            return $p;
        }
    }
    return null;
}

/**
 * Require that the account is a participant; exit with 403 otherwise.
 *
 * @param array<int, array<string, mixed>> $participants
 * @param int $conversationId
 * @param string $accountType
 * @param int $accountId
 * @return array<string, mixed>
 */
function requireParticipant(array $participants, int $conversationId, string $accountType, int $accountId): array {
    $participant = findParticipant($participants, $conversationId, $accountType, $accountId);
    if ($participant === null) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
    return $participant;
}

/**
 * Build public participant list with account details.
 *
 * @param array<int, array<string, mixed>> $rows
 * @return array<int, array<string, mixed>>
 */
function publicParticipants(array $rows): array {
    $result = [];
    foreach ($rows as $row) {
        $type = $row['accountType'] ?? 'user';
        $accountId = (int) $row['accountId'];
        $record = resolveAccount($type, $accountId);
        if ($record === null) {
            continue;
        }
        $result[] = [
            ...publicAccount($type, $record),
            'role' => $row['role'] ?? 'member',
            'joinedAt' => $row['joinedAt'],
        ];
    }
    return $result;
}

/**
 * Count unread messages for a participant.
 *
 * @param array<int, array<string, mixed>> $messages
 * @param int $conversationId
 * @param array<string, mixed> $participant
 * @return int
 */
function unreadCount(array $messages, int $conversationId, array $participant): int {
    $lastReadAt = $participant['lastReadAt'] ?? null;
    $count = 0;
    foreach ($messages as $message) {
        if ((int) $message['conversationId'] !== $conversationId) {
            continue;
        }
        if ($lastReadAt === null || strcmp($message['createdAt'], $lastReadAt) > 0) {
            $count++;
        }
    }
    return $count;
}

/**
 * Build display name for inbox list.
 *
 * @param array<string, mixed> $conversation
 * @param array<int, array<string, mixed>> $participantRows
 * @param string $currentType
 * @param int $currentId
 * @return string
 */
function conversationDisplayName(
    array $conversation,
    array $participantRows,
    string $currentType,
    int $currentId
): string {
    if (($conversation['type'] ?? '') === 'group') {
        $title = trim($conversation['title'] ?? '');
        if ($title !== '') {
            return $title;
        }
        $names = [];
        foreach ($participantRows as $row) {
            $type = $row['accountType'] ?? 'user';
            $accountId = (int) $row['accountId'];
            if ($type === $currentType && $accountId === $currentId) {
                continue;
            }
            $record = resolveAccount($type, $accountId);
            if ($record) {
                $names[] = $record['name'];
            }
        }
        if (count($names) <= 3) {
            return implode(', ', $names);
        }
        return implode(', ', array_slice($names, 0, 3)) . ' +' . (count($names) - 3);
    }

    foreach ($participantRows as $row) {
        $type = $row['accountType'] ?? 'user';
        $accountId = (int) $row['accountId'];
        if ($type !== $currentType || $accountId !== $currentId) {
            $record = resolveAccount($type, $accountId);
            return $record ? $record['name'] : '[Deleted account]';
        }
    }
    return 'Conversation';
}

/**
 * Find existing direct conversation between two accounts.
 *
 * @param array<int, array<string, mixed>> $conversations
 * @param array<int, array<string, mixed>> $participants
 * @param string $typeA
 * @param int $idA
 * @param string $typeB
 * @param int $idB
 * @return array<string, mixed>|null
 */
function findDirectConversation(
    array $conversations,
    array $participants,
    string $typeA,
    int $idA,
    string $typeB,
    int $idB
): ?array {
    $keyA = accountKey($typeA, $idA);
    $keyB = accountKey($typeB, $idB);
    foreach ($conversations as $conversation) {
        if (($conversation['type'] ?? '') !== 'direct') {
            continue;
        }
        $rows = participantsForConversation($participants, (int) $conversation['id']);
        if (count($rows) !== 2) {
            continue;
        }
        $keys = array_map(
            fn($r) => accountKey($r['accountType'] ?? 'user', (int) $r['accountId']),
            $rows
        );
        sort($keys);
        $expected = [$keyA, $keyB];
        sort($expected);
        if ($keys === $expected) {
            return $conversation;
        }
    }
    return null;
}

/**
 * Truncate message text for inbox preview.
 *
 * @param string $content
 * @return string
 */
function messagePreview(string $content): string {
    if (strlen($content) <= PREVIEW_LENGTH) {
        return $content;
    }
    return substr($content, 0, PREVIEW_LENGTH - 1) . '…';
}

/**
 * Parse participant objects from request input.
 *
 * @param array<string, mixed> $input
 * @return array<int, array{accountType: string, accountId: int}>
 */
function parseParticipantInput(array $input): array {
    $participants = $input['participants'] ?? [];
    if (!is_array($participants)) {
        return [];
    }
    $result = [];
    foreach ($participants as $p) {
        if (!is_array($p)) {
            continue;
        }
        $type = $p['accountType'] ?? '';
        $accountId = (int) ($p['accountId'] ?? 0);
        if (!in_array($type, ['user', 'organization'], true) || $accountId <= 0) {
            continue;
        }
        $key = accountKey($type, $accountId);
        $result[$key] = ['accountType' => $type, 'accountId' => $accountId];
    }
    return array_values($result);
}

/**
 * Build public author summary for a message.
 *
 * @param array<string, mixed> $message
 * @return array{id: int, name: string, type: string}|null
 */
function publicMessageAuthor(array $message): ?array {
    $authorType = $message['authorType'] ?? 'user';
    $authorId = (int) $message['authorId'];
    $author = resolveAccount($authorType, $authorId);
    if ($author === null) {
        return null;
    }
    return [
        'id' => $authorId,
        'name' => $author['name'],
        'type' => $authorType,
    ];
}

if ($id === null && method() === 'GET') {
    $auth = requireAuth();
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int) ($_GET['perPage'] ?? 20)));

    $conversations = readJson(CONVERSATIONS_JSON);
    $participants = readJson(CONVERSATION_PARTICIPANTS_JSON);
    $messages = readJson(MESSAGES_JSON);

    $mine = array_values(array_filter(
        $participants,
        fn($p) => ($p['accountType'] ?? 'user') === $auth['type']
            && (int) $p['accountId'] === $auth['id']
    ));
    $conversationIds = array_map(fn($p) => (int) $p['conversationId'], $mine);

    $items = [];
    foreach ($conversations as $conversation) {
        if (!in_array((int) $conversation['id'], $conversationIds, true)) {
            continue;
        }
        $participant = findParticipant($participants, (int) $conversation['id'], $auth['type'], $auth['id']);
        if ($participant === null) {
            continue;
        }
        $rows = participantsForConversation($participants, (int) $conversation['id']);
        $items[] = [
            'id' => (int) $conversation['id'],
            'type' => $conversation['type'],
            'title' => $conversation['title'] ?? null,
            'displayName' => conversationDisplayName($conversation, $rows, $auth['type'], $auth['id']),
            'participants' => publicParticipants($rows),
            'lastMessagePreview' => $conversation['lastMessagePreview'] ?? '',
            'updatedAt' => $conversation['updatedAt'],
            'unreadCount' => unreadCount($messages, (int) $conversation['id'], $participant),
        ];
    }

    usort($items, fn($a, $b) => strcmp($b['updatedAt'], $a['updatedAt']));
    $totalItems = count($items);
    $totalPages = max(1, (int) ceil($totalItems / $perPage));
    $offset = ($page - 1) * $perPage;
    $paged = array_slice($items, $offset, $perPage);

    jsonResponse([
        'items' => $paged,
        'page' => $page,
        'perPage' => $perPage,
        'totalPages' => $totalPages,
        'totalItems' => $totalItems,
        'totalUnread' => array_sum(array_column($items, 'unreadCount')),
    ]);
    exit;
}

if ($id === null && method() === 'POST') {
    $auth = requireAuth();
    $input = getJsonInput();
    $type = $input['type'] ?? '';
    $participantList = parseParticipantInput($input);
    $title = trim($input['title'] ?? '');

    if (!in_array($type, ['direct', 'group'], true)) {
        jsonResponse(['error' => 'type must be direct or group'], 400);
        exit;
    }

    foreach ($participantList as $p) {
        if ($p['accountType'] === $auth['type'] && $p['accountId'] === $auth['id']) {
            jsonResponse(['error' => 'Cannot include yourself in participants'], 400);
            exit;
        }
        if (resolveAccount($p['accountType'], $p['accountId']) === null) {
            jsonResponse(['error' => 'Participant not found'], 404);
            exit;
        }
    }

    $conversations = readJson(CONVERSATIONS_JSON);
    $participants = readJson(CONVERSATION_PARTICIPANTS_JSON);
    $now = date('c');

    if ($type === 'direct') {
        if (count($participantList) !== 1) {
            jsonResponse(['error' => 'Direct conversations require exactly one other participant'], 400);
            exit;
        }
        $other = $participantList[0];
        $existing = findDirectConversation(
            $conversations,
            $participants,
            $auth['type'],
            $auth['id'],
            $other['accountType'],
            $other['accountId']
        );
        if ($existing !== null) {
            $rows = participantsForConversation($participants, (int) $existing['id']);
            jsonResponse([
                ...$existing,
                'participants' => publicParticipants($rows),
                'displayName' => conversationDisplayName($existing, $rows, $auth['type'], $auth['id']),
            ]);
            exit;
        }

        $conversation = [
            'id' => nextId($conversations),
            'type' => 'direct',
            'createdByType' => $auth['type'],
            'createdBy' => $auth['id'],
            'createdAt' => $now,
            'updatedAt' => $now,
            'lastMessagePreview' => '',
        ];
        $conversations[] = $conversation;
        writeJson(CONVERSATIONS_JSON, $conversations);

        $members = [
            ['accountType' => $auth['type'], 'accountId' => $auth['id']],
            $other,
        ];
        foreach ($members as $member) {
            $participants[] = [
                'conversationId' => $conversation['id'],
                'accountType' => $member['accountType'],
                'accountId' => $member['accountId'],
                'joinedAt' => $now,
                'role' => 'member',
            ];
        }
        writeJson(CONVERSATION_PARTICIPANTS_JSON, $participants);

        $rows = participantsForConversation($participants, (int) $conversation['id']);
        jsonResponse([
            ...$conversation,
            'participants' => publicParticipants($rows),
            'displayName' => conversationDisplayName($conversation, $rows, $auth['type'], $auth['id']),
        ], 201);
        exit;
    }

    $allMembers = [
        ['accountType' => $auth['type'], 'accountId' => $auth['id']],
        ...$participantList,
    ];
    $unique = [];
    foreach ($allMembers as $member) {
        $unique[accountKey($member['accountType'], $member['accountId'])] = $member;
    }
    $allMembers = array_values($unique);

    if (count($allMembers) < 3) {
        jsonResponse(['error' => 'Group conversations require at least 3 participants'], 400);
        exit;
    }
    if (count($allMembers) > MAX_GROUP_SIZE) {
        jsonResponse(['error' => 'Group conversations allow at most ' . MAX_GROUP_SIZE . ' participants'], 400);
        exit;
    }

    $conversation = [
        'id' => nextId($conversations),
        'type' => 'group',
        'title' => $title !== '' ? $title : null,
        'createdByType' => $auth['type'],
        'createdBy' => $auth['id'],
        'createdAt' => $now,
        'updatedAt' => $now,
        'lastMessagePreview' => '',
    ];
    $conversations[] = $conversation;
    writeJson(CONVERSATIONS_JSON, $conversations);

    foreach ($allMembers as $member) {
        $isCreator = $member['accountType'] === $auth['type'] && $member['accountId'] === $auth['id'];
        $participants[] = [
            'conversationId' => $conversation['id'],
            'accountType' => $member['accountType'],
            'accountId' => $member['accountId'],
            'joinedAt' => $now,
            'role' => $isCreator ? 'admin' : 'member',
        ];
    }
    writeJson(CONVERSATION_PARTICIPANTS_JSON, $participants);

    $rows = participantsForConversation($participants, (int) $conversation['id']);
    jsonResponse([
        ...$conversation,
        'participants' => publicParticipants($rows),
        'displayName' => conversationDisplayName($conversation, $rows, $auth['type'], $auth['id']),
    ], 201);
    exit;
}

if ($id !== null && $sub === '' && method() === 'GET') {
    $auth = requireAuth();
    $conversations = readJson(CONVERSATIONS_JSON);
    $participants = readJson(CONVERSATION_PARTICIPANTS_JSON);

    $found = findConversation($conversations, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Conversation not found'], 404);
        exit;
    }

    requireParticipant($participants, $id, $auth['type'], $auth['id']);
    $rows = participantsForConversation($participants, $id);
    $conversation = $found['record'];

    jsonResponse([
        ...$conversation,
        'displayName' => conversationDisplayName($conversation, $rows, $auth['type'], $auth['id']),
        'participants' => publicParticipants($rows),
    ]);
    exit;
}

if ($id !== null && $sub === 'messages' && method() === 'GET') {
    $auth = requireAuth();
    $conversations = readJson(CONVERSATIONS_JSON);
    $participants = readJson(CONVERSATION_PARTICIPANTS_JSON);
    $messages = readJson(MESSAGES_JSON);

    if (findConversation($conversations, $id) === null) {
        jsonResponse(['error' => 'Conversation not found'], 404);
        exit;
    }
    requireParticipant($participants, $id, $auth['type'], $auth['id']);

    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int) ($_GET['perPage'] ?? 50)));

    $filtered = array_values(array_filter(
        $messages,
        fn($m) => (int) $m['conversationId'] === $id
    ));
    usort($filtered, fn($a, $b) => strcmp($a['createdAt'], $b['createdAt']));

    $totalItems = count($filtered);
    $totalPages = max(1, (int) ceil($totalItems / $perPage));
    $offset = ($page - 1) * $perPage;
    $paged = array_slice($filtered, $offset, $perPage);

    $result = [];
    foreach ($paged as $message) {
        $result[] = [
            ...$message,
            'author' => publicMessageAuthor($message),
        ];
    }

    jsonResponse([
        'items' => $result,
        'page' => $page,
        'perPage' => $perPage,
        'totalPages' => $totalPages,
        'totalItems' => $totalItems,
    ]);
    exit;
}

if ($id !== null && $sub === 'messages' && method() === 'POST') {
    $auth = requireAuth();
    $input = getJsonInput();
    $content = trim($input['content'] ?? '');

    if ($content === '') {
        jsonResponse(['error' => 'content required'], 400);
        exit;
    }
    if (strlen($content) > MAX_MESSAGE_LENGTH) {
        jsonResponse(['error' => 'Message too long'], 400);
        exit;
    }

    $conversations = readJson(CONVERSATIONS_JSON);
    $participants = readJson(CONVERSATION_PARTICIPANTS_JSON);
    $messages = readJson(MESSAGES_JSON);

    $found = findConversation($conversations, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Conversation not found'], 404);
        exit;
    }
    requireParticipant($participants, $id, $auth['type'], $auth['id']);

    $now = date('c');
    $message = [
        'id' => nextId($messages),
        'conversationId' => $id,
        'authorType' => $auth['type'],
        'authorId' => $auth['id'],
        'content' => $content,
        'createdAt' => $now,
    ];
    $messages[] = $message;
    writeJson(MESSAGES_JSON, $messages);

    $conversations[$found['idx']]['updatedAt'] = $now;
    $conversations[$found['idx']]['lastMessagePreview'] = messagePreview($content);
    writeJson(CONVERSATIONS_JSON, $conversations);

    jsonResponse([
        ...$message,
        'author' => publicMessageAuthor($message),
    ], 201);
    exit;
}

if ($id !== null && $sub === 'read' && method() === 'POST') {
    $auth = requireAuth();
    $conversations = readJson(CONVERSATIONS_JSON);
    $participants = readJson(CONVERSATION_PARTICIPANTS_JSON);

    if (findConversation($conversations, $id) === null) {
        jsonResponse(['error' => 'Conversation not found'], 404);
        exit;
    }
    requireParticipant($participants, $id, $auth['type'], $auth['id']);

    $now = date('c');
    foreach ($participants as $i => $participant) {
        if ((int) $participant['conversationId'] === $id
            && ($participant['accountType'] ?? 'user') === $auth['type']
            && (int) $participant['accountId'] === $auth['id']) {
            $participants[$i]['lastReadAt'] = $now;
            break;
        }
    }
    writeJson(CONVERSATION_PARTICIPANTS_JSON, $participants);
    jsonResponse(['lastReadAt' => $now]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
