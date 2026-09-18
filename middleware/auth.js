/**
 * Authentication and RBAC Route Guards Middleware
 */

const User = require('../models/User');
const Notification = require('../models/Notification');
const { formatBytes, timeAgo, getFileIcon } = require('./helpers');

// Ensure user is authenticated
const isAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    req.flash('danger', 'Please sign in to access your secure storage workspace.');
    res.redirect('/auth/login');
};

// Ensure user has Admin role
const isAdmin = (req, res, next) => {
    if (req.session && req.session.userId && req.session.userRole === 'admin') {
        return next();
    }
    req.flash('danger', 'Access denied. Administrative authorization required.');
    res.redirect('/dashboard');
};

// Global template locals injector
const injectLocals = async (req, res, next) => {
    res.locals.appName = process.env.APP_NAME || 'SecureVault';
    res.locals.appTagline = process.env.APP_TAGLINE || 'Web-Based Secure File Storage & Access Management';
    res.locals.currentUrl = req.originalUrl || '';
    res.locals.messages = req.flash();
    res.locals.user = null;
    res.locals.unreadNotifsCount = 0;
    res.locals.recentNotifs = [];
    res.locals.formatBytes = formatBytes;
    res.locals.timeAgo = timeAgo;
    res.locals.getFileIcon = getFileIcon;

    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId).populate('storage_plan');
            if (user) {
                res.locals.user = user;
                res.locals.unreadNotifsCount = await Notification.countDocuments({ user: user._id, is_read: false });
                res.locals.recentNotifs = await Notification.find({ user: user._id }).sort({ createdAt: -1 }).limit(5);
            }
        } catch (err) {
            console.error('[Locals Inject Error]', err.message);
        }
    }
    next();
};

module.exports = {
    isAuth,
    isAdmin,
    injectLocals
};
