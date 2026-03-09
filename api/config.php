<?php
define('DATA_DIR', dirname(__DIR__) . '/data/');

/**
 * Send JSON response with CORS headers.
 *
 * @param mixed $data Data to encode as JSON
 * @param int $code HTTP status code (default 200)
 */
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    echo json_encode($data);
}

/**
 * Read and decode a JSON file from the data directory.
 *
 * @param string $file Filename (e.g. 'users.json')
 * @return array Decoded data, or empty array if file missing or invalid
 */
function readJson($file) {
    $path = DATA_DIR . $file;
    if (!file_exists($path)) return [];
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return $data ?? [];
}

/**
 * Encode data as JSON and write to a file in the data directory.
 *
 * @param string $file Filename (e.g. 'users.json')
 * @param mixed $data Data to encode
 * @return int|false Bytes written, or false on failure
 */
function writeJson($file, $data) {
    $path = DATA_DIR . $file;
    return file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * Read and decode JSON from the request body (php://input).
 *
 * @return array Decoded data, or empty array if body empty or invalid
 */
function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}
