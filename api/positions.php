<?php
$positionId = isset($segments[1]) ? (int) $segments[1] : null;
$isComments = isset($segments[2]) && $segments[2] === 'comments';

// GET /api/positions - list all
// POST /api/positions - create new
// GET /api/positions/{id}/comments - list comments
// POST /api/positions/{id}/comments - add comment

if ($positionId && $isComments) {
    // Comments for a position
    $comments = readJson('comments.json');
    $positionComments = array_filter($comments, fn($c) => (int) $c['positionId'] === $positionId);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        jsonResponse(array_values($positionComments));
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = getJsonInput();
        $content = trim($input['content'] ?? '');
        $authorId = (int) ($input['authorId'] ?? 0);
        if (!$content || !$authorId) {
            jsonResponse(['error' => 'content and authorId required'], 400);
            exit;
        }
        $comments = readJson('comments.json');
        $maxId = 0;
        foreach ($comments as $c) {
            $maxId = max($maxId, (int) $c['id']);
        }
        $newComment = [
            'id' => $maxId + 1,
            'positionId' => $positionId,
            'authorId' => $authorId,
            'content' => $content,
            'createdAt' => date('c'),
        ];
        $comments[] = $newComment;
        writeJson('comments.json', $comments);
        jsonResponse($newComment, 201);
    } else {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    exit;
}

// Positions
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $positions = readJson('positions.json');
    usort($positions, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
    jsonResponse($positions);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJsonInput();
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $authorId = (int) ($input['authorId'] ?? 0);
    if (!$title || !$description || !$authorId) {
        jsonResponse(['error' => 'title, description and authorId required'], 400);
        exit;
    }
    $positions = readJson('positions.json');
    $maxId = 0;
    foreach ($positions as $p) {
        $maxId = max($maxId, (int) $p['id']);
    }
    $newPosition = [
        'id' => $maxId + 1,
        'authorId' => $authorId,
        'title' => $title,
        'description' => $description,
        'createdAt' => date('c'),
    ];
    $positions[] = $newPosition;
    writeJson('positions.json', $positions);
    jsonResponse($newPosition, 201);
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
