/**
 * Folder Directory Model
 */

const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        default: null
    },
    folder_name: {
        type: String,
        required: true,
        trim: true
    },
    color_code: {
        type: String,
        default: '#3b82f6'
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

module.exports = mongoose.model('Folder', FolderSchema);
