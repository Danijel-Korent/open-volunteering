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
 * Get participant row for a user in a conversation.
 *
 * @param array<int, array<string, mixed>> $participants
 * @param int $conversationId
 * @param int $userId
 * @return array<string, mixed>|null
 */
function findParticipant(array $participants, int $conversationId, int $userId): ?array {
    foreach ($participants as $p) {
        if ((int) $p['conversationId'] === $conversationId && (int) $p['userId'] === $userId) {
            return $p;
        }
    }
    return null;
}

/**
 * Require that the user is a participant; exit with 403 otherwise.
 *
 * @param array<int, array<string, mixed>> $participants
 * @param int $conversationId
 * @param int $userId
 * @return array<string, mixed>
 */
function requireParticipant(array $participants, int $conversationId, int $userId): array {
    $participant = findParticipant($participants, $conversationId, $userId);
    if ($participant === null) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
    return $participant;
}

/**
 * Build public participant list with user details.
 *
 * @param array<int, array<string, mixed>> $rows
 * @param array<int, array<string, mixed>> $users
 * @return array<int, array<string, mixed>>
 */
function publicParticipants(array $rows, array $users): array {
    $result = [];
    foreach ($rows as $row) {
        $user = findUser($users, (int) $row['userId']);
        if ($user === null) {
            continue;
        }
        $result[] = [
            ...publicUser($user),
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
 * @param array<int, array<string, mixed>> $users
 * @param int $currentUserId
 * @return string
 */
function conversationDisplayName(
    array $conversation,
    array $participantRows,
    array $users,
    int $currentUserId
): string {
    if (($conversation['type'] ?? '') === 'group') {
        $title = trim($conversation['title'] ?? '');
        if ($title !== '') {
            return $title;
        }
        $names = [];
        foreach ($participantRows as $row) {
            if ((int) $row['userId'] === $currentUserId) {
                continue;
            }
            $user = findUser($users, (int) $row['userId']);
            if ($user) {
                $names[] = $user['name'];
            }
        }
        if (count($names) <= 3) {
            return implode(', ', $names);
        }
        return implode(', ', array_slice($names, 0, 3)) . ' +' . (count($names) - 3);
    }

    foreach ($participantRows as $row) {
        if ((int) $row['userId'] !== $currentUserId) {
            $user = findUser($users, (int) $row['userId']);
            return $user ? $user['name'] : '[Deleted user]';
        }
    }
    return 'Conversation';
}

/**
 * Find existing direct conversation between two users.
 *
 * @param array<int, array<string, mixed>> $conversations
 * @param array<int, array<string, mixed>> $participants
 * @param int $userIdA
 * @param int $userIdB
 * @return array<string, mixed>|null
 */
function findDirectConversation(
    array $conversations,
    array $participants,
    int $userIdA,
    int $userIdB
): ?array {
    foreach ($conversations as $conversation) {
        if (($conversation['type'] ?? '') !== 'direct') {
            continue;
        }
        $rows = participantsForConversation($participants, (int) $conversation['id']);
        if (count($rows) !== 2) {
            continue;
        }
        $ids = array_map(fn($r) => (int) $r['userId'], $rows);
        sort($ids);
        $expected = [$userIdA, $userIdB];
        sort($expected);
        if ($ids === $expected) {
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

if ($id === null && method() === 'GET') {
    $userId = requireAuth();
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int) ($_GET['perPage'] ?? 20)));

    $conversations = readJson('conversations.json');
    $participants = readJson('conversation_participants.json');
    $messages = readJson('messages.json');
    $users = readJson('users.json');

    $mine = array_values(array_filter(
        $participants,
        fn($p) => (int) $p['userId'] === $userId
    ));
    $conversationIds = array_map(fn($p) => (int) $p['conversationId'], $mine);

    $items = [];
    foreach ($conversations as $conversation) {
        if (!in_array((int) $conversation['id'], $conversationIds, true)) {
            continue;
        }
        $participant = findParticipant($participants, (int) $conversation['id'], $userId);
        if ($participant === null) {
            continue;
        }
        $rows = participantsForConversation($participants, (int) $conversation['id']);
        $items[] = [
            'id' => (int) $conversation['id'],
            'type' => $conversation['type'],
            'title' => $conversation['title'] ?? null,
            'displayName' => conversationDisplayName($conversation, $rows, $users, $userId),
            'participants' => publicParticipants($rows, $users),
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
    $userId = requireAuth();
    $input = getJsonInput();
    $type = $input['type'] ?? '';
    $participantIds = array_values(array_unique(array_map('intval', $input['participantIds'] ?? [])));
    $title = trim($input['title'] ?? '');

    if (!in_array($type, ['direct', 'group'], true)) {
        jsonResponse(['error' => 'type must be direct or group'], 400);
        exit;
    }

    $users = readJson('users.json');
    if (findUser($users, $userId) === null) {
        jsonResponse(['error' => 'User not found'], 404);
        exit;
    }

    foreach ($participantIds as $pid) {
        if ($pid === $userId) {
            jsonResponse(['error' => 'Cannot include yourself in participantIds'], 400);
            exit;
        }
        if (findUser($users, $pid) === null) {
            jsonResponse(['error' => 'Participant not found'], 404);
            exit;
        }
    }

    $conversations = readJson('conversations.json');
    $participants = readJson('conversation_participants.json');
    $now = date('c');

    if ($type === 'direct') {
        if (count($participantIds) !== 1) {
            jsonResponse(['error' => 'Direct conversations require exactly one other participant'], 400);
            exit;
        }
        $otherId = $participantIds[0];
        $existing = findDirectConversation($conversations, $participants, $userId, $otherId);
        if ($existing !== null) {
            $rows = participantsForConversation($participants, (int) $existing['id']);
            jsonResponse([
                ...$existing,
                'participants' => publicParticipants($rows, $users),
                'displayName' => conversationDisplayName($existing, $rows, $users, $userId),
            ]);
            exit;
        }

        $conversation = [
            'id' => nextId($conversations),
            'type' => 'direct',
            'createdBy' => $userId,
            'createdAt' => $now,
            'updatedAt' => $now,
            'lastMessagePreview' => '',
        ];
        $conversations[] = $conversation;
        writeJson('conversations.json', $conversations);

        foreach ([$userId, $otherId] as $memberId) {
            $participants[] = [
                'conversationId' => $conversation['id'],
                'userId' => $memberId,
                'joinedAt' => $now,
                'role' => 'member',
            ];
        }
        writeJson('conversation_participants.json', $participants);

        $rows = participantsForConversation($participants, (int) $conversation['id']);
        jsonResponse([
            ...$conversation,
            'participants' => publicParticipants($rows, $users),
            'displayName' => conversationDisplayName($conversation, $rows, $users, $userId),
        ], 201);
        exit;
    }

    $allIds = array_values(array_unique(array_merge([$userId], $participantIds)));
    if (count($allIds) < 3) {
        jsonResponse(['error' => 'Group conversations require at least 3 participants'], 400);
        exit;
    }
    if (count($allIds) > MAX_GROUP_SIZE) {
        jsonResponse(['error' => 'Group conversations allow at most ' . MAX_GROUP_SIZE . ' participants'], 400);
        exit;
    }

    $conversation = [
        'id' => nextId($conversations),
        'type' => 'group',
        'title' => $title !== '' ? $title : null,
        'createdBy' => $userId,
        'createdAt' => $now,
        'updatedAt' => $now,
        'lastMessagePreview' => '',
    ];
    $conversations[] = $conversation;
    writeJson('conversations.json', $conversations);

    foreach ($allIds as $memberId) {
        $participants[] = [
            'conversationId' => $conversation['id'],
            'userId' => $memberId,
            'joinedAt' => $now,
            'role' => $memberId === $userId ? 'admin' : 'member',
        ];
    }
    writeJson('conversation_participants.json', $participants);

    $rows = participantsForConversation($participants, (int) $conversation['id']);
    jsonResponse([
        ...$conversation,
        'participants' => publicParticipants($rows, $users),
        'displayName' => conversationDisplayName($conversation, $rows, $users, $userId),
    ], 201);
    exit;
}

if ($id !== null && $sub === '' && method() === 'GET') {
    $userId = requireAuth();
    $conversations = readJson('conversations.json');
    $participants = readJson('conversation_participants.json');
    $users = readJson('users.json');

    $found = findConversation($conversations, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Conversation not found'], 404);
        exit;
    }

    requireParticipant($participants, $id, $userId);
    $rows = participantsForConversation($participants, $id);
    $conversation = $found['record'];

    jsonResponse([
        ...$conversation,
        'displayName' => conversationDisplayName($conversation, $rows, $users, $userId),
        'participants' => publicParticipants($rows, $users),
    ]);
    exit;
}

if ($id !== null && $sub === 'messages' && method() === 'GET') {
    $userId = requireAuth();
    $conversations = readJson('conversations.json');
    $participants = readJson('conversation_participants.json');
    $messages = readJson('messages.json');
    $users = readJson('users.json');

    if (findConversation($conversations, $id) === null) {
        jsonResponse(['error' => 'Conversation not found'], 404);
        exit;
    }
    requireParticipant($participants, $id, $userId);

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
        $author = findUser($users, (int) $message['authorId']);
        $result[] = [
            ...$message,
            'author' => $author ? ['id' => $author['id'], 'name' => $author['name'], 'type' => $author['type']] : null,
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
    $userId = requireAuth();
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

    $conversations = readJson('conversations.json');
    $participants = readJson('conversation_participants.json');
    $messages = readJson('messages.json');
    $users = readJson('users.json');

    $found = findConversation($conversations, $id);
    if ($found === null) {
        jsonResponse(['error' => 'Conversation not found'], 404);
        exit;
    }
    requireParticipant($participants, $id, $userId);

    $now = date('c');
    $message = [
        'id' => nextId($messages),
        'conversationId' => $id,
        'authorId' => $userId,
        'content' => $content,
        'createdAt' => $now,
    ];
    $messages[] = $message;
    writeJson('messages.json', $messages);

    $conversations[$found['idx']]['updatedAt'] = $now;
    $conversations[$found['idx']]['lastMessagePreview'] = messagePreview($content);
    writeJson('conversations.json', $conversations);

    $author = findUser($users, $userId);
    jsonResponse([
        ...$message,
        'author' => $author ? ['id' => $author['id'], 'name' => $author['name'], 'type' => $author['type']] : null,
    ], 201);
    exit;
}

if ($id !== null && $sub === 'read' && method() === 'POST') {
    $userId = requireAuth();
    $conversations = readJson('conversations.json');
    $participants = readJson('conversation_participants.json');

    if (findConversation($conversations, $id) === null) {
        jsonResponse(['error' => 'Conversation not found'], 404);
        exit;
    }
    requireParticipant($participants, $id, $userId);

    $now = date('c');
    foreach ($participants as $i => $participant) {
        if ((int) $participant['conversationId'] === $id && (int) $participant['userId'] === $userId) {
            $participants[$i]['lastReadAt'] = $now;
            break;
        }
    }
    writeJson('conversation_participants.json', $participants);
    jsonResponse(['lastReadAt' => $now]);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
