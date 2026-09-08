/**
 * Helpdesk & Support Routes
 */

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { isAuth } = require('../middleware/auth');

router.get('/support', isAuth, supportController.getSupport);
router.post('/support/create', isAuth, supportController.createTicket);
router.post('/support/reply', isAuth, supportController.postReply);

module.exports = router;
