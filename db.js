const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Use different paths for development and production
const dbPath = process.env.NODE_ENV === 'production'
    ? path.join('/opt/render/project/src/data', 'users.db')
    : path.join(__dirname, 'users.db');

// Ensure the directory exists
const fs = require('fs');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

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
        const hashedPassword = await bcrypt.hash(password, 10);
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });
    },

    getUser: (username) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
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

module.exports = dbOperations; 