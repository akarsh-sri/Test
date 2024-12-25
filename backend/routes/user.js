const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const axios = require('axios');
const turf = require('@turf/turf');
const User = require('../models/User');
// POST route to submit ride info
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ message: 'Unauthorized' });
}

async function getTravelTime(start, end) {
    // Convert lat/lng to the format required by OSRM: "lng,lat"
    const startCoord = `${start.lng},${start.lat}`;
    const endCoord = `${end.lng},${end.lat}`;

    const url = `http://router.project-osrm.org/route/v1/driving/${startCoord};${endCoord}?overview=false&steps=false`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const travelTimeInSeconds = route.duration;
            const distanceInMeters = route.distance;

            // Convert time to minutes for better readability
            const travelTimeInMinutes = travelTimeInSeconds / 60;

            return {
                travelTime: travelTimeInMinutes,
                distance: distanceInMeters
            };
        }
    } catch (error) {
        console.error("Error fetching route:", error);
        return null;
    }
}


router.post('/submit-ride', ensureAuthenticated, async (req, res) => {
    const { name, email, startTime, initialLocation, finalLocation,cap } = req.body;
    console.log(req.body);
    console.log('Authenticated User:', req.user);

    const userId = req.user._id;

    try {
        const ride = new Ride({
            name,
            email,
            initialLocation,
            userId,
            finalLocation,
            startTime,
            cap
        });
        await ride.save();
        let ans = await getTravelTime(initialLocation, finalLocation);
        res.json({
            message: 'Ride info submitted successfully',
            distance: ans.distance,
            time: ans.travelTime
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});
router.get('/chatt', ensureAuthenticated, async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password field
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
