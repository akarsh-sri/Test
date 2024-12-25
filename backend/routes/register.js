// backend/routes/users.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Load User Model
const User = require('../models/User');

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, age, password } = req.body;

  // Basic Validation
  if (!name || !email || !age || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  if (age < 18) {
    return res.status(400).json({ message: 'You must be at least 18 years old' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    // Check for existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      age,
      password,
    });

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    // Save User
    await newUser.save();

    res.status(201).json({ message: 'Registration successful', user: newUser });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!user) {
      return res.status(400).json({ message: info.message || 'Invalid credentials' });
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      res.json({ message: 'Login successful', user });
    });
  })(req, res, next);
});

// @route   GET /api/users/user
// @desc    Get current user
// @access  Private
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', async (req, res) => {
  if (req.isAuthenticated()) {
    const { name, age } = req.body;

    // Validation
    if (!name || !age) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    if (age < 18) {
      return res.status(400).json({ message: 'You must be at least 18 years old' });
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { name, age },
        { new: true }
      ).select('-password'); // Exclude password

      res.json({ message: 'Profile updated', user: updatedUser });
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// @route   POST /api/users/logout
// @desc    Logout user
// @access  Private
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
