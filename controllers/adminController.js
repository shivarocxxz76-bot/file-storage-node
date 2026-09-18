/**
 * Administrator Controller (Analytics, User Quotas, Content Moderation, Plans, Payments, Logs, Settings)
 * Tailored strictly for user monitoring & regular user activity tracking
 */

const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const File = require('../models/File');
const Folder = require('../models/Folder');
const StoragePlan = require('../models/StoragePlan');
const Payment = require('../models/Payment');
const SupportTicket = require('../models/SupportTicket');
const SupportReply = require('../models/SupportReply');
const ActivityLog = require('../models/ActivityLog');
const Setting = require('../models/Setting');
const { uploadFilesDir } = require('../middleware/upload');
const { logActivity, createNotification } = require('../middleware/activityLogger');
const { formatBytes, timeAgo, getFileIcon } = require('../middleware/helpers');

// Admin Analytics Dashboard (Filtered Strictly for User Activity)
exports.getDashboard = async (req, res) => {
    try {
        // Fetch all standard (non-admin) users
        const standardUsers = await User.find({ role: { $ne: 'admin' } }).populate('storage_plan');
        const userIds = standardUsers.map(u => u._id);
        const totalUsers = standardUsers.length;

        // Fetch user files only
        const userFiles = await File.find({ user: { $in: userIds }, is_deleted: false });
        const totalFiles = userFiles.length;
        const totalStorageBytes = userFiles.reduce((acc, f) => acc + f.file_size, 0);

        // Fetch user completed payments
        const userPayments = await Payment.find({ user: { $in: userIds }, status: 'completed' });
        const totalRevenue = userPayments.reduce((acc, p) => acc + p.amount, 0);

        // Recent 5 standard users
        const recentUsers = standardUsers.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

        // Recent 5 user payments
        const recentPayments = await Payment.find({ user: { $in: userIds } })
            .populate('user')
            .populate('plan')
            .sort({ payment_date: -1 })
            .limit(5);

        // Dynamic Monthly User File Upload Counts
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();
        const monthlyCounts = new Array(12).fill(0);

        userFiles.forEach(f => {
            const d = new Date(f.createdAt);
            if (d.getFullYear() === currentYear) {
                monthlyCounts[d.getMonth()] += 1;
            }
        });

        // Dynamic Monthly User Revenue Amounts
        const monthlyRevenue = new Array(12).fill(0);
        userPayments.forEach(p => {
            const d = new Date(p.payment_date);
            if (d.getFullYear() === currentYear) {
                monthlyRevenue[d.getMonth()] += Number(p.amount.toFixed(2));
            }
        });

        const monthlyUploadsData = {
            months,
            counts: monthlyCounts
        };

        const revenueData = {
            months,
            amounts: monthlyRevenue
        };

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            totalUsers,
            totalFiles,
            totalStorageFormatted: formatBytes(totalStorageBytes),
            totalRevenue: totalRevenue.toFixed(2),
            recentUsers,
            recentPayments,
            monthlyUploadsData,
            revenueData,
            formatBytes,
            timeAgo
        });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).send('Error loading admin dashboard');
    }
};

// Manage Users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().populate('storage_plan').sort({ createdAt: -1 });
        const plans = await StoragePlan.find({ is_active: true }).sort({ price: 1 });

        const userList = await Promise.all(users.map(async u => {
            const count = await File.countDocuments({ user: u._id, is_deleted: false });
            return {
                ...u._doc,
                total_files: count
            };
        }));

        res.render('admin/users', {
            title: 'User Management',
            users: userList,
            plans,
            formatBytes,
            timeAgo
        });
    } catch (err) {
        console.error('Admin users error:', err);
        res.redirect('/admin/dashboard');
    }
};

