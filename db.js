const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'users.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        phone_number TEXT UNIQUE,
        secret TEXT,
        is_verified BOOLEAN DEFAULT 0,
        viber_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

const dbOperations = {
    createUser: (username, password, phoneNumber) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, password, phone_number) VALUES (?, ?, ?)',
                [username, password, phoneNumber],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    },

    getUser: (username) => {
        console.log('Getting user:', username);
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username],
                (err, row) => {
                    if (err) {
                        console.error('Error getting user:', err);
                        reject(err);
                    } else {
                        console.log('User found:', !!row);
                        resolve(row);
                    }
                });
        });
    },

    updateUserSecret: (username, secret) => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE users SET secret = ? WHERE username = ?',
                [secret, username],
                function(err) {
                    if (err) {
                        console.error('Error updating secret:', err);
                        reject(err);
                    } else {
                        console.log('Secret updated for user:', username);
                        resolve(this.changes);
                    }
                });
        });
    },

    updateViberId: (username, viberId) => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE users SET viber_id = ? WHERE username = ?',
                [viberId, username],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
        });
    },

    getUserByViberId: (viberId) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE viber_id = ?', [viberId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
        });
    },

    updateVerificationStatus: (phoneNumber, status) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET is_verified = ? WHERE phone_number = ?',
                [status, phoneNumber],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    },

    getUserByPhone: (phoneNumber) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE phone_number = ?', [phoneNumber],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
        });
    }
};

// Add a test method to check database connection 
dbOperations.testConnection = () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT 1', (err, row) => {
            if (err) {
                console.error('Database connection test failed:', err);
                reject(err);
            } else {
                console.log('Database connection test successful');
                resolve(true);
            }
        });
    });
};

// Test connection when the module loads
dbOperations.testConnection()
    .catch(err => console.error('Initial database connection test failed:', err));

module.exports = dbOperations; 
// idk if it works, but it's the only way i found to make it work in production
// i'm not sure if it's the best way to do it, but it works for now
// i'm not sure if it's the best way to do it, but it works for now
// i'm not sure if it's the best way to do it, but it works for now
// i'm not sure if it's the best way to do it, but it works for now
// i'm not sure if it's the best way to do it, but it works for now

