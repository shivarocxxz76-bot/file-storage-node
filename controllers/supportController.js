/**
 * Helpdesk & Support Controller
 */

const SupportTicket = require('../models/SupportTicket');
const SupportReply = require('../models/SupportReply');
const { logActivity, createNotification } = require('../middleware/activityLogger');
const { timeAgo } = require('../middleware/helpers');

// User Support Page (List or specific thread)
exports.getSupport = async (req, res) => {
    try {
        const userId = req.session.userId;
        const ticketId = req.query.ticket_id;

        let activeTicket = null;
        let ticketReplies = [];

        if (ticketId) {
            activeTicket = await SupportTicket.findOne({ _id: ticketId, user: userId });
            if (activeTicket) {
                ticketReplies = await SupportReply.find({ ticket: activeTicket._id })
                    .populate('user', 'full_name role')
                    .sort({ createdAt: 1 });
            }
        }

        const myTickets = await SupportTicket.find({ user: userId }).sort({ createdAt: -1 });

        res.render('user/support', {
            title: 'Helpdesk & Support',
            activeTicket,
            ticketReplies,
            myTickets,
            timeAgo
        });
    } catch (err) {
        console.error('Support error:', err);
        req.flash('danger', 'Error loading support desk.');
        res.redirect('/dashboard');
    }
};

// Create Support Ticket
exports.createTicket = async (req, res) => {
    try {
        const { subject, priority, message } = req.body;
        const userId = req.session.userId;

        if (!subject || !message) {
            req.flash('danger', 'Please provide a subject and message description.');
            return res.redirect('/support');
        }

        const ticket = await SupportTicket.create({
            user: userId,
            subject: subject.trim(),
            priority: priority || 'medium',
            status: 'open'
        });

        await SupportReply.create({
            ticket: ticket._id,
            user: userId,
            message: message.trim(),
            is_admin_reply: false
        });

        await logActivity(req, userId, 'CREATE_TICKET', `Created support ticket: ${subject}`, 'system', ticket._id);
        req.flash('success', 'Support ticket submitted. Our team will review it shortly.');
        res.redirect(`/support?ticket_id=${ticket._id}`);
    } catch (err) {
        console.error('Create ticket error:', err);
        req.flash('danger', 'Failed to submit support ticket.');
        res.redirect('/support');
    }
};

// Post Reply to Ticket
exports.postReply = async (req, res) => {
    try {
        const { ticket_id, message } = req.body;
        const userId = req.session.userId;
        const isAdmin = req.session.userRole === 'admin';

        if (!message || !message.trim()) {
            req.flash('danger', 'Reply message cannot be blank.');
            return res.redirect(`/support?ticket_id=${ticket_id}`);
        }

        const query = isAdmin ? { _id: ticket_id } : { _id: ticket_id, user: userId };
        const ticket = await SupportTicket.findOne(query);

        if (!ticket) {
            req.flash('danger', 'Ticket not found or permission denied.');
            return res.redirect('/support');
        }

        await SupportReply.create({
            ticket: ticket._id,
            user: userId,
            message: message.trim(),
            is_admin_reply: isAdmin
        });

        if (isAdmin) {
            ticket.status = 'in_progress';
            await ticket.save();

            await createNotification(
                ticket.user,
                'Support Ticket Reply',
                `An administrator replied to your ticket: "${ticket.subject}"`,
                'info',
                `/support?ticket_id=${ticket._id}`
            );
        }

        await logActivity(req, userId, 'TICKET_REPLY', `Replied to support ticket #${ticket._id}`, 'system', ticket._id);
        req.flash('success', 'Reply posted successfully.');

        const redirectUrl = isAdmin ? `/admin/support?ticket_id=${ticket._id}` : `/support?ticket_id=${ticket._id}`;
        res.redirect(redirectUrl);
    } catch (err) {
        console.error('Reply error:', err);
        req.flash('danger', 'Failed to send reply.');
        res.redirect('/support');
    }
};
