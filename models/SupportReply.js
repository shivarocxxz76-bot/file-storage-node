/**
 * Support Ticket Conversation Reply Model
 */

const mongoose = require('mongoose');

const SupportReplySchema = new mongoose.Schema({
    ticket: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupportTicket',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    is_admin_reply: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('SupportReply', SupportReplySchema);
