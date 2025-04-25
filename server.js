const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const viberService = require('./viber-service');

const app = express();
const port = process.env.PORT || 3000;

// Custom async handler
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: dataDir
    }),
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Basic routes
app.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// API Routes
app.post('/api/register', asyncHandler(async (req, res) => {
    const { username, password, phoneNumber } = req.body;

    if (!username || !password || !phoneNumber) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!/^\+[0-9]{10,15}$/.test(phoneNumber)) {
        return res.status(400).json({
            error: 'Invalid phone number format. Include country code (e.g., +1234567890)'
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.createUser(username, hashedPassword, phoneNumber);

    if (viberService.isEnabled()) {
        const sent = await viberService.sendVerificationCode(phoneNumber);
        if (!sent) {
            await db.deleteUser(username);
            return res.status(500).json({
                error: 'Failed to send verification code. Please try again.'
            });
        }
    }

    res.json({ 
        success: true,
        message: 'Registration successful. Please check Viber for verification code.'
    });
}));

app.post('/api/verify-phone', asyncHandler(async (req, res) => {
    const { phoneNumber, code } = req.body;

    if (!viberService.isEnabled()) {
        await db.updateVerificationStatus(phoneNumber, true);
        return res.json({ success: true });
    }

    if (viberService.verifyCode(phoneNumber, code)) {
        await db.updateVerificationStatus(phoneNumber, true);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid or expired code' });
    }
}));

app.post('/api/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const user = await db.getUser(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_verified) {
        return res.status(401).json({ error: 'Please verify your phone number' });
    }

    if (viberService.isEnabled()) {
        const sent = await viberService.sendVerificationCode(user.phone_number);
        if (!sent) {
            return res.status(500).json({
                error: 'Failed to send verification code'
            });
        }

        req.session.pendingLogin = {
            username: user.username,
            phoneNumber: user.phone_number
        };

        return res.json({
            requiresVerification: true,
            message: 'Check your Viber for the verification code'
        });
    }

    // If Viber is not enabled, proceed with direct login
    req.session.user = {
        id: user.id,
        username: user.username,
        authenticated: true
    };

    res.json({ success: true });
}));

app.post('/api/verify-login', asyncHandler(async (req, res) => {
    const { code } = req.body;
    const pendingLogin = req.session.pendingLogin;

    if (!pendingLogin) {
        return res.status(400).json({ error: 'No pending login found' });
    }

    if (!viberService.isEnabled() || viberService.verifyCode(pendingLogin.phoneNumber, code)) {
        const user = await db.getUser(pendingLogin.username);
        req.session.user = {
            id: user.id,
            username: user.username,
            authenticated: true
        };
        delete req.session.pendingLogin;
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid or expired code' });
    }
}));

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'An error occurred' 
            : err.message
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    if (!viberService.isEnabled()) {
        console.log('Warning: Viber service is not enabled. Running in fallback mode.');
    }
});