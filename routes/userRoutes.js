/**
 * User Workspace Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

// User Dashboard
router.get('/dashboard', isAuth, userController.getDashboard);

// File Manager
router.get('/files', isAuth, userController.getFiles);

// Folders
router.get('/folders', isAuth, userController.getFolders);

// Shared Files
router.get('/shared', isAuth, userController.getShared);

// Recycle Bin
router.get('/recycle-bin', isAuth, userController.getRecycleBin);

// Profile Settings
router.get('/profile', isAuth, userController.getProfile);
router.post('/profile/update', isAuth, uploadAvatar.single('avatar'), userController.updateProfile);
router.post('/profile/change-password', isAuth, userController.changePassword);

// Security Logs
router.get('/activity-logs', isAuth, userController.getActivityLogs);

// Notifications Center
router.get('/notifications', isAuth, userController.getNotifications);

module.exports = router;