// Toggle User Status (Active <-> Suspended)
exports.toggleUserStatus = async (req, res) => {
    try {
        const { target_user_id, new_status } = req.body;
        const adminId = req.session.userId;

        if (target_user_id.toString() === adminId.toString()) {
            req.flash('danger', 'You cannot suspend your own admin account.');
            return res.redirect('/admin/users');
        }

        await User.findByIdAndUpdate(target_user_id, { status: new_status });
        await logActivity(req, adminId, 'ADMIN_USER_STATUS', `Changed user #${target_user_id} status to ${new_status}`, 'user', target_user_id);

        req.flash('success', `User status updated to ${new_status}.`);
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Toggle status error:', err);
        req.flash('danger', 'Failed to update user status.');
        res.redirect('/admin/users');
    }
};

// Adjust User Storage Quota & Assign Roles
exports.updateUserQuota = async (req, res) => {
    try {
        const { target_user_id, plan_id, storage_limit_mb, role } = req.body;
        const limitBytes = parseInt(storage_limit_mb) * 1024 * 1024;
        const adminId = req.session.userId;

        const updateData = {
            storage_plan: plan_id || null,
            storage_limit_bytes: limitBytes
        };
        if (role) updateData.role = role;

        await User.findByIdAndUpdate(target_user_id, updateData);

        await createNotification(
            target_user_id,
            'Storage Limit Adjusted',
            `Your storage limit has been updated to ${formatBytes(limitBytes)} by the administrator.`,
            'info',
            '/storage-plans'
        );

        await logActivity(req, adminId, 'ADMIN_QUOTA_UPDATE', `Updated quota for user #${target_user_id} to ${formatBytes(limitBytes)}`, 'user', target_user_id);
        req.flash('success', 'User storage quota and role updated successfully.');
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Quota update error:', err);
        req.flash('danger', 'Failed to update quota.');
        res.redirect('/admin/users');
    }
};

// Delete User Account & Purge Data
exports.deleteUser = async (req, res) => {
    try {
        const { target_user_id } = req.body;
        const adminId = req.session.userId;

        if (target_user_id.toString() === adminId.toString()) {
            req.flash('danger', 'Cannot delete your own admin account.');
            return res.redirect('/admin/users');
        }

        const files = await File.find({ user: target_user_id });
        files.forEach(f => {
            const p = path.join(uploadFilesDir, f.stored_name);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });

        await File.deleteMany({ user: target_user_id });
        await User.findByIdAndDelete(target_user_id);

        await logActivity(req, adminId, 'ADMIN_DELETE_USER', `Deleted user #${target_user_id} and all files`, 'user', target_user_id);
        req.flash('success', 'User and all associated files permanently deleted.');
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Delete user error:', err);
        req.flash('danger', 'Failed to delete user.');
        res.redirect('/admin/users');
    }
};

// Global File Inspector
exports.getFiles = async (req, res) => {
    try {
        const files = await File.find().populate('user', 'full_name email').populate('folder', 'folder_name').sort({ createdAt: -1 });
        const totalStorageBytes = files.filter(f => !f.is_deleted).reduce((acc, f) => acc + f.file_size, 0);

        res.render('admin/files', {
            title: 'Global File Inspector',
            files,
            totalFiles: files.length,
            totalStorageFormatted: formatBytes(totalStorageBytes),
            formatBytes,
            timeAgo,
            getFileIcon
        });
    } catch (err) {
        console.error('Admin files error:', err);
        res.redirect('/admin/dashboard');
    }
};

// Force Delete File (Moderator)
exports.forceDeleteFile = async (req, res) => {
    try {
        const fileId = req.body.file_id;
        const adminId = req.session.userId;

        const file = await File.findById(fileId);
        if (file) {
            const p = path.join(uploadFilesDir, file.stored_name);
            if (fs.existsSync(p)) fs.unlinkSync(p);

            const fileSize = file.file_size;
            const ownerId = file.user;

            await File.findByIdAndDelete(file._id);
            await User.findByIdAndUpdate(ownerId, { $inc: { storage_used_bytes: -fileSize } });

            await createNotification(
                ownerId,
                'File Moderated/Removed',
                `Your file "${file.original_name}" was removed by the administrator for policy compliance.`,
                'warning',
                '/files'
            );

            await logActivity(req, adminId, 'ADMIN_DELETE_FILE', `Force deleted file: ${file.original_name}`, 'file', file._id);
            req.flash('success', 'File removed permanently.');
        }

        res.redirect('/admin/files');
    } catch (err) {
        console.error('Force delete error:', err);
        req.flash('danger', 'Failed to remove file.');
        res.redirect('/admin/files');
    }
};

