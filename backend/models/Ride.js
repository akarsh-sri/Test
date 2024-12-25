// backend/models/Ride.js
const mongoose = require('mongoose');

const RideSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Host
    startTime: { type: Date, required: true },  // Start time of the ride
    initialLocation: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    finalLocation: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    bookedBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
    }],
    status: {
        type: String,
        enum: ['open', 'booked', 'completed', 'cancelled'],
        default: 'open'
    },
    cap: {
        type: Number
    }
});

const Ride = mongoose.model('Ride', RideSchema);
module.exports = Ride;
