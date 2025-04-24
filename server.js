const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('./db');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = process.env.NODE_ENV === 'production'
    ? '/opt/render/project/src/data'
    : path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Configure session before other middleware
app.use(session({
    store: new SQLiteStore({
        dir: dataDir,
        db: 'sessions.db',
        table: 'sessions'
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Debug middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Session:', req.session);
    next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    // If user needs to set up 2FA, redirect them
    if (req.session.user.needs2FA && req.path !== '/setup-2fa') {
        return res.redirect('/setup-2fa');
    }
    
    next();
};

// Serve static HTML files
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'), { root: '/' });
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'), { root: '/' });
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'), { root: '/' });
});

app.get('/setup-2fa', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'setup-2fa.html'), { root: '/' });
});

// Authentication routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userId = await db.createUser(username, password);
        
        // Set session data
        req.session.user = {
            username: username,
            id: userId,
            isRegistering: true
        };
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Session error' });
            }
            console.log('Session saved:', req.session);
            res.json({ success: true });
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: 'Username already exists or registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password, token } = req.body;
        const user = await db.getUser(username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.secret) {
            if (!token) {
                return res.status(400).json({ 
                    error: 'Please enter your 2FA token',
                    requires2FA: true 
                });
            }

            const verified = speakeasy.totp.verify({
                secret: user.secret,
                encoding: 'base32',
                token: token,
                window: 2
            });

            if (!verified) {
                return res.status(401).json({ error: 'Invalid 2FA token' });
            }
        }

        req.session.user = {
            username: user.username,
            id: user.id,
            has2FA: !!user.secret
        };

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Session error' });
            }
            res.json({ success: true });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/setup-2fa', async (req, res) => {
    console.log('Setup 2FA - Session:', req.session);
    
    if (!req.session.user) {
        console.log('No user session found');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        // Generate new secret
        const secret = speakeasy.generateSecret({
            name: `BusinessCard:${req.session.user.username}`,
            length: 20
        });

        // Generate QR code
        const otpAuthUrl = speakeasy.otpauthURL({
            secret: secret.base32,
            label: req.session.user.username,
            issuer: 'BusinessCard',
            encoding: 'base32'
        });

        const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);
        
        // Store secret temporarily in session
        req.session.tempSecret = secret.base32;
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Session error' });
            }
            console.log('Session updated with temp secret');
            res.json({
                success: true,
                secret: secret.base32,
                qrCode: qrCodeUrl
            });
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Original routes with auth middleware
app.get('/get-page', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'get-page.html'), { root: '/' });
});

app.get('/post-page', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'post-page.html'), { root: '/' });
});

app.get('/ajax-forms', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ajax-forms.html'), { root: '/' });
});

// API endpoints
app.get('/api/data', (req, res) => {
    const data = {
        name: 'John Doe',
        title: 'Full Stack Developer',
        timestamp: new Date().toISOString()
    };
    res.json(data);
});

app.post('/api/data', (req, res) => {
    const receivedData = req.body;
    const responseData = {
        ...receivedData,
        timestamp: new Date().toISOString()
    };
    res.json(responseData);
});

// Add a session check endpoint
app.get('/api/session-check', (req, res) => {
    res.json({
        isAuthenticated: !!req.session.user,
        user: req.session.user || null
    });
});

// Verification endpoint
app.post('/api/verify-2fa', async (req, res) => {
    console.log('Verify 2FA - Session:', req.session);

    if (!req.session.user || !req.session.tempSecret) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    try {
        const { token } = req.body;
        const secret = req.session.tempSecret;

        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (verified) {
            await db.updateUserSecret(req.session.user.username, secret);
            req.session.user.has2FA = true;
            delete req.session.tempSecret;
            delete req.session.user.isRegistering;

            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Session error' });
                }
                res.json({ success: true });
            });
        } else {
            res.json({ success: false, error: 'Invalid token' });
        }
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});