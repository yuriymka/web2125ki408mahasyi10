const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Add this debug middleware to log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

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

app.get('/setup-2fa', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'setup-2fa.html'), { root: '/' });
});

// Authentication routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        await db.createUser(username, password);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Username already exists' });
    }
});

app.post('/api/login', async (req, res) => {
    console.log('Login attempt:', { username: req.body.username, hasToken: !!req.body.token });
    
    try {
        const { username, password, token } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await db.getUser(username);
        console.log('User found:', !!user); // Debug log

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPassword); // Debug log

        if (!validPassword) {
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
                window: 2 // Allow 2 time steps before and after for clock drift
            });
            console.log('2FA verification:', verified); // Debug log

            if (!verified) {
                return res.status(401).json({ error: 'Invalid 2FA token' });
            }
        }

        // Set user session
        req.session.user = { 
            username: user.username,
            id: user.id
        };
        console.log('Session created:', req.session.user); // Debug log

        res.json({ 
            success: true,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error); // Debug log
        res.status(500).json({ error: 'Server error during login' });
    }
});

app.post('/api/setup-2fa', requireAuth, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({ length: 20 });
        await db.updateUserSecret(req.session.user.username, secret.base32);

        const otpAuthUrl = speakeasy.otpauthURL({
            secret: secret.base32,
            label: req.session.user.username,
            issuer: 'BusinessCard'
        });

        const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);
        res.json({ secret: secret.base32, qrCode: qrCodeUrl });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
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

// Add a route to check session status
app.get('/api/session', (req, res) => {
    res.json({
        isAuthenticated: !!req.session.user,
        user: req.session.user || null
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});