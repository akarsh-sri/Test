const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');
const turf = require('@turf/turf');
const app = express();
const PORT = 3000;


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

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
 
  return res.status(401).json({ message: 'Unauthorized' });
}
router.post('/route', ensureAuthenticated,async (req, res) => {
  const { start, end } = req.body;
  try {
    const route = await getRoute(start, end);
    res.json({ route });
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch route' });
  }
});




module.exports = router;
