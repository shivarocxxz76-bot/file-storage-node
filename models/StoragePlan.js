/**
 * Storage Plan Model (Starter, Pro, Business)
 */

const mongoose = require('mongoose');

const StoragePlanSchema = new mongoose.Schema({
    plan_name: {
        type: String,
        required: true,
        trim: true
    },
    storage_bytes: {
        type: Number,
        required: true,
        default: 524288000 // 500 MB
    },
    price: {
        type: Number,
        required: true,
        default: 0.00
    },
    billing_cycle: {
        type: String,
        enum: ['free', 'monthly', 'yearly', 'lifetime'],
        default: 'monthly'
    },
    description: {
        type: String,
        default: ''
    },
    max_file_size: {
        type: Number,
        default: 52428800 // 50 MB
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('StoragePlan', StoragePlanSchema);
