/**
 * Audit Logger and Notification Dispatcher
 */

const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');

const logActivity = async (req, userId, actionType, description, resourceType = 'system', resourceId = null) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Unknown Browser';

        await ActivityLog.create({
            user: userId || null,
            action_type: actionType,
            description: description,
            resource_type: resourceType,
            resource_id: resourceId ? resourceId.toString() : null,
            ip_address: ip,
            user_agent: userAgent
        });
    } catch (e) {
        console.error('[ActivityLog Error]', e.message);
    }
};

const createNotification = async (userId, title, message, type = 'info', link = '') => {
    try {
        await Notification.create({
            user: userId,
            title,
            message,
            type,
            link
        });
    } catch (e) {
        console.error('[Notification Error]', e.message);
    }
};

module.exports = {
    logActivity,
    createNotification
};