// Manage Storage Plans
exports.getPlans = async (req, res) => {
    try {
        const plans = await StoragePlan.find().sort({ price: 1 });
        const planList = await Promise.all(plans.map(async p => {
            const count = await User.countDocuments({ storage_plan: p._id });
            return {
                ...p._doc,
                subscriber_count: count
            };
        }));

        res.render('admin/plans', {
            title: 'Storage Plan Manager',
            plans: planList,
            formatBytes
        });
    } catch (err) {
        console.error('Admin plans error:', err);
        res.redirect('/admin/dashboard');
    }
};

// Save Plan (Create / Update)
exports.savePlan = async (req, res) => {
    try {
        const { plan_id, plan_name, storage_mb, price, billing_cycle, description, max_file_mb } = req.body;
        const adminId = req.session.userId;
        const storageBytes = parseInt(storage_mb) * 1024 * 1024;
        const maxFileBytes = parseInt(max_file_mb || 50) * 1024 * 1024;

        if (plan_id) {
            await StoragePlan.findByIdAndUpdate(plan_id, {
                plan_name: plan_name.trim(),
                storage_bytes: storageBytes,
                price: parseFloat(price),
                billing_cycle,
                description,
                max_file_size: maxFileBytes
            });
            await logActivity(req, adminId, 'ADMIN_UPDATE_PLAN', `Updated storage plan: ${plan_name}`, 'system');
            req.flash('success', `Plan "${plan_name}" updated.`);
        } else {
            await StoragePlan.create({
                plan_name: plan_name.trim(),
                storage_bytes: storageBytes,
                price: parseFloat(price),
                billing_cycle,
                description,
                max_file_size: maxFileBytes,
                is_active: true
            });
            await logActivity(req, adminId, 'ADMIN_CREATE_PLAN', `Created new storage plan: ${plan_name}`, 'system');
            req.flash('success', `New plan "${plan_name}" added.`);
        }

        res.redirect('/admin/plans');
    } catch (err) {
        console.error('Save plan error:', err);
        req.flash('danger', 'Failed to save plan.');
        res.redirect('/admin/plans');
    }
};

// Global Transactions Ledger
exports.getPayments = async (req, res) => {
    try {
        const payments = await Payment.find().populate('user', 'full_name email').populate('plan').sort({ payment_date: -1 });
        const totalRevenue = payments.reduce((acc, p) => acc + (p.status === 'completed' ? p.amount : 0), 0);

        res.render('admin/payments', {
            title: 'System Transactions',
            payments,
            totalRevenue: totalRevenue.toFixed(2),
            formatBytes,
            timeAgo
        });
    } catch (err) {
        console.error('Admin payments error:', err);
        res.redirect('/admin/dashboard');
    }
};

// Admin Support Tickets
exports.getSupport = async (req, res) => {
    try {
        const ticketId = req.query.ticket_id;
        let activeTicket = null;
        let ticketReplies = [];

        if (ticketId) {
            activeTicket = await SupportTicket.findById(ticketId).populate('user', 'full_name email');
            if (activeTicket) {
                ticketReplies = await SupportReply.find({ ticket: activeTicket._id })
                    .populate('user', 'full_name role')
                    .sort({ createdAt: 1 });
            }
        }

        const allTickets = await SupportTicket.find().populate('user', 'full_name email').sort({ createdAt: -1 });

        res.render('admin/support', {
            title: 'Helpdesk Management',
            activeTicket,
            ticketReplies,
            allTickets,
            timeAgo
        });
    } catch (err) {
        console.error('Admin support error:', err);
        res.redirect('/admin/dashboard');
    }
};

