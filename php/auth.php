<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/../vendor/autoload.php';

use RobThree\Auth\TwoFactorAuth;

function register($username, $password) {
    try {
        $db = getDB();
        
        // Check if username exists
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            return ['success' => false, 'error' => 'Username already exists'];
        }

        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Insert new user
        $stmt = $db->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        $stmt->execute([$username, $hashedPassword]);
        
        return [
            'success' => true,
            'user_id' => $db->lastInsertId()
        ];
    } catch (PDOException $e) {
        throw new Exception('Registration failed: ' . $e->getMessage());
    }
}

function login($username, $password, $token = null) {
    try {
        $db = getDB();
        
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || !password_verify($password, $user['password'])) {
            return ['success' => false, 'error' => 'Invalid credentials'];
        }

        // Check 2FA if enabled
        if ($user['secret']) {
            if (!$token) {
                return ['success' => false, 'error' => 'Please enter 2FA code', 'requires_2fa' => true];
            }

            $tfa = new TwoFactorAuth('BusinessCard');
            if (!$tfa->verifyCode($user['secret'], $token)) {
                return ['success' => false, 'error' => 'Invalid 2FA code'];
            }
        }

        return [
            'success' => true,
            'user_id' => $user['id']
        ];
    } catch (PDOException $e) {
        throw new Exception('Login failed: ' . $e->getMessage());
    }
}

function save2FASecret($username, $secret) {
    try {
        $db = getDB();
        $stmt = $db->prepare("UPDATE users SET secret = ? WHERE username = ?");
        $stmt->execute([$secret, $username]);
        return true;
    } catch (PDOException $e) {
        throw new Exception('Failed to save 2FA secret: ' . $e->getMessage());
    }
} 