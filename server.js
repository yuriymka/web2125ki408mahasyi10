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
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    // If user needs to set up 2FA, redirect them
    if (req.session.user.needs2FA && req.path !== '/setup-2fa') {
        return res.redirect('/setup-2fa');
    }
    
    next();
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
        
        // Set the user session for 2FA setup
        req.session.user = {
            username: username,
            id: userId,
            registering: true // Flag to indicate registration in progress
        };
        
        res.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: 'Username already exists or registration failed' });
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
        console.log('User found:', !!user);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPassword);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if 2FA is set up
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
            needs2FA: !user.secret // Set needs2FA if user hasn't set up 2FA yet
        };

        res.json({ 
            success: true,
            redirect: user.secret ? '/' : '/setup-2fa'
        });
    } catch (error) {
        console.error('Login error:', error);
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

// Add this new route for 2FA verification
app.post('/api/verify-2fa', async (req, res) => {
    try {
        const { token, secret } = req.body;

        if (!token || !secret) {
            return res.status(400).json({ error: 'Token and secret are required' });
        }

        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (verified) {
            // Update user's secret in database
            if (req.session.user) {
                await db.updateUserSecret(req.session.user.username, secret);
                // Remove the registering flag
                delete req.session.user.registering;
            }
            res.json({ success: true });
        } else {
            res.json({ success: false, error: 'Invalid code. Please try again.' });
        }
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: 'Server error during verification' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});