/**
 * Authentication Controller (Register, Login, Logout)
 */

const User = require('../models/User');
const StoragePlan = require('../models/StoragePlan');
const { logActivity } = require('../middleware/activityLogger');

// Render Login Page
exports.getLogin = (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', {
        title: 'Sign In'
    });
};

// Process Login
exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            req.flash('danger', 'Please provide both email and password.');
            return res.redirect('/auth/login');
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            req.flash('danger', 'No account found with this email. Please click "Create Free Account" to register or use the Demo buttons below.');
            return res.redirect('/auth/login');
        }

        if (user.status === 'suspended') {
            req.flash('danger', 'Your account has been suspended by the administrator.');
            return res.redirect('/auth/login');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('danger', 'Incorrect password entered. Please try again.');
            return res.redirect('/auth/login');
        }

        // Establish session
        req.session.userId = user._id.toString();
        req.session.userRole = user.role;
        req.session.userName = user.full_name;
        req.session.userEmail = user.email;

        // Update last login
        user.last_login = new Date();
        await user.save();

        await logActivity(req, user._id, 'LOGIN', 'Logged into user workspace', 'auth', user._id);

        req.flash('success', `Welcome back, ${user.full_name}!`);
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        req.flash('danger', 'Authentication error occurred.');
        res.redirect('/auth/login');
    }
};

// Render Registration Page
exports.getRegister = (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('auth/register', {
        title: 'Create Account'
    });
};

// Process Registration
exports.postRegister = async (req, res) => {
    try {
        const { full_name, email, password, confirm_password } = req.body;

        if (!full_name || !email || !password) {
            req.flash('danger', 'Please fill in all required fields.');
            return res.redirect('/auth/register');
        }

        if (password.length < 6) {
            req.flash('danger', 'Password must be at least 6 characters long.');
            return res.redirect('/auth/register');
        }

        if (password !== confirm_password) {
            req.flash('danger', 'Passwords do not match.');
            return res.redirect('/auth/register');
        }

        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            req.flash('danger', 'An account with this email already exists.');
            return res.redirect('/auth/register');
        }

        // Assign Free Starter Plan by default
        const freePlan = await StoragePlan.findOne({ plan_name: 'Free Starter' });

        const newUser = await User.create({
            full_name: full_name.trim(),
            email: email.toLowerCase().trim(),
            password: password,
            role: 'user',
            storage_plan: freePlan ? freePlan._id : null,
            storage_limit_bytes: freePlan ? freePlan.storage_bytes : 524288000
        });

        await logActivity(req, newUser._id, 'REGISTER', 'Created new account with 500MB Free Starter quota', 'auth', newUser._id);

        req.flash('success', 'Registration successful! Please sign in with your email and password.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error('Register error:', err);
        req.flash('danger', 'Registration failed. Please try again.');
        res.redirect('/auth/register');
    }
};

// Process Logout
exports.logout = async (req, res) => {
    if (req.session && req.session.userId) {
        await logActivity(req, req.session.userId, 'LOGOUT', 'Logged out of session', 'auth');
    }
    req.session.destroy(() => {
        res.redirect('/auth/login');
    });
};
