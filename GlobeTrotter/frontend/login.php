<?php
session_start();
require_once "config.php";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: index.php");
    exit;
}

$login = trim($_POST['login'] ?? '');
$password = $_POST['password'] ?? '';

if ($login === '' || $password === '') {
    header("Location: index.php?error=" . urlencode("Please enter username/email and password."));
    exit;
}

$stmt = $conn->prepare("SELECT id, name, username, email, password FROM users WHERE username = ? OR email = ? LIMIT 1");
$stmt->bind_param("ss", $login, $login);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user || !password_verify($password, $user['password'])) {
    header("Location: index.php?error=" . urlencode("Incorrect username/email or password."));
    exit;
}

session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];
$_SESSION['name'] = $user['name'];
$_SESSION['username'] = $user['username'];
$_SESSION['email'] = $user['email'];

header("Location: dashboard.php");
exit;
?>
