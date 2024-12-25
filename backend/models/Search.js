// backend/models/Ride.js
const mongoose = require('mongoose');

const SearchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Host
    startTime2: { type: Date, required: true },  // Start time of the ride
    initialLocation2: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    finalLocation2: {
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

const Search = mongoose.model('Search', SearchSchema);
module.exports = Search;
