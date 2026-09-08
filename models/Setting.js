/**
 * Global System Configuration Setting Model
 */

const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    setting_key: {
        type: String,
        required: true,
        unique: true
    },
    setting_value: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);
