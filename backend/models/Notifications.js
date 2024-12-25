
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The host
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model('Notification', NotificationSchema);
module.exports = Notification;
