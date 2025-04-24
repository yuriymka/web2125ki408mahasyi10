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
const { spawn } = require('child_process');
const { bot, generateVerificationCode, sendVerificationCode, storeVerificationCode, verifyCode } = require('./viber');
const viberService = require('./viber-service');

const app = express();
const port = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = process.env.NODE_ENV === 'production'
    ? '/opt/render/project/src/data'
    : path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Place this before any routes
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to false for now (we'll handle this better later)
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// If in production, update cookie settings
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // trust first proxy
    sessionConfig.cookie.secure = true; // serve secure cookies
    sessionConfig.cookie.sameSite = 'none'; // allow cross-site cookie
}

// Initialize session with the config
app.use(session(sessionConfig));

// Add this middleware to log session data on every request
app.use((req, res, next) => {
    console.log('Request URL:', req.url);
    console.log('Session Data:', req.session);
    next();
});

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
    console.log('Auth check - Full session:', req.session);
    
    if (!req.session || !req.session.user || !req.session.user.authenticated) {
        console.log('Not authenticated, redirecting to login');
        return res.redirect('/login');
    }
    
    console.log('Authentication successful for user:', req.session.user.username);
    next();
};

// Serve static HTML files
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    if (req.session.user && req.session.user.authenticated) {
        return res.redirect('/');
    }
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
        const { username, password, phoneNumber } = req.body;

        // Validate phone number format
        if (!/^\+[0-9]{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({
                error: 'Invalid phone number format. Please include country code (e.g., +1234567890)'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        await db.createUser(username, hashedPassword, phoneNumber);

        // Send verification code via Viber
        const sent = await viberService.sendVerificationCode(phoneNumber);
        if (!sent) {
            return res.status(500).json({
                error: 'Failed to send verification code. Please ensure you have Viber installed.'
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: error.message || 'Registration failed'
        });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.getUser(username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.is_verified) {
            return res.status(401).json({
                error: 'Please verify your phone number first'
            });
        }

        // Send login verification code
        const sent = await viberService.sendVerificationCode(user.phone_number);
        if (!sent) {
            return res.status(500).json({
                error: 'Failed to send login verification code'
            });
        }

        // Store phone number in session for verification
        req.session.pendingLogin = {
            username: user.username,
            phoneNumber: user.phone_number
        };

        res.json({
            requiresVerification: true,
            message: 'Please check your Viber for the verification code'
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
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.redirect('/login');
    });
});

// Add PHP handler middleware
const handlePhp = (req, res, next) => {
    if (req.url.endsWith('.php')) {
        const phpScript = path.join(__dirname, 'views', path.basename(req.url));
        const php = spawn('php', ['-f', phpScript]);
        
        let output = '';
        
        php.stdout.on('data', (data) => {
            output += data.toString();
        });

        php.stderr.on('data', (data) => {
            console.error(`PHP Error: ${data}`);
        });

        php.on('close', (code) => {
            if (code === 0) {
                res.send(output);
            } else {
                res.status(500).send('PHP execution failed');
            }
        });

        // Pass GET/POST data to PHP
        if (req.method === 'POST') {
            php.stdin.write(JSON.stringify(req.body));
        }
        php.stdin.end();
    } else {
        next();
    }
};

// Add the middleware
app.use(handlePhp);

// Update routes to handle both PHP and HTML versions
app.get('/get-page', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'get-page.html'));
});

app.get('/post-page', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'post-page.html'));
});

app.get('/ajax-forms', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ajax-forms.html'));
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
        isAuthenticated: !!(req.session.user && req.session.user.authenticated),
        user: req.session.user || null
    });
});

// Verify 2FA endpoint
app.post('/api/verify-2fa', async (req, res) => {
    try {
        const { token, secret } = req.body;
        
        if (!token || !secret) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token and secret are required' 
            });
        }

        console.log('Verifying token:', { token, hasSecret: !!secret });

        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps before and after
        });

        console.log('Verification result:', verified);

        if (verified) {
            // Update the user's verified status in the session
            if (req.session.user) {
                req.session.user.verified2FA = true;
                // Save the verified secret in the database
                await db.updateUserSecret(req.session.user.username, secret);
            }
            res.json({ success: true });
        } else {
            res.json({ 
                success: false, 
                error: 'Invalid token. Please try again.' 
            });
        }
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Verification failed' 
        });
    }
});

// Add PHP session handling middleware
app.use((req, res, next) => {
    if (req.url.endsWith('.php')) {
        const phpSession = req.cookies['PHPSESSID'];
        if (phpSession) {
            req.session = req.session || {};
            req.session.phpSession = phpSession;
        }
    }
    next();
});

// Add Viber webhook
app.post('/viber/webhook', bot.middleware());

// Add Viber connection endpoint
app.post('/api/connect-viber', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { viberId } = req.body;
        await db.updateViberId(req.session.user.username, viberId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Viber connection error:', error);
        res.status(500).json({ error: 'Failed to connect Viber' });
    }
});

// Login verification endpoint
app.post('/api/verify-login', async (req, res) => {
    try {
        const { code } = req.body;
        const pendingLogin = req.session.pendingLogin;

        if (!pendingLogin) {
            return res.status(400).json({
                error: 'No pending login found'
            });
        }

        if (viberService.verifyCode(pendingLogin.phoneNumber, code)) {
            const user = await db.getUser(pendingLogin.username);
            
            req.session.user = {
                id: user.id,
                username: user.username,
                authenticated: true
            };

            delete req.session.pendingLogin;
            res.json({ success: true });
        } else {
            res.status(400).json({
                error: 'Invalid or expired verification code'
            });
        }
    } catch (error) {
        console.error('Login verification error:', error);
        res.status(500).json({
            error: 'Verification failed'
        });
    }
});

// Phone verification endpoint
app.post('/api/verify-phone', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;

        if (viberService.verifyCode(phoneNumber, code)) {
            await db.updateVerificationStatus(phoneNumber, true);
            res.json({ success: true });
        } else {
            res.status(400).json({
                error: 'Invalid or expired verification code'
            });
        }
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            error: 'Verification failed'
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});