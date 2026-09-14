/**
 * Administrator Routes
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');

// Admin Analytics Dashboard
router.get('/dashboard', isAdmin, adminController.getDashboard);

// User Management
router.get('/users', isAdmin, adminController.getUsers);
router.post('/users/toggle-status', isAdmin, adminController.toggleUserStatus);
router.post('/users/update-quota', isAdmin, adminController.updateUserQuota);
router.post('/users/delete', isAdmin, adminController.deleteUser);

// Global Files Inspector & Moderation
router.get('/files', isAdmin, adminController.getFiles);
router.post('/files/force-delete', isAdmin, adminController.forceDeleteFile);

// Storage Plans
router.get('/plans', isAdmin, adminController.getPlans);
router.post('/plans/save', isAdmin, adminController.savePlan);

// Transactions & Payments
router.get('/payments', isAdmin, adminController.getPayments);

// Helpdesk
router.get('/support', isAdmin, adminController.getSupport);
router.post('/support/update-status', isAdmin, adminController.updateTicketStatus);

// System Logs
router.get('/logs', isAdmin, adminController.getLogs);

// Settings
router.get('/settings', isAdmin, adminController.getSettings);
router.post('/settings/save', isAdmin, adminController.saveSettings);

// Global Omnibus Search (Users, Files, Folders, Payments)
router.get('/search', isAdmin, adminController.getGlobalSearch);
router.get('/api/search', isAdmin, adminController.apiGlobalSearch);

module.exports = router;
