/**
 * Folder Management Controller
 */

const Folder = require('../models/Folder');
const File = require('../models/File');
const { logActivity } = require('../middleware/activityLogger');

// Create Folder
exports.createFolder = async (req, res) => {
    try {
        const { folder_name, parent_id, color_code } = req.body;
        const userId = req.session.userId;

        if (!folder_name || !folder_name.trim()) {
            req.flash('danger', 'Folder name cannot be blank.');
            return res.redirect('/folders');
        }

        let parent = null;
        if (parent_id) {
            const parentFolder = await Folder.findOne({ _id: parent_id, user: userId, is_deleted: false });
            if (parentFolder) parent = parentFolder._id;
        }

        const newFolder = await Folder.create({
            user: userId,
            parent: parent,
            folder_name: folder_name.trim(),
            color_code: color_code || '#3b82f6'
        });

        await logActivity(req, userId, 'CREATE_FOLDER', `Created folder: ${folder_name}`, 'folder', newFolder._id);
        req.flash('success', `Folder "${folder_name}" created successfully.`);

        const redirectUrl = parent ? `/files?folder_id=${parent}` : '/folders';
        res.redirect(redirectUrl);
    } catch (err) {
        console.error('Create folder error:', err);
        req.flash('danger', 'Failed to create folder.');
        res.redirect('/folders');
    }
};

// Soft Delete Folder
exports.deleteFolder = async (req, res) => {
    try {
        const folderId = req.body.folder_id;
        const userId = req.session.userId;
        const userRole = req.session.userRole;

        const folder = await Folder.findById(folderId);
        if (folder && (folder.user.toString() === userId.toString() || userRole === 'admin')) {
            folder.is_deleted = true;
            folder.deleted_at = new Date();
            await folder.save();

            // Soft delete contained files
            await File.updateMany(
                { folder: folder._id },
                { is_deleted: true, deleted_at: new Date() }
            );

            await logActivity(req, userId, 'DELETE_FOLDER', `Moved folder to Recycle Bin: ${folder.folder_name}`, 'folder', folder._id);
            req.flash('success', `Folder "${folder.folder_name}" moved to Recycle Bin.`);
        } else {
            req.flash('danger', 'Folder not found or access denied.');
        }

        res.redirect('/folders');
    } catch (err) {
        console.error('Delete folder error:', err);
        req.flash('danger', 'Failed to delete folder.');
        res.redirect('/folders');
    }
};
