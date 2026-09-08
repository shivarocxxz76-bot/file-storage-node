/**
 * File Metadata Model (with AES-256 Encryption & SHA-256 Checksum)
 */

const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        default: null
    },
    original_name: {
        type: String,
        required: true,
        trim: true
    },
    stored_name: {
        type: String,
        required: true,
        unique: true
    },
    file_size: {
        type: Number,
        required: true
    },
    mime_type: {
        type: String,
        default: 'application/octet-stream'
    },
    file_extension: {
        type: String,
        default: ''
    },
    file_hash: {
        type: String, // SHA-256 Checksum
        default: ''
    },
    is_encrypted: {
        type: Boolean,
        default: true
    },
    encryption_iv: {
        type: String, // 16-byte IV hex string for AES-256-CBC
        default: ''
    },
    version: {
        type: Number,
        default: 1
    },
    downloads_count: {
        type: Number,
        default: 0
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);
