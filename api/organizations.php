<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';
$memberUserId = isset($segments[3]) ? (int) $segments[3] : null;

$orgs = readOrganizations();

if ($id === null && method() === 'GET') {
    jsonResponse(array_map(fn($o) => enrichOrganizationWithMembers(publicOrganization($o)), $orgs));
    exit;
}

if ($id === null && method() === 'POST') {
    $userId = requireUserSession();
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');
    if (!$name) {
        jsonResponse(['error' => 'Name is required'], 400);
        exit;
    }
    if (isNameTaken($name)) {
        jsonResponse(['error' => 'Name already taken'], 409);
        exit;
    }

    $id = nextId($orgs);
    $org = [
        'id' => $id,
        'name' => $name,
        'bio' => trim($input['bio'] ?? ''),
        'location' => $input['location'] ?? null,
        'createdByUserId' => $userId,
        'createdAt' => date('c'),
    ];
    $orgs[] = $org;
    writeJson(ORGANIZATIONS_JSON, $orgs);

    $members = readOrganizationMembers();
    $members[] = [
        'id' => nextId($members),
        'organizationId' => $id,
        'userId' => $userId,
        'role' => 'admin',
        'joinedAt' => date('c'),
    ];
    writeOrganizationMembers($members);

    setActiveAccount('organization', $id);
    jsonResponse(enrichOrganizationWithMembers(publicOrganization($org)), 201);
    exit;
}

if ($id !== null && $sub === '' && method() === 'GET') {
    $org = findOrganization($orgs, $id);
    if (!$org) {
        jsonResponse(['error' => 'Organization not found'], 404);
        exit;
    }
    jsonResponse(enrichOrganizationWithMembers(publicOrganization($org)));
    exit;
}

if ($id !== null && $sub === '' && method() === 'PATCH') {
    requireOrgAdminSession($id);
    $input = getJsonInput();
    $idx = null;
    foreach ($orgs as $i => $o) {
        if ((int) $o['id'] === $id) {
            $idx = $i;
            break;
        }
    }
    if ($idx === null) {
        jsonResponse(['error' => 'Organization not found'], 404);
        exit;
    }

    $allowed = ['name', 'bio', 'location', 'avatarFileId'];
    foreach ($allowed as $field) {
        if (!array_key_exists($field, $input)) {
            continue;
        }
        if ($field === 'avatarFileId') {
            $avatarFileId = $input['avatarFileId'] !== null ? (int) $input['avatarFileId'] : null;
            if ($avatarFileId === null || $avatarFileId === 0) {
                $oldAvatarId = isset($orgs[$idx]['avatarFileId']) ? (int) $orgs[$idx]['avatarFileId'] : null;
                if ($oldAvatarId) {
                    deleteStoredFile($oldAvatarId);
                }
                unset($orgs[$idx]['avatarFileId']);
            } else {
                requireAttachableFile($avatarFileId, 'organization', $id);
                $oldAvatarId = isset($orgs[$idx]['avatarFileId']) ? (int) $orgs[$idx]['avatarFileId'] : null;
                if ($oldAvatarId && $oldAvatarId !== $avatarFileId) {
                    deleteStoredFile($oldAvatarId);
                }
                $orgs[$idx]['avatarFileId'] = $avatarFileId;
                attachFileTo($avatarFileId, 'organization', $id);
            }
            continue;
        }
        $orgs[$idx][$field] = $input[$field];
    }
    writeJson(ORGANIZATIONS_JSON, $orgs);
    jsonResponse(enrichOrganizationWithMembers(publicOrganization($orgs[$idx])));
    exit;
}

if ($id !== null && $sub === 'members' && $memberUserId === null && method() === 'POST') {
    requireOrgAdminSession($id);
    $input = getJsonInput();
    $targetUserId = (int) ($input['userId'] ?? 0);
    $role = $input['role'] ?? 'member';
    if (!$targetUserId || !findUser(readUsers(), $targetUserId)) {
        jsonResponse(['error' => 'User not found'], 404);
        exit;
    }
    if (!in_array($role, ['admin', 'member'], true)) {
        jsonResponse(['error' => 'Role must be admin or member'], 400);
        exit;
    }
    if (getUserMembership($targetUserId, $id) !== null) {
        jsonResponse(['error' => 'User is already a member'], 409);
        exit;
    }
    $members = readOrganizationMembers();
    $members[] = [
        'id' => nextId($members),
        'organizationId' => $id,
        'userId' => $targetUserId,
        'role' => $role,
        'joinedAt' => date('c'),
    ];
    writeOrganizationMembers($members);
    jsonResponse(['ok' => true], 201);
    exit;
}

