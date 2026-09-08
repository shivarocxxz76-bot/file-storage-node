/**
 * Role Model (RBAC: Admin, User, Editor, Viewer)
 */

const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['admin', 'user', 'editor', 'viewer']
    },
    description: {
        type: String,
        default: ''
    },
    permissions: [{
        type: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
