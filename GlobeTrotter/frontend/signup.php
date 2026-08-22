<?php
session_start();
require_once "config.php";
if (isset($_SESSION['user_id'])) { header("Location: dashboard.php"); exit; }

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm = $_POST['confirm_password'] ?? '';
    $name = trim($_POST['name'] ?? '');

    if ($name === '') $errors[] = "Name is required.";
    if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $username)) $errors[] = "Username must be 3-30 characters and use letters, numbers or underscore.";
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Enter a valid email address.";
    if (strlen($password) < 8) $errors[] = "Password must contain at least 8 characters.";
    if (!preg_match('/[A-Z]/', $password) || !preg_match('/[0-9]/', $password)) $errors[] = "Password must contain at least one uppercase letter and one number.";
    if ($password !== $confirm) $errors[] = "Passwords do not match.";

    if (!$errors) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1");
        $stmt->bind_param("ss", $username, $email);
        $stmt->execute();
        $exists = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($exists) {
            $errors[] = "Username or email is already registered.";
        } else {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (name, username, email, password) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $name, $username, $email, $hash);
            if ($stmt->execute()) {
                $stmt->close();
                header("Location: index.php?success=" . urlencode("Account created successfully. Please login."));
                exit;
            }
            $errors[] = "Unable to create account. Please try again.";
            $stmt->close();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Globetrotter | Sign Up</title>
<link rel="stylesheet" href="style.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
<div class="sky-page">
<div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>
<main class="auth-wrap">
<section class="auth-card">
<div class="brand-bubble">✈️</div>
<h1>Create Account</h1><p class="muted">Start planning your next adventure</p>
<?php if ($errors): ?><div class="alert error-alert"><?php foreach ($errors as $e): ?><div><?= htmlspecialchars($e) ?></div><?php endforeach; ?></div><?php endif; ?>
<form method="POST" id="signupForm" novalidate>
<label class="field"><span>🧑</span><input name="name" placeholder="Full Name" value="<?= htmlspecialchars($_POST['name'] ?? '') ?>"></label>
<label class="field"><span>👤</span><input name="username" placeholder="Username" value="<?= htmlspecialchars($_POST['username'] ?? '') ?>"></label>
<label class="field"><span>✉️</span><input type="email" name="email" placeholder="Email Address" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"></label>
<label class="field"><span>🔒</span><input type="password" name="password" id="signupPassword" placeholder="Password"></label>
<div class="password-hint">Use 8+ characters with an uppercase letter and a number.</div>
<label class="field"><span>🔒</span><input type="password" name="confirm_password" placeholder="Confirm Password"></label>
<button class="primary-btn" type="submit">Create Account <span>→</span></button>
</form>
<p class="bottom-text">Already have an account? <a href="index.php">Login</a></p>
</section>
</main>
</div>
<script src="script.js"></script>
</body>
</html>
