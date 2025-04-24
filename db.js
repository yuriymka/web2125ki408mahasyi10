const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Use different paths for development and production
const dataDir = process.env.NODE_ENV === 'production'
    ? '/opt/render/project/src/data'
    : path.join(__dirname, 'data');

// Ensure data directory exists
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
        secret TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

const dbOperations = {
    createUser: async (username, password) => {
        console.log('Creating user:', username);
        const hashedPassword = await bcrypt.hash(password, 10);
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword],
                function(err) {
                    if (err) {
                        console.error('Error creating user:', err);
                        reject(err);
                    } else {
                        console.log('User created successfully:', username);
                        resolve(this.lastID);
                    }
                });
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
                (err) => {
                    if (err) reject(err);
                    else resolve();
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