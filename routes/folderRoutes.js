/**
 * Folder Operations Routes
 */

const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { isAuth } = require('../middleware/auth');

router.post('/create', isAuth, folderController.createFolder);
router.post('/delete', isAuth, folderController.deleteFolder);

module.exports = router;