// Update Ticket Status
exports.updateTicketStatus = async (req, res) => {
    try {
        const { ticket_id, status } = req.body;
        const adminId = req.session.userId;

        await SupportTicket.findByIdAndUpdate(ticket_id, { status });
        await logActivity(req, adminId, 'ADMIN_TICKET_STATUS', `Changed ticket #${ticket_id} status to ${status}`, 'system', ticket_id);

        req.flash('success', `Ticket marked as ${status}.`);
        res.redirect(`/admin/support?ticket_id=${ticket_id}`);
    } catch (err) {
        console.error('Ticket status update error:', err);
        req.flash('danger', 'Failed to update ticket status.');
        res.redirect('/admin/support');
    }
};

// User Activity & Audit Logs (Filtered Strictly for Regular User Actions)
exports.getLogs = async (req, res) => {
    try {
        const standardUsers = await User.find({ role: { $ne: 'admin' } });
        const userIds = standardUsers.map(u => u._id);

        const logs = await ActivityLog.find({ user: { $in: userIds } })
            .populate('user', 'full_name email')
            .sort({ createdAt: -1 })
            .limit(200);

        res.render('admin/logs', {
            title: 'User Activity & Security Logs',
            logs,
            timeAgo
        });
    } catch (err) {
        console.error('Admin logs error:', err);
        res.redirect('/admin/dashboard');
    }
};

// System Settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await Setting.find();
        const settingsMap = {};
        settings.forEach(s => settingsMap[s.setting_key] = s.setting_value);

        res.render('admin/settings', {
            title: 'Global System Settings',
            settings: settingsMap
        });
    } catch (err) {
        console.error('Admin settings error:', err);
        res.redirect('/admin/dashboard');
    }
};

// Save System Settings
exports.saveSettings = async (req, res) => {
    try {
        const { site_name, max_upload_size_mb, allowed_extensions, enable_registration, maintenance_mode } = req.body;
        const adminId = req.session.userId;

        const updates = [
            { key: 'site_name', val: site_name || 'SecureVault' },
            { key: 'max_upload_size_mb', val: max_upload_size_mb || '100' },
            { key: 'allowed_extensions', val: allowed_extensions || '' },
            { key: 'enable_registration', val: enable_registration ? '1' : '0' },
            { key: 'maintenance_mode', val: maintenance_mode ? '1' : '0' }
        ];

        for (const item of updates) {
            await Setting.findOneAndUpdate(
                { setting_key: item.key },
                { setting_value: item.val },
                { upsert: true }
            );
        }

        await logActivity(req, adminId, 'ADMIN_SETTINGS', 'Updated global system settings', 'system');
        req.flash('success', 'System settings saved successfully.');
        res.redirect('/admin/settings');
    } catch (err) {
        console.error('Save settings error:', err);
        req.flash('danger', 'Failed to save settings.');
        res.redirect('/admin/settings');
    }
};

