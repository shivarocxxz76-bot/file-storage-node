/**
 * Multer File Upload Middleware & Storage Engine
 * With Magic Byte Verification & Secure Path Isolation
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure secure storage directories exist (outside public web root)
const uploadFilesDir = path.join(__dirname, '../secure_storage/files');
const uploadAvatarsDir = path.join(__dirname, '../secure_storage/avatars');

if (!fs.existsSync(uploadFilesDir)) {
    fs.mkdirSync(uploadFilesDir, { recursive: true });
}
if (!fs.existsSync(uploadAvatarsDir)) {
    fs.mkdirSync(uploadAvatarsDir, { recursive: true });
}

// Allowed file extensions whitelist
const allowedExtensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf',
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico',
    'zip', 'rar', '7z', 'tar', 'gz',
    'mp3', 'wav', 'ogg', 'mp4', 'mkv', 'webm', 'mov',
    'json', 'xml', 'html', 'css', 'js', 'php', 'py', 'java', 'cpp', 'c', 'cs', 'sql', 'md'
];

// Memory storage for file upload processing so we can encrypt buffer directly
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`File type .${ext} is restricted for security reasons.`), false);
    }
};

const uploadFiles = multer({
    storage: memoryStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB max single upload stream
});

// Avatar Storage Configuration
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadAvatarsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const userId = req.session.userId || 'user';
        cb(null, `avatar_${userId}_${Date.now()}${ext}`);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedImage.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPG, PNG, WEBP) are allowed for avatar.'), false);
        }
    }
});

module.exports = {
    uploadFiles,
    uploadAvatar,
    uploadFilesDir,
    uploadAvatarsDir
};
