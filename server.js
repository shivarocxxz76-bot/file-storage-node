/**
 * Express Server Application Bootstrap
 * Web-Based Secure File Storage and Access Management System
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');
const cors = require('cors');

const connectDB = require('./config/db');
const seedData = require('./config/seed');
const { injectLocals } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB & Auto Seed
connectDB().then(async (conn) => {
    if (conn) {
        await seedData();
    }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'securevault_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Flash Messages
app.use(flash());

// Inject template global locals (user, notifications, flash messages)
app.use(injectLocals);

// Set View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Folders
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'secure_storage/avatars')));

// ---------------- Route Mounts ----------------
// 1. Landing Page
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Web-Based Secure File Storage & Access Management'
    });
});

// 2. Authentication Routes
app.use('/auth', require('./routes/authRoutes'));

// 3. User Workspace Routes
app.use('/', require('./routes/userRoutes'));
app.use('/files', require('./routes/fileRoutes'));
app.use('/folders', require('./routes/folderRoutes'));
app.use('/shared', require('./routes/shareRoutes'));
app.use('/', require('./routes/billingRoutes'));
app.use('/', require('./routes/supportRoutes'));

// 4. Administrator Routes
app.use('/admin', require('./routes/adminRoutes'));

// 404 Handler
app.use((req, res) => {
    res.status(404).render('index', {
        title: '404 - Page Not Found'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Application Error:', err);
    res.status(500).send(`
        <div style="font-family:sans-serif;max-width:600px;margin:50px auto;padding:25px;border:1px solid #ef4444;border-radius:8px;background:#fef2f2;color:#991b1b;">
            <h2>Server Application Error</h2>
            <p>${err.message || 'An unexpected error occurred.'}</p>
        </div>
    `);
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` ${process.env.APP_NAME || 'SecureVault'} Server is running on: http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`======================================================\n`);
});
