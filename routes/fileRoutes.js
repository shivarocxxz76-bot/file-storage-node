/**
 * File Operations Routes
 */

const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { isAuth } = require('../middleware/auth');
const { uploadFiles } = require('../middleware/upload');

// AJAX Multi-upload (with AES-256 encryption)
router.post('/upload', isAuth, uploadFiles.array('files', 15), fileController.uploadFiles);

// Download (handles authenticated user and signed token streams)
router.get('/download', fileController.downloadFile);

// Inline Preview (handles modal preview & raw decrypted stream)
router.get('/preview', fileController.previewFile);

// Rename & Move
router.post('/rename', isAuth, fileController.renameFile);
router.post('/move', isAuth, fileController.moveFile);

// Delete (soft delete / move to recycle bin)
router.post('/delete', isAuth, fileController.deleteFile);

// Restore from recycle bin
router.post('/restore', isAuth, fileController.restoreFile);

// Permanent Purge from disk & database
router.post('/permanent-delete', isAuth, fileController.permanentDelete);

module.exports = router;
