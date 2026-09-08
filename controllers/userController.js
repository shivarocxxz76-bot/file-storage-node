/**
 * User Workspace Controller (Dashboard, Files, Folders, Shared, Trash, Profile, Logs, Notifications)
 */

const User = require('../models/User');
const File = require('../models/File');
const Folder = require('../models/Folder');
const SharedFile = require('../models/SharedFile');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { logActivity } = require('../middleware/activityLogger');
const { formatBytes, timeAgo, getFileIcon } = require('../middleware/helpers');

// User Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).populate('storage_plan');

        const totalFiles = await File.countDocuments({ user: userId, is_deleted: false });
        const totalFolders = await Folder.countDocuments({ user: userId, is_deleted: false });
        const totalShared = await SharedFile.countDocuments({
            $or: [{ shared_by: userId }, { shared_with: userId }]
        });

        // Recent 6 Files
        const recentFiles = await File.find({ user: userId, is_deleted: false })
            .populate('folder')
            .sort({ createdAt: -1 })
            .limit(6);

        // Recent 5 Activities
        const recentActivities = await ActivityLog.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(5);

        // Category Breakdown for Chart.js
        const files = await File.find({ user: userId, is_deleted: false });
        const categoryMap = {
            Images: 0,
            Documents: 0,
            Videos: 0,
            Audios: 0,
            Archives: 0,
            'Others & Code': 0
        };

        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
        const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'];
        const vidExts = ['mp4', 'mkv', 'webm', 'mov', 'avi'];
        const audExts = ['mp3', 'wav', 'ogg'];
        const archExts = ['zip', 'rar', '7z', 'tar', 'gz'];

        files.forEach(f => {
            const ext = f.file_extension.toLowerCase();
            if (imageExts.includes(ext)) categoryMap.Images += f.file_size;
            else if (docExts.includes(ext)) categoryMap.Documents += f.file_size;
            else if (vidExts.includes(ext)) categoryMap.Videos += f.file_size;
            else if (audExts.includes(ext)) categoryMap.Audios += f.file_size;
            else if (archExts.includes(ext)) categoryMap.Archives += f.file_size;
            else categoryMap['Others & Code'] += f.file_size;
        });

        const freeSpaceBytes = Math.max(0, (user.storage_limit_bytes || 524288000) - (user.storage_used_bytes || 0));

        const chartLabels = ['Images', 'Documents', 'Videos', 'Audios', 'Archives', 'Others & Code', 'Available'];
        const chartValues = [
            Number((categoryMap.Images / (1024 * 1024)).toFixed(2)),
            Number((categoryMap.Documents / (1024 * 1024)).toFixed(2)),
            Number((categoryMap.Videos / (1024 * 1024)).toFixed(2)),
            Number((categoryMap.Audios / (1024 * 1024)).toFixed(2)),
            Number((categoryMap.Archives / (1024 * 1024)).toFixed(2)),
            Number((categoryMap['Others & Code'] / (1024 * 1024)).toFixed(2)),
            Number((freeSpaceBytes / (1024 * 1024)).toFixed(2))
        ];

        const storageUsed = user.storage_used_bytes || 0;
        const storageLimit = user.storage_limit_bytes || 524288000;
        const storagePercentage = storageLimit > 0 ? Number(((storageUsed / storageLimit) * 100).toFixed(1)) : 0;

        res.render('user/dashboard', {
            title: 'User Dashboard',
            user,
            totalFiles,
            totalFolders,
            totalShared,
            recentFiles,
            recentActivities,
            chartLabels,
            chartValues,
            storageUsedFormatted: formatBytes(storageUsed),
            storageLimitFormatted: formatBytes(storageLimit),
            storagePercentage: Math.min(storagePercentage, 100),
            isNearLimit: storagePercentage >= 80 && storagePercentage < 100,
            isFull: storagePercentage >= 100,
            formatBytes,
            timeAgo,
            getFileIcon
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Error loading dashboard');
    }
};

