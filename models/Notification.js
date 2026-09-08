/**
 * In-App Notification Model
 */

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'danger'],
        default: 'info'
    },
    is_read: {
        type: Boolean,
        default: false
    },
    link: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
