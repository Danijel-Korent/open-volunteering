<?php
require_once __DIR__ . '/config.php';

$segments = getPathSegments();
$id = isset($segments[1]) ? (int) $segments[1] : null;
$sub = $segments[2] ?? '';

if ($id === null && method() === 'GET') {
    $orgId = isset($_GET['orgId']) ? (int) $_GET['orgId'] : null;
    $projects = readJson(PROJECTS_JSON);
    if ($orgId !== null) {
        $projects = array_values(array_filter($projects, fn($p) => (int) $p['orgId'] === $orgId));
    }
    jsonResponse($projects);
    exit;
}

if ($id === null && method() === 'POST') {
    $auth = requireAuth();
    if ($auth['type'] !== 'organization') {
        jsonResponse(['error' => 'Only organizations can create projects'], 403);
        exit;
    }
    requireOrgAdminSession($auth['id']);
    $input = getJsonInput();
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    if (!$title) {
        jsonResponse(['error' => 'Title is required'], 400);
        exit;
    }
    $projects = readJson(PROJECTS_JSON);
    $project = [
        'id' => nextId($projects),
        'orgId' => $auth['id'],
        'title' => $title,
        'description' => $description,
        'createdAt' => date('c'),
    ];
    $projects[] = $project;
    writeJson(PROJECTS_JSON, $projects);
    jsonResponse($project, 201);
    exit;
}

if ($id !== null && $sub === '' && method() === 'GET') {
    $projects = readJson(PROJECTS_JSON);
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
    $posts = readJson(PROJECT_POSTS_JSON);
    $projectPosts = array_values(array_filter($posts, fn($pp) => (int) $pp['projectId'] === $id));
    usort($projectPosts, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
    jsonResponse(['project' => $project, 'posts' => $projectPosts]);
    exit;
}

if ($id !== null && $sub === 'posts' && method() === 'POST') {
    $auth = requireAuth();
    $projects = readJson(PROJECTS_JSON);
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
    requireOrgAdminSession((int) $project['orgId']);
    $input = getJsonInput();
    $content = trim($input['content'] ?? '');
    if (!$content) {
        jsonResponse(['error' => 'Content is required'], 400);
        exit;
    }
    $posts = readJson(PROJECT_POSTS_JSON);
    $post = [
        'id' => nextId($posts),
        'projectId' => $id,
        'content' => $content,
        'createdAt' => date('c'),
    ];
    $posts[] = $post;
    writeJson(PROJECT_POSTS_JSON, $posts);
    jsonResponse($post, 201);
    exit;
}

jsonResponse(['error' => 'Not found'], 404);