// My Files Page (with Folders & Filtering)
exports.getFiles = async (req, res) => {
    try {
        const userId = req.session.userId;
        const folderId = req.query.folder_id || null;
        const category = req.query.category || 'all';
        const viewMode = req.query.view || (req.session.fileViewMode || 'grid');
        req.session.fileViewMode = viewMode;

        let currentFolder = null;
        const breadcrumbs = [{ id: null, name: 'Root Storage' }];

        if (folderId) {
            currentFolder = await Folder.findOne({ _id: folderId, user: userId, is_deleted: false });
            if (currentFolder) {
                let parentId = currentFolder.parent;
                const parentChain = [];
                while (parentId) {
                    const p = await Folder.findOne({ _id: parentId, user: userId });
                    if (p) {
                        parentChain.unshift({ id: p._id, name: p.folder_name });
                        parentId = p.parent;
                    } else {
                        break;
                    }
                }
                breadcrumbs.push(...parentChain);
                breadcrumbs.push({ id: currentFolder._id, name: currentFolder.folder_name });
            }
        }

        // Subfolders
        const subfolderQuery = { user: userId, parent: currentFolder ? currentFolder._id : null, is_deleted: false };
        const folders = await Folder.find(subfolderQuery).sort({ folder_name: 1 });
        const allUserFolders = await Folder.find({ user: userId, is_deleted: false });

        // Query files
        const fileQuery = { user: userId, is_deleted: false };

        if (category === 'all') {
            fileQuery.folder = currentFolder ? currentFolder._id : null;
        } else if (category === 'images') {
            fileQuery.file_extension = { $in: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'] };
        } else if (category === 'documents') {
            fileQuery.file_extension = { $in: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'] };
        } else if (category === 'videos') {
            fileQuery.file_extension = { $in: ['mp4', 'mkv', 'webm', 'mov', 'avi'] };
        } else if (category === 'audios') {
            fileQuery.file_extension = { $in: ['mp3', 'wav', 'ogg'] };
        } else if (category === 'archives') {
            fileQuery.file_extension = { $in: ['zip', 'rar', '7z', 'tar', 'gz'] };
        } else if (category === 'code') {
            fileQuery.file_extension = { $in: ['php', 'js', 'html', 'css', 'sql', 'json', 'py', 'java', 'cpp', 'c', 'xml'] };
        }

        const files = await File.find(fileQuery).sort({ createdAt: -1 });

        res.render('user/files', {
            title: 'My Files',
            currentFolder,
            breadcrumbs,
            folders,
            allUserFolders,
            files,
            categoryFilter: category,
            viewMode,
            formatBytes,
            timeAgo,
            getFileIcon
        });
    } catch (err) {
        console.error('Files error:', err);
        res.status(500).send('Error loading files');
    }
};

// Folders Management Page
exports.getFolders = async (req, res) => {
    try {
        const userId = req.session.userId;
        const folders = await Folder.find({ user: userId, is_deleted: false })
            .populate('parent', 'folder_name')
            .sort({ createdAt: -1 });

        const folderStats = await Promise.all(folders.map(async f => {
            const files = await File.find({ folder: f._id, is_deleted: false });
            const totalSize = files.reduce((acc, curr) => acc + curr.file_size, 0);
            return {
                ...f._doc,
                file_count: files.length,
                folder_size: totalSize
            };
        }));

        res.render('user/folders', {
            title: 'Folder Management',
            folders: folderStats,
            formatBytes,
            timeAgo
        });
    } catch (err) {
        console.error('Folders error:', err);
        res.status(500).send('Error loading folders');
    }
};

// Shared Files Page
exports.getShared = async (req, res) => {
    try {
        const userId = req.session.userId;

        const sharedWithMe = await SharedFile.find({ shared_with: userId })
            .populate({ path: 'file', match: { is_deleted: false } })
            .populate('shared_by', 'full_name email')
            .sort({ createdAt: -1 });

        const sharedByMe = await SharedFile.find({ shared_by: userId })
            .populate({ path: 'file', match: { is_deleted: false } })
            .populate('shared_with', 'full_name email')
            .sort({ createdAt: -1 });

        res.render('user/shared', {
            title: 'Shared Files',
            sharedWithMe: sharedWithMe.filter(s => s.file),
            sharedByMe: sharedByMe.filter(s => s.file),
            formatBytes,
            timeAgo,
            getFileIcon
        });
    } catch (err) {
        console.error('Shared error:', err);
        res.status(500).send('Error loading shared files');
    }
};

// Recycle Bin Page
exports.getRecycleBin = async (req, res) => {
    try {
        const userId = req.session.userId;

        const deletedFiles = await File.find({ user: userId, is_deleted: true })
            .populate('folder', 'folder_name')
            .sort({ deleted_at: -1 });

        const deletedFolders = await Folder.find({ user: userId, is_deleted: true })
            .sort({ deleted_at: -1 });

        res.render('user/recycle_bin', {
            title: 'Recycle Bin',
            deletedFiles,
            deletedFolders,
            totalDeletedCount: deletedFiles.length + deletedFolders.length,
            formatBytes,
            timeAgo,
            getFileIcon
        });
    } catch (err) {
        console.error('Recycle bin error:', err);
        res.status(500).send('Error loading recycle bin');
    }
};

// Profile & Security Page
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).populate('storage_plan');
        const storageUsed = user.storage_used_bytes || 0;
        const storageLimit = user.storage_limit_bytes || 524288000;

        res.render('user/profile', {
            title: 'Account Settings',
            user,
            storageUsedFormatted: formatBytes(storageUsed),
            storageLimitFormatted: formatBytes(storageLimit),
            storagePercentage: storageLimit > 0 ? ((storageUsed / storageLimit) * 100).toFixed(1) : 0,
            formatBytes
        });
    } catch (err) {
        console.error('Profile error:', err);
        res.redirect('/dashboard');
    }
};

