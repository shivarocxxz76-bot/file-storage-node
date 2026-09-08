/**
 * Forensic Security & System Activity Audit Log Model
 */

const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    action_type: {
        type: String,
        required: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    resource_type: {
        type: String,
        enum: ['file', 'folder', 'share', 'user', 'system', 'auth'],
        default: 'system'
    },
    resource_id: {
        type: String,
        default: null
    },
    ip_address: {
        type: String,
        default: '127.0.0.1'
    },
    user_agent: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
