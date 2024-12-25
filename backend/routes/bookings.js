
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ride = require('../models/Ride'); // Adjust the path as necessary


router.get('/user/:userId',async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid User ID format' });
    }

    try {
        console.log("Fetching bookings for user:", userId);

     
        const rides = await Ride.find({
            'bookedBy.user': new mongoose.Types.ObjectId(userId)
        })
        .populate('userId', 'username email') // Host details
        .populate('bookedBy.user', 'username email'); // Booker details

        // 3. Map bookings to include relevant information
        const bookings = rides.map(ride => {
            const booking = ride.bookedBy.find(b => b.user._id.toString() === userId);
            return {
                rideId: ride._id,
                rideName: ride.name,
                host: {
                    username: ride.userId.username,
                    email: ride.userId.email
                },
                startTime: ride.startTime,
                initialLocation: ride.initialLocation,
                finalLocation: ride.finalLocation,
                status: booking.status
            };
        });

        res.status(200).json(bookings);
    } catch (error) {
        console.error("Error fetching bookings: ", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