// Admin Omnibus Global Search (Searches Users, Files, Folders, Payments, and Activity Logs)
exports.getGlobalSearch = async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        let users = [];
        let files = [];
        let folders = [];
        let payments = [];
        let activityLogs = [];
        let primaryUser = null;
        let primaryUserFiles = [];
        let primaryUserFolders = [];
        let primaryUserPayments = [];
        let primaryUserLogs = [];

        if (query) {
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedQuery, 'i');

            // 1. Search for matching users
            const matchedUsers = await User.find({
                $or: [
                    { full_name: regex },
                    { email: regex },
                    { role: regex }
                ]
            }).populate('storage_plan').limit(20).catch(() => []);

            users = matchedUsers;
            const matchedUserIds = users.map(u => u._id);

            // 2. Fetch files, folders, payments, and activity logs
            // Matching query text OR belonging to matched users
            const [matchedFiles, matchedFolders, matchedPayments, matchedLogs] = await Promise.all([
                File.find({
                    $or: [
                        { original_name: regex },
                        ...(matchedUserIds.length > 0 ? [{ user: { $in: matchedUserIds } }] : [])
                    ],
                    is_deleted: false
                }).populate('user').populate('folder').sort({ createdAt: -1 }).limit(50).catch(() => []),
                Folder.find({
                    $or: [
                        { folder_name: regex },
                        ...(matchedUserIds.length > 0 ? [{ user: { $in: matchedUserIds } }] : [])
                    ],
                    is_deleted: false
                }).populate('user').sort({ createdAt: -1 }).limit(30).catch(() => []),
                Payment.find({
                    $or: [
                        { transaction_id: regex },
                        { payment_method: regex },
                        { status: regex },
                        ...(matchedUserIds.length > 0 ? [{ user: { $in: matchedUserIds } }] : [])
                    ]
                }).populate('user').populate('plan').sort({ payment_date: -1 }).limit(30).catch(() => []),
                ActivityLog.find({
                    $or: [
                        { description: regex },
                        { action_type: regex },
                        ...(matchedUserIds.length > 0 ? [{ user: { $in: matchedUserIds } }] : [])
                    ]
                }).populate('user').sort({ createdAt: -1 }).limit(30).catch(() => [])
            ]);

            files = matchedFiles;
            folders = matchedFolders;
            payments = matchedPayments;
            activityLogs = matchedLogs;

            // 3. User 360 View: If users were matched, select primaryUser to display comprehensive dossier
            if (users.length > 0) {
                primaryUser = users[0];
                primaryUserFiles = files.filter(f => f.user && f.user._id.toString() === primaryUser._id.toString());
                primaryUserFolders = folders.filter(fold => fold.user && fold.user._id.toString() === primaryUser._id.toString());
                primaryUserPayments = payments.filter(p => p.user && p.user._id.toString() === primaryUser._id.toString());
                primaryUserLogs = activityLogs.filter(l => l.user && l.user._id.toString() === primaryUser._id.toString());
            }
        }

        res.render('admin/search', {
            title: query ? `Admin Intelligence: "${query}"` : 'Admin Global Search',
            query,
            users,
            files,
            folders,
            payments,
            activityLogs,
            primaryUser,
            primaryUserFiles,
            primaryUserFolders,
            primaryUserPayments,
            primaryUserLogs,
            totalResults: users.length + files.length + folders.length + payments.length,
            formatBytes,
            timeAgo,
            getFileIcon
        });
    } catch (err) {
        console.error('Admin global search error:', err);
        req.flash('danger', 'Error executing global search: ' + err.message);
        res.redirect('/admin/dashboard');
    }
};

// Admin API Global Search (Live JSON Auto-Complete)
exports.apiGlobalSearch = async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        if (!query || query.length < 2) {
            return res.json({ success: true, results: { users: [], files: [], folders: [], payments: [] } });
        }

        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'i');

        const [users, files, folders, payments] = await Promise.all([
            User.find({ $or: [{ full_name: regex }, { email: regex }] }).select('full_name email role').limit(5).catch(() => []),
            File.find({ original_name: regex, is_deleted: false }).populate('user', 'full_name').select('original_name file_size file_extension user').limit(5).catch(() => []),
            Folder.find({ folder_name: regex, is_deleted: false }).populate('user', 'full_name').select('folder_name color_code user').limit(5).catch(() => []),
            Payment.find({ $or: [{ transaction_id: regex }, { payment_method: regex }] }).populate('user', 'full_name').select('transaction_id amount status payment_date user').limit(5).catch(() => [])
        ]);

        res.json({
            success: true,
            results: { users, files, folders, payments }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

