<?php
$id = $segments[1] ?? null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $users = readJson('users.json');
    if ($id !== null) {
        $id = (int) $id;
        $user = null;
        foreach ($users as $u) {
            if ((int) $u['id'] === $id) {
                $user = $u;
                break;
            }
        }
        if ($user) {
            jsonResponse($user);
        } else {
            jsonResponse(['error' => 'User not found'], 404);
        }
    } else {
        jsonResponse($users);
    }
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