if ($id !== null && $sub === 'members' && $memberUserId !== null && method() === 'PATCH') {
    requireOrgAdminSession($id);
    $input = getJsonInput();
    $role = $input['role'] ?? '';
    if (!in_array($role, ['admin', 'member'], true)) {
        jsonResponse(['error' => 'Role must be admin or member'], 400);
        exit;
    }
    $members = readOrganizationMembers();
    $idx = null;
    foreach ($members as $i => $m) {
        if ((int) $m['organizationId'] === $id && (int) $m['userId'] === $memberUserId) {
            $idx = $i;
            break;
        }
    }
    if ($idx === null) {
        jsonResponse(['error' => 'Member not found'], 404);
        exit;
    }
    if (($members[$idx]['role'] ?? '') === 'admin' && $role === 'member' && countOrgAdmins($id) <= 1) {
        jsonResponse(['error' => 'Cannot demote the last admin'], 400);
        exit;
    }
    $members[$idx]['role'] = $role;
    writeOrganizationMembers($members);
    jsonResponse(['ok' => true]);
    exit;
}

if ($id !== null && $sub === 'members' && $memberUserId !== null && method() === 'DELETE') {
    $sessionUserId = requireUserSession();
    $members = readOrganizationMembers();
    $idx = null;
    foreach ($members as $i => $m) {
        if ((int) $m['organizationId'] === $id && (int) $m['userId'] === $memberUserId) {
            $idx = $i;
            break;
        }
    }
    if ($idx === null) {
        jsonResponse(['error' => 'Member not found'], 404);
        exit;
    }

    $isSelf = $sessionUserId === $memberUserId;
    $isAdmin = isOrgAdmin($sessionUserId, $id);
    if (!$isSelf && !$isAdmin) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
    if (!$isSelf) {
        requireOrgAdminSession($id);
    }
    if (($members[$idx]['role'] ?? '') === 'admin' && countOrgAdmins($id) <= 1) {
        jsonResponse(['error' => 'Cannot remove the last admin'], 400);
        exit;
    }

    array_splice($members, $idx, 1);
    writeOrganizationMembers($members);

    $active = getActiveAccount();
    if ($active && $active['type'] === 'organization' && $active['id'] === $id && $isSelf) {
        setActiveAccount('user', $sessionUserId);
    }

    jsonResponse(['ok' => true]);
    exit;
}

if ($id !== null && $sub === 'follow' && method() === 'GET') {
    $auth = requireAuth();
    jsonResponse([
        'following' => isFollowingProfile('organization', $id, $auth['type'], $auth['id']),
    ]);
    exit;
}

if ($id !== null && $sub === 'follow' && method() === 'POST') {
    $auth = requireAuth();
    if ($auth['type'] === 'organization' && $auth['id'] === $id) {
        jsonResponse(['error' => 'Cannot follow yourself'], 400);
        exit;
    }
    if (!findOrganization($orgs, $id)) {
        jsonResponse(['error' => 'Organization not found'], 404);
        exit;
    }
    $follows = readJson(FOLLOWS_JSON);
    foreach ($follows as $f) {
        if ($f['followerType'] === $auth['type'] && (int) $f['followerId'] === $auth['id']
            && $f['followingType'] === 'organization' && (int) $f['followingId'] === $id) {
            jsonResponse(['ok' => true, 'following' => true]);
            exit;
        }
    }
    $actingUserId = followActingUserId();
    if ($actingUserId === null) {
        jsonResponse(['error' => 'Authentication required'], 401);
        exit;
    }
    $follows[] = [
        'followerType' => $auth['type'],
        'followerId' => $auth['id'],
        'actingUserId' => $actingUserId,
        'followingType' => 'organization',
        'followingId' => $id,
        'createdAt' => date('c'),
    ];
    writeJson(FOLLOWS_JSON, $follows);
    jsonResponse(['ok' => true, 'following' => true], 201);
    exit;
}

if ($id !== null && $sub === 'follow' && method() === 'DELETE') {
    $auth = requireAuth();
    $follows = readJson(FOLLOWS_JSON);
    $follows = array_values(array_filter($follows, fn($f) =>
        !($f['followerType'] === $auth['type'] && (int) $f['followerId'] === $auth['id']
            && $f['followingType'] === 'organization' && (int) $f['followingId'] === $id)
    ));
    writeJson(FOLLOWS_JSON, $follows);
    jsonResponse(['ok' => true, 'following' => false]);
    exit;
}

if ($id !== null && $sub === 'feed' && method() === 'GET') {
    require __DIR__ . '/feed.php';
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
