<?php
session_start();
require_once "config.php";
if (!isset($_SESSION['user_id'])) { header("Location: index.php"); exit; }

$userId = (int)$_SESSION['user_id'];
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "Enter a valid name and email.";
    } else {
        $stmt = $conn->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
        $stmt->bind_param("ssi", $name, $email, $userId);
        if ($stmt->execute()) {
            $_SESSION['name'] = $name;
            $_SESSION['email'] = $email;
            $message = "Profile updated successfully.";
        } else {
            $error = "Email may already be in use.";
        }
        $stmt->close();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Globetrotter | Profile</title><link rel="stylesheet" href="style.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="dashboard-body">
<header class="topbar"><a class="brand" href="dashboard.php">🌍 <span>GLOBETROTTER</span></a><nav><a href="dashboard.php">Dashboard</a><a class="logout" href="logout.php">Logout</a></nav></header>
<main class="profile-wrap">
<section class="profile-card">
<div class="profile-avatar">👤</div><h1>My Profile</h1><p class="muted">Keep your travel account details updated.</p>
<?php if ($message): ?><div class="alert success-alert"><?= htmlspecialchars($message) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error-alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>
<form method="POST">
<label class="stack-label">Full Name<input name="name" required value="<?= htmlspecialchars($_SESSION['name']) ?>"></label>
<label class="stack-label">Username<input disabled value="<?= htmlspecialchars($_SESSION['username']) ?>"></label>
<label class="stack-label">Email<input type="email" name="email" required value="<?= htmlspecialchars($_SESSION['email']) ?>"></label>
<button class="primary-btn" type="submit">Save Changes</button>
</form>
<a class="back-link" href="dashboard.php">← Back to Dashboard</a>
</section>
</main>
</body>
</html>
