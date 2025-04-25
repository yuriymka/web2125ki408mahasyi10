<?php
session_start();
require_once __DIR__ . '/../php/db.php';
require_once __DIR__ . '/../php/auth.php';
require_once __DIR__ . '/../vendor/autoload.php';

use RobThree\Auth\TwoFactorAuth;

if (!isset($_SESSION['user'])) {
    header('Location: /login.php');
    exit;
}

$tfa = new TwoFactorAuth('BusinessCard');
$secret = $tfa->createSecret();
$_SESSION['temp_2fa_secret'] = $secret;

$qrCodeUrl = $tfa->getQRCodeImageAsDataUri(
    $_SESSION['user']['username'],
    $secret
);

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['token'] ?? '';
    
    try {
        if ($tfa->verifyCode($secret, $token)) {
            save2FASecret($_SESSION['user']['username'], $secret);
            $_SESSION['user']['has_2fa'] = true;
            unset($_SESSION['temp_2fa_secret']);
            header('Location: /');
            exit;
        } else {
            $error = 'Invalid verification code';
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
    <title>Setup 2FA - Business Card</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="container">
        <div class="card">
            <h2>Setup Two-Factor Authentication</h2>
            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            
            <div class="setup-steps">
                <h3>Step 1: Install Google Authenticator</h3>
                <p>Download Google Authenticator from your app store:</p>
                <ul>
                    <li><a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank">Android - Google Play Store</a></li>
                    <li><a href="https://apps.apple.com/us/app/google-authenticator/id388497605" target="_blank">iPhone - App Store</a></li>
                </ul>

                <h3>Step 2: Scan QR Code</h3>
                <div class="qr-container">
                    <img src="<?php echo htmlspecialchars($qrCodeUrl); ?>" alt="QR Code">
                </div>
                <p>Or enter this code manually in the app:</p>
                <div class="secret-key"><?php echo htmlspecialchars($secret); ?></div>

                <h3>Step 3: Verify Setup</h3>
                <form method="POST">
                    <div class="form-group">
                        <input type="text" name="token" placeholder="Enter the 6-digit code" pattern="[0-9]{6}" required>
                    </div>
                    <button type="submit">Verify and Complete Setup</button>
                </form>
            </div>
        </div>
    </div>
</body>
</html> 