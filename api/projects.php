<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

if ($id === null && method() === 'GET') {
    $orgId = isset($_GET['orgId']) ? (int) $_GET['orgId'] : null;
    $projects = readJson('projects.json');
    if ($orgId !== null) {
        $projects = array_values(array_filter($projects, fn($p) => (int) $p['orgId'] === $orgId));
    }
    jsonResponse($projects);
    exit;
}

if ($id === null && method() === 'POST') {
    $userId = requireAuth();
    $users = readJson('users.json');
    $user = findUser($users, $userId);
    if (!$user || $user['type'] !== 'organization') {
        jsonResponse(['error' => 'Only organizations can create projects'], 403);
        exit;
    }
    $input = getJsonInput();
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    if (!$title) {
        jsonResponse(['error' => 'Title is required'], 400);
        exit;
    }
    $projects = readJson('projects.json');
    $project = [
        'id' => nextId($projects),
        'orgId' => $userId,
        'title' => $title,
        'description' => $description,
        'createdAt' => date('c'),
    ];
    $projects[] = $project;
    writeJson('projects.json', $projects);
    jsonResponse($project, 201);
    exit;
}

if ($id !== null && $sub === '' && method() === 'GET') {
    $projects = readJson('projects.json');
    $project = null;
    foreach ($projects as $p) {
        if ((int) $p['id'] === $id) {
            $project = $p;
            break;
        }
    }
    if (!$project) {
        jsonResponse(['error' => 'Project not found'], 404);
        exit;
    }
    $posts = readJson('project_posts.json');
    $projectPosts = array_values(array_filter($posts, fn($pp) => (int) $pp['projectId'] === $id));
    usort($projectPosts, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
    jsonResponse(['project' => $project, 'posts' => $projectPosts]);
    exit;
}

if ($id !== null && $sub === 'posts' && method() === 'POST') {
    $userId = requireAuth();
    $projects = readJson('projects.json');
    $project = null;
    foreach ($projects as $p) {
        if ((int) $p['id'] === $id) {
            $project = $p;
            break;
        }
    }
    if (!$project) {
        jsonResponse(['error' => 'Project not found'], 404);
        exit;
    }
    if ((int) $project['orgId'] !== $userId) {
        jsonResponse(['error' => 'Forbidden'], 403);
        exit;
    }
    $input = getJsonInput();
    $content = trim($input['content'] ?? '');
    if (!$content) {
        jsonResponse(['error' => 'Content is required'], 400);
        exit;
    }
    $posts = readJson('project_posts.json');
    $post = [
        'id' => nextId($posts),
        'projectId' => $id,
        'content' => $content,
        'createdAt' => date('c'),
    ];
    $posts[] = $post;
    writeJson('project_posts.json', $posts);
    jsonResponse($post, 201);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
