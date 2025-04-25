<?php
function getDB() {
    static $db = null;
    
    if ($db === null) {
        $dbPath = __DIR__ . '/../data/users.db';
        $dbDir = dirname($dbPath);
        
        if (!file_exists($dbDir)) {
            mkdir($dbDir, 0777, true);
        }
        
        try {
            $db = new PDO("sqlite:$dbPath");
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Create tables if they don't exist
            $db->exec("CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                secret TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        } catch (PDOException $e) {
            throw new Exception('Database connection failed: ' . $e->getMessage());
        }
    }
    
    return $db;
} 