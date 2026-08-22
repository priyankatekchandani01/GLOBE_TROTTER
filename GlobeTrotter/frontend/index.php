<?php
session_start();
if (isset($_SESSION['user_id'])) {
    header("Location: dashboard.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Globetrotter | Login</title>
    <link rel="stylesheet" href="style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
<div class="sky-page">
    <div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>
    <div class="plane">✈</div>

    <main class="auth-wrap">
        <section class="auth-card">
            <div class="brand-bubble">🌍</div>
            <h1>Welcome Back!</h1>
            <p class="muted">Login to continue your journey</p>

            <?php if (isset($_GET['error'])): ?>
                <div class="alert error-alert"><?= htmlspecialchars($_GET['error']) ?></div>
            <?php endif; ?>

            <?php if (isset($_GET['success'])): ?>
                <div class="alert success-alert"><?= htmlspecialchars($_GET['success']) ?></div>
            <?php endif; ?>

            <form id="loginForm" action="login.php" method="POST" novalidate>
                <label class="field">
                    <span>👤</span>
                    <input type="text" name="login" id="login" placeholder="Username or Email" autocomplete="username">
                </label>
                <small class="field-error" id="loginError"></small>

                <label class="field">
                    <span>🔒</span>
                    <input type="password" name="password" id="password" placeholder="Password" autocomplete="current-password">
                    <button class="eye" type="button" id="togglePassword">👁</button>
                </label>
                <small class="field-error" id="passwordError"></small>

                <div class="row-between">
                    <label class="remember"><input type="checkbox" name="remember"> Remember me</label>
                    <a href="forgot_password.php">Forgot Password?</a>
                </div>

                <button class="primary-btn" type="submit">Login <span>→</span></button>
            </form>

            <div class="divider"><span></span><b>or</b><span></span></div>

            <button class="google-btn" type="button" onclick="showMessage('Google login can be connected later using Google OAuth.')">
                <strong>G</strong> Continue with Google
            </button>

            <p class="bottom-text">Don't have an account? <a href="signup.php">Sign Up</a></p>
        </section>
    </main>

    <footer>EXPLORE • DREAM • DISCOVER</footer>
</div>
<script src="script.js"></script>
</body>
</html>
