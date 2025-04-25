<?php
// Get the current timestamp
$timestamp = date('Y-m-d H:i:s');

// Handle GET parameters
$getData = $_GET;
$parameterString = http_build_query($getData);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Card - GET Page (PHP)</title>
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
            <h2>GET Request Demo (PHP)</h2>
            <form action="/get-page.php" method="get">
                <div class="form-group">
                    <input type="text" name="name" placeholder="Enter your name" value="<?php echo htmlspecialchars($_GET['name'] ?? ''); ?>">
                </div>
                <div class="form-group">
                    <input type="email" name="email" placeholder="Enter your email" value="<?php echo htmlspecialchars($_GET['email'] ?? ''); ?>">
                </div>
                <button type="submit">Submit GET Request</button>
            </form>

            <?php if (!empty($getData)): ?>
            <div class="result">
                <h3>Received GET Data:</h3>
                <pre><?php print_r($getData); ?></pre>
            </div>
            <?php endif; ?>

            <div class="timestamp">
                Page loaded at: <?php echo $timestamp; ?>
            </div>
        </div>
    </div>
</body>
</html> 