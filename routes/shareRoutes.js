/**
 * Sharing & Access Control Routes
 */

const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { isAuth } = require('../middleware/auth');

// Create Share (Direct email or public signed token link)
router.post('/create', isAuth, shareController.createShare);

// Revoke Share
router.post('/revoke', isAuth, shareController.revokeShare);

// Public Link Access Portal (GET to view, POST for passcode unlock)
router.get('/:token', shareController.viewSharedLink);
router.post('/:token', shareController.viewSharedLink);

module.exports = router;
