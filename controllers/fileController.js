/**
 * File Management Controller (AES-256 Encrypted Storage, Streaming, Previews & Operations)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const File = require('../models/File');
const Folder = require('../models/Folder');
const User = require('../models/User');
const SharedFile = require('../models/SharedFile');
const { encryptBuffer, decryptBuffer } = require('../middleware/cryptoHelper');
const { uploadFilesDir } = require('../middleware/upload');
const { logActivity } = require('../middleware/activityLogger');
const { formatBytes } = require('../middleware/helpers');

// AJAX Multi-File Upload Handler (with AES-256 encryption at rest)
exports.uploadFiles = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).populate('storage_plan');
        const files = req.files;

        if (!files || files.length === 0) {
            return res.json({ success: false, message: 'No files were uploaded.' });
        }

        const folderId = req.body.folder_id || null;
        let validFolder = null;
        if (folderId) {
            validFolder = await Folder.findOne({ _id: folderId, user: userId, is_deleted: false });
        }

        const maxSingleFileSize = user.storage_plan ? user.storage_plan.max_file_size : 52428800; // 50MB default
        let currentUsed = user.storage_used_bytes || 0;
        const storageLimit = user.storage_limit_bytes || 524288000;

        let totalNewBytes = 0;
        const errors = [];
        let uploadedCount = 0;

        for (const file of files) {
            // Check single file size limit
            if (file.size > maxSingleFileSize) {
                errors.push(`${file.originalname} exceeds single file size limit.`);
                continue;
            }

            // Check overall storage quota
            if ((currentUsed + totalNewBytes + file.size) > storageLimit) {
                errors.push(`Storage quota exceeded for ${file.originalname}. Please upgrade your plan.`);
                break;
            }

            // Encrypt file buffer with AES-256-CBC
            const { encryptedBuffer, ivHex, sha256Hex } = encryptBuffer(file.buffer);

            const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
            const randomHex = crypto.randomBytes(16).toString('hex');
            const storedName = `${randomHex}_${Date.now()}.enc`;
            const diskPath = path.join(uploadFilesDir, storedName);

            // Write encrypted ciphertext to secure storage
            fs.writeFileSync(diskPath, encryptedBuffer);

            await File.create({
                user: userId,
                folder: validFolder ? validFolder._id : null,
                original_name: file.originalname,
                stored_name: storedName,
                file_size: file.size,
                mime_type: file.mimetype || 'application/octet-stream',
                file_extension: ext,
                file_hash: sha256Hex,
                is_encrypted: true,
                encryption_iv: ivHex,
                version: 1,
                downloads_count: 0,
                is_deleted: false
            });

            uploadedCount++;
            totalNewBytes += file.size;

            await logActivity(req, userId, 'UPLOAD', `Uploaded encrypted file: ${file.originalname} (${formatBytes(file.size)})`, 'file');
        }

        // Update user storage consumed
        if (totalNewBytes > 0) {
            await User.findByIdAndUpdate(userId, { $inc: { storage_used_bytes: totalNewBytes } });
        }

        if (uploadedCount > 0) {
            let msg = `Successfully uploaded & encrypted ${uploadedCount} file(s).`;
            if (errors.length > 0) msg += ` (Errors: ${errors.join(', ')})`;
            return res.json({ success: true, message: msg, uploaded_count: uploadedCount });
        } else {
            return res.json({ success: false, message: errors.join(', ') || 'No files were uploaded.' });
        }
    } catch (err) {
        console.error('File upload error:', err);
        res.status(500).json({ success: false, message: 'Server error while uploading files.' });
    }
};

// Stream Download File (with on-the-fly AES-256 decryption & security headers)
exports.downloadFile = async (req, res) => {
    try {
        const fileId = req.query.file_id;
        const shareToken = req.query.token;
        const userId = req.session.userId;
        const userRole = req.session.userRole;

        let file = null;

        if (fileId) {
            file = await File.findOne({ _id: fileId, is_deleted: false });
            if (!file) {
                return res.status(404).send('File not found or has been deleted.');
            }

            // Access check: Owner, Admin, or Shared user with download permission
            let hasAccess = (userId && (file.user.toString() === userId.toString() || userRole === 'admin'));
            if (!hasAccess && userId) {
                const share = await SharedFile.findOne({
                    file: file._id,
                    shared_with: userId,
                    permission: { $in: ['download', 'edit'] }
                });
                if (share && (!share.expires_at || new Date(share.expires_at) > new Date())) {
                    hasAccess = true;
                }
            }

            if (!hasAccess) {
                return res.status(403).send('Access denied. You do not have permission to download this file.');
            }
        } else if (shareToken) {
            const share = await SharedFile.findOne({ share_token: shareToken }).populate('file');
            if (!share || !share.file || share.file.is_deleted) {
                return res.status(404).send('Shared file link is invalid or has expired.');
            }
            if (share.permission === 'no-download') {
                return res.status(403).send('This file is shared for viewing only (no-download mode).');
            }
            if (share.expires_at && new Date(share.expires_at) < new Date()) {
                return res.status(403).send('This share link has expired.');
            }
            file = share.file;
        } else {
            return res.status(400).send('Invalid file request.');
        }

        const diskPath = path.join(uploadFilesDir, file.stored_name);
        if (!fs.existsSync(diskPath)) {
            return res.status(404).send('File missing on secure storage.');
        }

        // Read encrypted bytes and decrypt on the fly
        const encryptedBytes = fs.readFileSync(diskPath);
        const decryptedBytes = file.is_encrypted ? decryptBuffer(encryptedBytes, file.encryption_iv) : encryptedBytes;

        // Security headers
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

        // Increment download counter
        await File.findByIdAndUpdate(file._id, { $inc: { downloads_count: 1 } });
        if (userId) {
            await logActivity(req, userId, 'DOWNLOAD', `Downloaded decrypted file: ${file.original_name}`, 'file', file._id);
        }

        res.send(decryptedBytes);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).send('Error processing file download.');
    }
};

// Preview File (Decrypted Inline Stream or JSON metadata)
exports.previewFile = async (req, res) => {
    try {
        const fileId = req.query.file_id;
        const isRaw = req.query.raw === '1';
        const userId = req.session.userId;
        const userRole = req.session.userRole;

        const file = await File.findOne({ _id: fileId, is_deleted: false });
        if (!file) {
            return isRaw ? res.status(404).send('File not found') : res.json({ success: false, message: 'File not found' });
        }

        let hasAccess = (userId && (file.user.toString() === userId.toString() || userRole === 'admin'));
        if (!hasAccess && userId) {
            const share = await SharedFile.findOne({ file: file._id, shared_with: userId });
            if (share && (!share.expires_at || new Date(share.expires_at) > new Date())) {
                hasAccess = true;
            }
        }

        if (!hasAccess) {
            return isRaw ? res.status(403).send('Access denied') : res.json({ success: false, message: 'Access denied' });
        }

        const diskPath = path.join(uploadFilesDir, file.stored_name);
        if (!fs.existsSync(diskPath)) {
            return isRaw ? res.status(404).send('File missing') : res.json({ success: false, message: 'File missing on storage' });
        }

        const encryptedBytes = fs.readFileSync(diskPath);
        const decryptedBytes = file.is_encrypted ? decryptBuffer(encryptedBytes, file.encryption_iv) : encryptedBytes;

        if (isRaw) {
            res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            return res.send(decryptedBytes);
        }

        // Return JSON metadata
        const responseData = {
            success: true,
            file: {
                id: file._id,
                original_name: file.original_name,
                file_size: file.file_size,
                file_size_formatted: formatBytes(file.file_size),
                mime_type: file.mime_type,
                file_extension: file.file_extension,
                file_hash: file.file_hash,
                is_encrypted: file.is_encrypted,
                created_at: file.createdAt,
                downloads_count: file.downloads_count
            }
        };

        const textExtensions = ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'php', 'py', 'java', 'cpp', 'c', 'sql', 'md'];
        if (textExtensions.includes(file.file_extension.toLowerCase())) {
            responseData.text_content = decryptedBytes.toString('utf8').substring(0, 50000);
        }

        res.json(responseData);
    } catch (err) {
        console.error('Preview error:', err);
        res.status(500).json({ success: false, message: 'Server error while generating preview.' });
    }
};

// Rename File
exports.renameFile = async (req, res) => {
    try {
        const { file_id, new_name } = req.body;
        const userId = req.session.userId;
        const userRole = req.session.userRole;

        if (!new_name || !new_name.trim()) {
            req.flash('danger', 'File name cannot be empty.');
            return res.redirect(req.headers.referer || '/files');
        }

        const file = await File.findById(file_id);
        if (file && (file.user.toString() === userId.toString() || userRole === 'admin')) {
            const oldName = file.original_name;
            const ext = path.extname(new_name).toLowerCase().replace('.', '') || file.file_extension;
            file.original_name = new_name.trim();
            file.file_extension = ext;
            await file.save();

            await logActivity(req, userId, 'RENAME_FILE', `Renamed "${oldName}" to "${file.original_name}"`, 'file', file._id);
            req.flash('success', `File renamed to "${file.original_name}".`);
        } else {
            req.flash('danger', 'File not found or permission denied.');
        }

        res.redirect(req.headers.referer || '/files');
    } catch (err) {
        console.error('Rename error:', err);
        req.flash('danger', 'Failed to rename file.');
        res.redirect('/files');
    }
};

// Move File to Folder
exports.moveFile = async (req, res) => {
    try {
        const { file_id, target_folder_id } = req.body;
        const userId = req.session.userId;
        const userRole = req.session.userRole;

        const file = await File.findById(file_id);
        if (!file || (file.user.toString() !== userId.toString() && userRole !== 'admin')) {
            req.flash('danger', 'File not found or permission denied.');
            return res.redirect(req.headers.referer || '/files');
        }

        let targetFolder = null;
        if (target_folder_id && target_folder_id !== 'root') {
            targetFolder = await Folder.findOne({ _id: target_folder_id, user: file.user });
        }

        file.folder = targetFolder ? targetFolder._id : null;
        await file.save();

        await logActivity(req, userId, 'MOVE_FILE', `Moved "${file.original_name}" to ${targetFolder ? targetFolder.folder_name : 'Root'}`, 'file', file._id);
        req.flash('success', `File moved successfully.`);
        res.redirect(req.headers.referer || '/files');
    } catch (err) {
        console.error('Move error:', err);
        req.flash('danger', 'Failed to move file.');
        res.redirect('/files');
    }
};

// Soft Delete File (Move to Recycle Bin)
exports.deleteFile = async (req, res) => {
    try {
        const fileId = req.body.file_id;
        const userId = req.session.userId;
        const userRole = req.session.userRole;

        const file = await File.findById(fileId);
        if (file && (file.user.toString() === userId.toString() || userRole === 'admin')) {
            file.is_deleted = true;
            file.deleted_at = new Date();
            await file.save();

            await logActivity(req, userId, 'DELETE_TRASH', `Moved file to Recycle Bin: ${file.original_name}`, 'file', file._id);
            req.flash('success', `"${file.original_name}" moved to Recycle Bin.`);
        } else {
            req.flash('danger', 'File not found or permission denied.');
        }

        res.redirect(req.headers.referer || '/files');
    } catch (err) {
        console.error('Delete error:', err);
        req.flash('danger', 'Failed to delete file.');
        res.redirect('/files');
    }
};

// Restore File from Recycle Bin
exports.restoreFile = async (req, res) => {
    try {
        const { file_id, folder_id } = req.body;
        const userId = req.session.userId;
        const userRole = req.session.userRole;

        if (file_id) {
            const file = await File.findOne({ _id: file_id, is_deleted: true });
            if (file && (file.user.toString() === userId.toString() || userRole === 'admin')) {
                file.is_deleted = false;
                file.deleted_at = null;
                await file.save();

                await logActivity(req, userId, 'RESTORE_FILE', `Restored file: ${file.original_name}`, 'file', file._id);
                req.flash('success', `File "${file.original_name}" restored.`);
            }
        } else if (folder_id) {
            const folder = await Folder.findOne({ _id: folder_id, is_deleted: true });
            if (folder && (folder.user.toString() === userId.toString() || userRole === 'admin')) {
                folder.is_deleted = false;
                folder.deleted_at = null;
                await folder.save();

                await File.updateMany({ folder: folder._id }, { is_deleted: false, deleted_at: null });

                await logActivity(req, userId, 'RESTORE_FOLDER', `Restored folder: ${folder.folder_name}`, 'folder', folder._id);
                req.flash('success', `Folder "${folder.folder_name}" restored.`);
            }
        }

        res.redirect('/recycle-bin');
    } catch (err) {
        console.error('Restore error:', err);
        req.flash('danger', 'Failed to restore item.');
        res.redirect('/recycle-bin');
    }
};

// Permanent Purge from Disk & Database with Quota Refund
exports.permanentDelete = async (req, res) => {
    try {
        const { file_id, folder_id, empty_all } = req.body;
        const userId = req.session.userId;
        const userRole = req.session.userRole;

        if (empty_all) {
            const deletedFiles = await File.find({ user: userId, is_deleted: true });
            let reclaimedBytes = 0;

            for (const f of deletedFiles) {
                const p = path.join(uploadFilesDir, f.stored_name);
                if (fs.existsSync(p)) fs.unlinkSync(p);
                reclaimedBytes += f.file_size;
            }

            await File.deleteMany({ user: userId, is_deleted: true });
            await Folder.deleteMany({ user: userId, is_deleted: true });

            if (reclaimedBytes > 0) {
                await User.findByIdAndUpdate(userId, { $inc: { storage_used_bytes: -reclaimedBytes } });
            }

            await logActivity(req, userId, 'EMPTY_TRASH', `Emptied Recycle Bin (reclaimed ${formatBytes(reclaimedBytes)})`);
            req.flash('success', `Recycle Bin emptied. Reclaimed ${formatBytes(reclaimedBytes)} of storage.`);
        } else if (folder_id) {
            const folder = await Folder.findOne({ _id: folder_id, is_deleted: true });
            if (folder && (folder.user.toString() === userId.toString() || userRole === 'admin')) {
                const filesInFolder = await File.find({ folder: folder._id });
                let folderBytes = 0;
                for (const f of filesInFolder) {
                    const p = path.join(uploadFilesDir, f.stored_name);
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                    folderBytes += f.file_size;
                }
                await File.deleteMany({ folder: folder._id });
                await Folder.findByIdAndDelete(folder._id);
                if (folderBytes > 0) {
                    await User.findByIdAndUpdate(folder.user, { $inc: { storage_used_bytes: -folderBytes } });
                }
                await logActivity(req, userId, 'PERMANENT_DELETE_FOLDER', `Permanently deleted folder: ${folder.folder_name}`);
                req.flash('success', `Folder "${folder.folder_name}" permanently deleted.`);
            }
        } else if (file_id) {
            const file = await File.findOne({ _id: file_id, is_deleted: true });
            if (file && (file.user.toString() === userId.toString() || userRole === 'admin')) {
                const p = path.join(uploadFilesDir, file.stored_name);
                if (fs.existsSync(p)) fs.unlinkSync(p);

                const fileSize = file.file_size;
                const fileOwner = file.user;

                await File.findByIdAndDelete(file._id);
                await User.findByIdAndUpdate(fileOwner, { $inc: { storage_used_bytes: -fileSize } });

                await logActivity(req, userId, 'PERMANENT_DELETE', `Permanently deleted file: ${file.original_name}`, 'file', file._id);
                req.flash('success', `File "${file.original_name}" permanently deleted.`);
            }
        }

        res.redirect('/recycle-bin');
    } catch (err) {
        console.error('Permanent delete error:', err);
        req.flash('danger', 'Failed to purge item.');
        res.redirect('/recycle-bin');
    }
};
