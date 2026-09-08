/**
 * Billing & Demo Payment Gateway Controller
 */

const crypto = require('crypto');
const StoragePlan = require('../models/StoragePlan');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { logActivity, createNotification } = require('../middleware/activityLogger');
const { formatBytes } = require('../middleware/helpers');

// Storage Plans Comparison Page
exports.getPlans = async (req, res) => {
    try {
        const plans = await StoragePlan.find({ is_active: true }).sort({ price: 1 });
        const user = await User.findById(req.session.userId);

        res.render('user/storage_plans', {
            title: 'Storage Upgrade Plans',
            plans,
            currentPlanId: user.storage_plan ? user.storage_plan.toString() : null,
            formatBytes
        });
    } catch (err) {
        console.error('Plans error:', err);
        req.flash('danger', 'Error loading storage plans.');
        res.redirect('/dashboard');
    }
};

// Demo Checkout Page
exports.getCheckout = async (req, res) => {
    try {
        const planId = req.query.plan_id;
        const plan = await StoragePlan.findById(planId);

        if (!plan) {
            req.flash('danger', 'Selected plan does not exist.');
            return res.redirect('/storage-plans');
        }

        res.render('user/checkout', {
            title: 'Demo Payment Checkout',
            plan,
            formatBytes
        });
    } catch (err) {
        console.error('Checkout error:', err);
        req.flash('danger', 'Error loading checkout.');
        res.redirect('/storage-plans');
    }
};

// Process Demo Payment Simulation
exports.processPayment = async (req, res) => {
    try {
        const { plan_id, payment_method } = req.body;
        const userId = req.session.userId;

        const plan = await StoragePlan.findById(plan_id);
        if (!plan) {
            req.flash('danger', 'Invalid storage plan.');
            return res.redirect('/storage-plans');
        }

        const method = payment_method || 'card';
        const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
        const txnId = `TXN_${method.toUpperCase()}_${randomHex}`;
        const details = `Demo simulation purchase of ${plan.plan_name} (${formatBytes(plan.storage_bytes)}) via ${method.toUpperCase()}`;

        // Create Payment Record
        await Payment.create({
            user: userId,
            plan: plan._id,
            transaction_id: txnId,
            amount: plan.price,
            payment_method: method,
            status: 'completed',
            details: details
        });

        // Upgrade User's Quota & Storage Plan
        await User.findByIdAndUpdate(userId, {
            storage_plan: plan._id,
            storage_limit_bytes: plan.storage_bytes
        });

        // Notification
        await createNotification(
            userId,
            'Storage Plan Upgraded!',
            `Your storage has been upgraded to ${plan.plan_name} (${formatBytes(plan.storage_bytes)}). Transaction ID: ${txnId}`,
            'success',
            '/payment-history'
        );

        await logActivity(req, userId, 'UPGRADE_STORAGE', `Upgraded to ${plan.plan_name} for $${plan.price.toFixed(2)} (Txn: ${txnId})`, 'system');

        req.flash('success', `Payment successful! Your account is upgraded to ${plan.plan_name} (${formatBytes(plan.storage_bytes)}).`);
        res.redirect('/payment-history');
    } catch (err) {
        console.error('Process payment error:', err);
        req.flash('danger', 'Payment simulation failed.');
        res.redirect('/storage-plans');
    }
};

// Payment History & Invoices Page
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.session.userId;
        const payments = await Payment.find({ user: userId })
            .populate('plan')
            .sort({ payment_date: -1 });

        res.render('user/payment_history', {
            title: 'Billing & Invoices',
            payments,
            formatBytes
        });
    } catch (err) {
        console.error('Payment history error:', err);
        req.flash('danger', 'Error loading billing history.');
        res.redirect('/dashboard');
    }
};
