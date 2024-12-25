const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Search = require('../models/Search');
const axios = require('axios');
const turf = require('@turf/turf');
const app = express();
const PORT = 3000;
const Notification = require('../models/Notifications');

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


// Function to get the route between two locations using OSRM
async function getRoute(startLocation, endLocation) {
  const baseUrl = 'http://router.project-osrm.org/route/v1/driving/';
  const coordinates = `${startLocation.lng},${startLocation.lat};${endLocation.lng},${endLocation.lat}`;
  const url = `${baseUrl}${coordinates}?overview=full&geometries=geojson`;

  try {
    const response = await axios.get(url);

    // Log the entire response for debugging
    // console.log('OSRM API response:', JSON.stringify(response.data, null, 2));

    // Validate if routes exist
    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No routes found');
    }

    const route = response.data.routes[0].geometry?.coordinates;

    // Validate if geometry and coordinates exist
    if (!route || !Array.isArray(route)) {
      throw new Error('No coordinates found in route geometry');
    }

    // Map over coordinates to return lat/lng pairs
    const formattedRoute = route.map(coord => ({
      lng: coord[0],
      lat: coord[1],
    }));

    return formattedRoute;

  } catch (error) {
    console.error('Error fetching route:', error.message);
    throw error;
  }
}

// Function to check if one route is a subarray of the other
function routesMatch(route1, route2, toleranceMeters) {
  toleranceMeters = 700;
  let smallerRoute, largerRoute;
  if (route1.length <= route2.length) {
    smallerRoute = route1;
    largerRoute = route2;
  } else {
    smallerRoute = route2;
    largerRoute = route1;
  }
  let flag = false;
  // Check for subarray presence
  for (let i = 0; i <= largerRoute.length - smallerRoute.length; i++) {
    let count = 0;
    for (let j = 0; j < smallerRoute.length; j++) {
      const from = turf.point([smallerRoute[j].lng, smallerRoute[j].lat]);
      const to = turf.point([largerRoute[i + j].lng, largerRoute[i + j].lat]);
      const distance = turf.distance(from, to, { units: 'meters' });
      // console.log(distance);
      if (distance <= toleranceMeters) {
        count++;
      }
    }
    // console.log(count);
    // console.log(smallerRoute.length);
    // console.log(count/smallerRoute.length);
    // console.log("\n");
    if (count / smallerRoute.length >= 0.8) {
      flag = true;
      return { flag: true, reach: largerRoute[i] };
    }
  }
  return { flag: false };
}

router.post('/find-matching-rides', async (req, res) => {
  const { initialLocation2, finalLocation2, startTime2, cap, email, name } = req.body;
  // console.log(email);

  const userId = req.user._id;

  const ride = new Search({
    name,
    email,
    initialLocation2,
    userId,
    finalLocation2,
    startTime2,
    cap
  });
  await ride.save();

  const tolerance = 700;

  try {
    const users = await Ride.find();
    const requestedStartTime = new Date(startTime2).getTime();
    let ans = [];

    // Fetch routes for all users asynchronously
    for (const user of users) {
      try {
        const [route1, route2] = await Promise.all([
          getRoute(user.initialLocation, user.finalLocation),
          getRoute(initialLocation2, finalLocation2)
        ]);

        const timeUser = new Date(user.startTime).getTime();
        const res = routesMatch(route1, route2, tolerance);
        let isMatch = res.flag;
        let matchedPoint;
        if (isMatch) {
          matchedPoint = res.reach;
        }
        // if (route1.length < route2.length) isMatch = false;

        if (isMatch) {
          // const matchedPoint = routesMatch(route1, route2, tolerance).reach;

          const result = await getTravelTime(user.initialLocation, matchedPoint);
          if (result) {
            console.log(`Estimated travel time: ${result.travelTime.toFixed(2)} minutes`);
            console.log(`Distance: ${result.distance.toFixed(2)} meters`);

            // Check if the sum of travel time and timeUser is within 10 minutes of requestedStartTime
            const totalTime = timeUser + result.travelTime * 60 * 1000; // Convert travel time to milliseconds
            const timeDifference = Math.abs(totalTime - requestedStartTime);

            if (timeDifference <= 10 * 60 * 1000 && cap <= user.cap && email != user.email) { // 10 minutes in milliseconds

              ans.push(user); // push the matched user to the answer array
            }
          } else {
            console.log("Failed to retrieve travel data.");
          }
        }
      } catch (error) {
        console.error('Error processing user routes:', error.message);
        continue;
        // You can choose to handle the error, log it, or continue processing other users
      }
    }

    res.status(200).json(ans); // Return matching rides/users

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
router.post('/:rideId/handle-decision', async (req, res) => {
  const { userId, decision } = req.body;
  const ride = await Ride.findById(req.params.rideId);
  const request = ride.bookedBy.find(r => r.user.toString() === userId);
  if (request) {
    request.status = decision;
    await ride.save();
  }
  res.status(200).json(ride);
});


// router.post('/:rideId/request', async (req, res) => {
//   const ride = await Ride.findByIdAndUpdate(req.params.rideId, {
//       $push: { bookedBy: { user: req.user._id } }
//   }, { new: true });
//   res.status(200).json(ride);
// });

// routes/rides.js
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
}
router.get('/:rideId', ensureAuthenticated, async (req, res) => {
  try {
    console.log("hrllo")
    const ride = await Ride.findById(req.params.rideId)
      .populate('userId', 'username email') // Corrected field
      .populate('bookedBy.user', 'username email'); // Populate user details

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    res.status(200).json(ride);
  } catch (error) {
    console.error('Error fetching ride details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/:rideId/request', async (req, res) => {
  const ride = await Ride.findById(req.params.rideId);

  if (!ride) {
    return res.status(404).json({ message: 'Ride not found' });
  }

  // Add the user who requested the ride to the bookedBy array
  ride.bookedBy.push({ user: req.user._id, status: 'pending' });

  // Create a notification for the host
  const notification = new Notification({
    userId: ride.userId,  // Host of the ride
    rideId: ride._id,
    text: `You have a new ride request from ${req.user.username}.`,
  });

  await notification.save();

  // Save the updated ride document
  await ride.save();

  res.status(200).json(ride);
});

module.exports = router;

// router.post('/find-matching-rides', async (req, res) => {
//   const {initialLocation2, finalLocation2, startTime2} = req.body;
//   const tolerance = 700;

//   try {
//     const users = await User.find();
//     const requestedStartTime = new Date(startTime2).getTime();
//     let ans = [];
//     // Fetch routes for all users asynchronously
//     for (const user of users) {
//       try {
//         const [route1, route2] = await Promise.all([
//           getRoute(user.initialLocation, user.finalLocation),
//           getRoute(initialLocation2, finalLocation2)
//         ]);

//         const timeUser=new Date(user.startTime).getTime();
//         let isMatch = routesMatch(route1, route2, tolerance).flag;
//         if(route1.length<route2.length) isMatch=false;
//         if (isMatch) {
//           getTravelTime(user.initialLocation, routesMatch(route1, route2, tolerance).reach).then((result) => {
//             if (result) {
//                 console.log(`Estimated travel time: ${result.travelTime.toFixed(2)} minutes`);
//                 console.log(`Distance: ${result.distance.toFixed(2)} meters`);
//             } else {
//                 console.log("Failed to retrieve travel data.");
//             }
//           });

//           ans.push(user); // push the matched user to the answer array
//         }
//       } catch (error) {
//         console.error('Error processing user routes:', error.message);
//         // You can choose to handle the error, log it, or continue processing other users
//       }
//     }

//     res.status(200).json(ans); // Return matching rides/users

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

