/**
 * Database Auto-Seeder
 * Initializes Roles, Storage Plans, Admin Account, Demo User, Settings, and Helpdesk Data
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Role = require('../models/Role');
const StoragePlan = require('../models/StoragePlan');
const User = require('../models/User');
const Folder = require('../models/Folder');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const Setting = require('../models/Setting');
const SupportTicket = require('../models/SupportTicket');
const SupportReply = require('../models/SupportReply');

const seedData = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/file_storage_db';
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(uri);
        }
        console.log('[Seeder] Connected to MongoDB for provisioning...');

        // 1. Seed Roles
        const roleCount = await Role.countDocuments();
        if (roleCount === 0) {
            await Role.create([
                { name: 'admin', description: 'Administrator with full system privileges', permissions: ['all'] },
                { name: 'user', description: 'Standard user with personal workspace', permissions: ['read', 'write', 'share'] },
                { name: 'editor', description: 'Editor with write and modify privileges', permissions: ['read', 'write'] },
                { name: 'viewer', description: 'Read-only viewer', permissions: ['read'] }
            ]);
            console.log('[Seeder] Roles seeded.');
        }

        // 2. Seed Storage Plans
        let freePlan = await StoragePlan.findOne({ plan_name: 'Free Starter' });
        if (!freePlan) {
            freePlan = await StoragePlan.create({
                plan_name: 'Free Starter',
                storage_bytes: 524288000, // 500 MB
                price: 0.00,
                billing_cycle: 'free',
                description: '500 MB secure storage for basic documents and files.',
                max_file_size: 26214400, // 25 MB
                is_active: true
            });
            console.log('[Seeder] Free Starter plan created.');
        }

        let proPlan = await StoragePlan.findOne({ plan_name: 'Pro Storage' });
        if (!proPlan) {
            proPlan = await StoragePlan.create({
                plan_name: 'Pro Storage',
                storage_bytes: 5368709120, // 5 GB
                price: 9.99,
                billing_cycle: 'monthly',
                description: '5 GB enhanced storage with high-speed download & priority support.',
                max_file_size: 209715200, // 200 MB
                is_active: true
            });
            console.log('[Seeder] Pro Storage plan created.');
        }

        let businessPlan = await StoragePlan.findOne({ plan_name: 'Business Ultimate' });
        if (!businessPlan) {
            businessPlan = await StoragePlan.create({
                plan_name: 'Business Ultimate',
                storage_bytes: 21474836480, // 20 GB
                price: 24.99,
                billing_cycle: 'monthly',
                description: '20 GB maximum storage with unlimited file shares and dedicated audit logs.',
                max_file_size: 1073741824, // 1 GB
                is_active: true
            });
            console.log('[Seeder] Business Ultimate plan created.');
        }

        // 3. Seed Admin Account
        let adminUser = await User.findOne({ email: 'admin@filestorage.local' });
        if (!adminUser) {
            adminUser = await User.create({
                role: 'admin',
                storage_plan: businessPlan._id,
                full_name: 'System Administrator',
                email: 'admin@filestorage.local',
                password: 'Admin@12345',
                avatar: 'default_avatar.png',
                storage_used_bytes: 0,
                storage_limit_bytes: 21474836480,
                status: 'active'
            });
            console.log('[Seeder] Admin user seeded: admin@filestorage.local / Admin@12345');
        }

        // 4. Seed Demo User Account
        let demoUser = await User.findOne({ email: 'user@filestorage.local' });
        if (!demoUser) {
            demoUser = await User.create({
                role: 'user',
                storage_plan: freePlan._id,
                full_name: 'John Doe',
                email: 'user@filestorage.local',
                password: 'User@12345',
                avatar: 'default_avatar.png',
                storage_used_bytes: 0,
                storage_limit_bytes: 524288000,
                status: 'active'
            });
            console.log('[Seeder] Demo user seeded: user@filestorage.local / User@12345');

            // Seed sample folders
            const fWork = await Folder.create({
                user: demoUser._id,
                parent: null,
                folder_name: 'Work Documents',
                color_code: '#3b82f6'
            });

            const fPersonal = await Folder.create({
                user: demoUser._id,
                parent: null,
                folder_name: 'Personal & Photos',
                color_code: '#10b981'
            });

            await Folder.create({
                user: demoUser._id,
                parent: fWork._id,
                folder_name: 'Project Reports',
                color_code: '#8b5cf6'
            });

            // Seed welcome notification
            await Notification.create({
                user: demoUser._id,
                title: 'Welcome to SecureVault',
                message: 'Your account is ready with 500MB free AES-256 encrypted cloud storage.',
                type: 'success',
                link: '/files'
            });

            // Seed initial activity log
            await ActivityLog.create({
                user: demoUser._id,
                action_type: 'ACCOUNT_CREATED',
                description: 'User account registered with 500MB Free Starter quota',
                ip_address: '127.0.0.1',
                user_agent: 'Node.js Express App'
            });

            // Seed sample support ticket
            const ticket = await SupportTicket.create({
                user: demoUser._id,
                subject: 'How do I generate an encrypted link for file sharing?',
                priority: 'medium',
                status: 'resolved'
            });

            await SupportReply.create({
                ticket: ticket._id,
                user: demoUser._id,
                message: 'Hi, I would like to know how to create a password-protected share link for my PDF report.',
                is_admin_reply: false
            });

            await SupportReply.create({
                ticket: ticket._id,
                user: adminUser._id,
                message: 'Hello John! Click the "Share" action icon on any file, select "Public Link", check "Require Passcode", and share the generated URL.',
                is_admin_reply: true
            });
        }

        // 5. Seed System Settings
        const settingsCount = await Setting.countDocuments();
        if (settingsCount === 0) {
            await Setting.insertMany([
                { setting_key: 'site_name', setting_value: 'SecureVault' },
                { setting_key: 'max_upload_size_mb', setting_value: '100' },
                { setting_key: 'allowed_extensions', setting_value: 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,jpg,jpeg,png,gif,svg,webp,zip,rar,7z,tar,gz,mp3,wav,mp4,mkv,mov,json,xml,html,css,js,php,py,java,cpp,sql' },
                { setting_key: 'enable_registration', setting_value: '1' },
                { setting_key: 'maintenance_mode', setting_value: '0' }
            ]);
            console.log('[Seeder] Default settings seeded.');
        }

        console.log('[Seeder] Seeding completed successfully.');
    } catch (err) {
        console.error('[Seeder Error]', err.message);
    }
};

if (require.main === module) {
    seedData().then(() => {
        mongoose.connection.close();
        process.exit(0);
    });
}

module.exports = seedData;
