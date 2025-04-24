<?php
session_start();
require_once __DIR__ . '/../php/db.php';
require_once __DIR__ . '/../php/auth.php';

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $token = $_POST['token'] ?? '';

    try {
        $result = login($username, $password, $token);
        if ($result['success']) {
            $_SESSION['user'] = [
                'username' => $username,
                'id' => $result['user_id']
            ];
            header('Location: /');
            exit;
        } else {
            $error = $result['error'];
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Business Card</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="container">
        <div class="card">
            <h2>Login (PHP Version)</h2>
            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            <?php if ($success): ?>
                <div class="success"><?php echo htmlspecialchars($success); ?></div>
            <?php endif; ?>
            
            <form method="POST" action="/login.php">
                <div class="form-group">
                    <input type="text" name="username" placeholder="Username" required>
                </div>
                <div class="form-group">
                    <input type="password" name="password" placeholder="Password" required>
                </div>
                <div class="form-group">
                    <input type="text" name="token" placeholder="2FA Code (if enabled)" pattern="[0-9]{6}">
                    <small>Enter 6-digit code from Google Authenticator (if 2FA is enabled)</small>
                </div>
                <button type="submit">Login</button>
            </form>
            <p>Don't have an account? <a href="/register.php">Register</a></p>
        </div>
    </div>
</body>
</html> 