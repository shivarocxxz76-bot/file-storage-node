/**
 * Payment & Subscription Transaction Ledger Model
 */

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoragePlan',
        required: true
    },
    transaction_id: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    payment_method: {
        type: String,
        enum: ['card', 'upi', 'netbanking', 'paypal', 'demo'],
        default: 'card'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'completed'
    },
    details: {
        type: String,
        default: ''
    },
    payment_date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
