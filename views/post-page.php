<?php
// Get the current timestamp
$timestamp = date('Y-m-d H:i:s');

// Handle POST data
$postData = $_POST;
$hasData = !empty($postData);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Card - POST Page (PHP)</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="container">
        <nav>
            <a href="/">Home</a>
            <a href="/get-page">GET Page</a>
            <a href="/post-page">POST Page</a>
            <a href="/ajax-forms">AJAX Forms</a>
        </nav>
        
        <div class="card">
            <h2>POST Request Demo (PHP)</h2>
            <form action="/post-page.php" method="post">
                <div class="form-group">
                    <input type="text" name="name" placeholder="Enter your name" required>
                </div>
                <div class="form-group">
                    <input type="email" name="email" placeholder="Enter your email" required>
                </div>
                <div class="form-group">
                    <textarea name="message" placeholder="Enter your message" required></textarea>
                </div>
                <button type="submit">Submit POST Request</button>
            </form>

            <?php if ($hasData): ?>
            <div class="result">
                <h3>Received POST Data:</h3>
                <pre><?php print_r($postData); ?></pre>
            </div>
            <?php endif; ?>

            <div class="timestamp">
                Page loaded at: <?php echo $timestamp; ?>
            </div>
        </div>
    </div>
</body>
</html> 