// Update Profile Info & Avatar
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { full_name, email } = req.body;

        const user = await User.findById(userId);
        if (full_name) user.full_name = full_name.trim();

        if (email && email.toLowerCase().trim() !== user.email) {
            const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: userId } });
            if (existing) {
                req.flash('danger', 'This email is already in use by another account.');
                return res.redirect('/profile');
            }
            user.email = email.toLowerCase().trim();
        }

        if (req.file) {
            user.avatar = req.file.filename;
        }

        await user.save();
        req.session.userName = user.full_name;

        await logActivity(req, userId, 'UPDATE_PROFILE', 'Updated profile information', 'user', user._id);
        req.flash('success', 'Profile updated successfully.');
        res.redirect('/profile');
    } catch (err) {
        console.error('Update profile error:', err);
        req.flash('danger', 'Failed to update profile.');
        res.redirect('/profile');
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { current_password, new_password, confirm_password } = req.body;

        const user = await User.findById(userId);
        const isMatch = await user.comparePassword(current_password);

        if (!isMatch) {
            req.flash('danger', 'Current password entered is incorrect.');
            return res.redirect('/profile');
        }

        if (new_password.length < 6) {
            req.flash('danger', 'New password must be at least 6 characters.');
            return res.redirect('/profile');
        }

        if (new_password !== confirm_password) {
            req.flash('danger', 'New password confirmation does not match.');
            return res.redirect('/profile');
        }

        user.password = new_password;
        await user.save();

        await logActivity(req, userId, 'CHANGE_PASSWORD', 'Updated account password', 'auth', user._id);
        req.flash('success', 'Password changed successfully.');
        res.redirect('/profile');
    } catch (err) {
        console.error('Password change error:', err);
        req.flash('danger', 'Failed to change password.');
        res.redirect('/profile');
    }
};

// Activity Logs Page
exports.getActivityLogs = async (req, res) => {
    try {
        const userId = req.session.userId;
        const logs = await ActivityLog.find({ user: userId }).sort({ createdAt: -1 }).limit(100);

        res.render('user/activity_logs', {
            title: 'Security & Activity Logs',
            logs,
            timeAgo
        });
    } catch (err) {
        console.error('Logs error:', err);
        res.redirect('/dashboard');
    }
};

// Notifications Center Page
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (req.query.mark_all_read === '1') {
            await Notification.updateMany({ user: userId }, { is_read: true });
            req.flash('success', 'All notifications marked as read.');
            return res.redirect('/notifications');
        }

        if (req.query.clear_all === '1') {
            await Notification.deleteMany({ user: userId });
            req.flash('info', 'Notifications cleared.');
            return res.redirect('/notifications');
        }

        const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });

        res.render('user/notifications', {
            title: 'Notifications Center',
            notifications,
            timeAgo
        });
    } catch (err) {
        console.error('Notifications error:', err);
        res.redirect('/dashboard');
    }
};
