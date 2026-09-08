/**
 * Shared File & Access Control Model
 */

const mongoose = require('mongoose');

const SharedFileSchema = new mongoose.Schema({
    file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        required: true,
        index: true
    },
    shared_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shared_with: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // null if public link share
    },
    share_token: {
        type: String,
        unique: true,
        required: true
    },
    permission: {
        type: String,
        enum: ['download', 'view', 'edit', 'no-download'],
        default: 'download'
    },
    access_password: {
        type: String, // BCrypt hashed passcode if password-protected
        default: null
    },
    expires_at: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('SharedFile', SharedFileSchema);
