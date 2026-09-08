/**
 * File Sharing & Access Control Controller
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const File = require('../models/File');
const User = require('../models/User');
const SharedFile = require('../models/SharedFile');
const { logActivity, createNotification } = require('../middleware/activityLogger');
const { formatBytes, timeAgo, getFileIcon } = require('../middleware/helpers');

// Create Share (Direct email or Public Token Link)
exports.createShare = async (req, res) => {
    try {
        const { file_id, share_type, recipient_email, permission, access_password, expiry_days } = req.body;
        const userId = req.session.userId;

        const file = await File.findOne({ _id: file_id, user: userId, is_deleted: false });
        if (!file) {
            req.flash('danger', 'File not found or access denied.');
            return res.redirect('/files');
        }

        let expiresAt = null;
        if (expiry_days && expiry_days !== 'never' && !isNaN(expiry_days)) {
            const days = parseInt(expiry_days);
            expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }

        const shareToken = crypto.randomBytes(24).toString('hex');
        let hashedPassword = null;
        if (access_password && access_password.trim()) {
            hashedPassword = await bcrypt.hash(access_password.trim(), 10);
        }

        if (share_type === 'user') {
            if (!recipient_email) {
                req.flash('danger', 'Please enter the recipient email address.');
                return res.redirect('/files');
            }

            const recipient = await User.findOne({ email: recipient_email.toLowerCase().trim() });
            if (!recipient) {
                req.flash('danger', `No registered user found with email: ${recipient_email}`);
                return res.redirect('/files');
            }

            if (recipient._id.toString() === userId.toString()) {
                req.flash('warning', 'You cannot share a file with yourself.');
                return res.redirect('/files');
            }

            const share = await SharedFile.create({
                file: file._id,
                shared_by: userId,
                shared_with: recipient._id,
                share_token: shareToken,
                permission: permission || 'download',
                access_password: hashedPassword,
                expires_at: expiresAt
            });

            await createNotification(
                recipient._id,
                'File Shared with You',
                `${req.session.userName} shared "${file.original_name}" with you (${permission} permission).`,
                'info',
                '/shared'
            );

            await logActivity(req, userId, 'SHARE_FILE', `Shared "${file.original_name}" with ${recipient.full_name} (${recipient.email})`, 'share', share._id);
            req.flash('success', `File successfully shared with ${recipient.full_name}!`);
            res.redirect('/shared');
        } else {
            const share = await SharedFile.create({
                file: file._id,
                shared_by: userId,
                shared_with: null,
                share_token: shareToken,
                permission: permission || 'download',
                access_password: hashedPassword,
                expires_at: expiresAt
            });

            await logActivity(req, userId, 'CREATE_SHARE_LINK', `Created public share link for "${file.original_name}"`, 'share', share._id);
            req.flash('success', `Public share link created successfully!`);
            res.redirect('/shared');
        }
    } catch (err) {
        console.error('Share creation error:', err);
        req.flash('danger', 'Failed to share file.');
        res.redirect('/files');
    }
};

// Revoke Share Permission
exports.revokeShare = async (req, res) => {
    try {
        const { share_id } = req.body;
        const userId = req.session.userId;
        const userRole = req.session.userRole;

        const share = await SharedFile.findById(share_id).populate('file');
        if (share && (share.shared_by.toString() === userId.toString() || userRole === 'admin')) {
            await SharedFile.findByIdAndDelete(share._id);
            await logActivity(req, userId, 'REVOKE_SHARE', `Revoked sharing access for "${share.file ? share.file.original_name : 'File'}"`, 'share', share._id);
            req.flash('success', 'File sharing access revoked.');
        } else {
            req.flash('danger', 'Share record not found or permission denied.');
        }

        res.redirect('/shared');
    } catch (err) {
        console.error('Revoke share error:', err);
        req.flash('danger', 'Failed to revoke share.');
        res.redirect('/shared');
    }
};

// Public Access Viewer (Handles /shared/:token)
exports.viewSharedLink = async (req, res) => {
    try {
        const token = req.params.token;
        const share = await SharedFile.findOne({ share_token: token })
            .populate('file')
            .populate('shared_by', 'full_name email');

        if (!share || !share.file || share.file.is_deleted) {
            return res.render('public/shared_view', {
                title: 'File Not Found',
                error: 'The shared link is invalid, expired, or the file has been deleted.',
                share: null,
                authorized: false,
                requiresPassword: false,
                formatBytes,
                timeAgo,
                getFileIcon,
                layout: false
            });
        }

        if (share.expires_at && new Date(share.expires_at) < new Date()) {
            return res.render('public/shared_view', {
                title: 'Link Expired',
                error: `This share link expired on ${share.expires_at.toDateString()}.`,
                share: null,
                authorized: false,
                requiresPassword: false,
                formatBytes,
                timeAgo,
                getFileIcon,
                layout: false
            });
        }

        const requiresPassword = !!share.access_password;
        let authorized = !requiresPassword;
        let passwordError = null;

        if (requiresPassword && req.method === 'POST') {
            const enteredPass = req.body.passcode || '';
            const isMatch = await bcrypt.compare(enteredPass, share.access_password);
            if (isMatch) {
                authorized = true;
            } else {
                passwordError = 'Incorrect passcode entered. Please try again.';
            }
        }

        res.render('public/shared_view', {
            title: `Shared: ${share.file.original_name}`,
            share,
            authorized,
            requiresPassword,
            passwordError,
            error: null,
            formatBytes,
            timeAgo,
            getFileIcon,
            layout: false
        });
    } catch (err) {
        console.error('Shared link view error:', err);
        res.status(500).send('Error loading shared file.');
    }
};
