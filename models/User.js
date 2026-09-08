/**
 * User Account Model
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['admin', 'user', 'editor', 'viewer'],
        default: 'user'
    },
    storage_plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoragePlan',
        default: null
    },
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: 'default_avatar.png'
    },
    storage_used_bytes: {
        type: Number,
        default: 0
    },
    storage_limit_bytes: {
        type: Number,
        default: 524288000 // 500 MB default
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'active'
    },
    last_login: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Hash password before saving if modified
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Instance method to check password
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
