// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

// Get user bio - Define this route first to avoid conflicts with dynamic routes
router.get('/user/:userId', ensureAuthenticated, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user bio:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get or create a chat between two users
router.post('/create-or-get', ensureAuthenticated, async (req, res) => {
  const { recipientId } = req.body;
  const currentUserId = req.user._id;

  if (currentUserId.toString() === recipientId) {
    return res.status(400).json({ message: 'Cannot chat with yourself.' });
  }

  try {
    let chat = await Chat.findOne({
      users: { $all: [currentUserId, recipientId] }
    });

    if (!chat) {
      chat = new Chat({
        users: [currentUserId, recipientId],
        messages: []
      });
      await chat.save();
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages of a chat
router.get('/:chatId/messages', ensureAuthenticated, async (req, res) => {
  const { chatId } = req.params;
  const currentUserId = req.user._id;

  try {
    const chat = await Chat.findById(chatId)
      .populate('messages.sender', 'name email profile');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if current user is part of the chat
    if (!chat.users.includes(currentUserId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(chat.messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message in a chat
// Send a message in a chat
router.post('/:chatId/messages', ensureAuthenticated, async (req, res) => {
  const { chatId } = req.params;
  const { text } = req.body;
  const currentUserId = req.user._id;

  if (!text || text.trim() === '') {
    return res.status(400).json({ message: 'Message text cannot be empty.' });
  }

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if current user is part of the chat
    if (!chat.users.includes(currentUserId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = {
      sender: currentUserId,
      text,
      timestamp: new Date(),
    };

    chat.messages.push(message);
    await chat.save();

    // Populate the sender information directly after saving the chat
    const populatedMessage = await Chat.findById(chatId)
      .populate('messages.sender', 'name email profile');

    res.status(201).json(populatedMessage.messages.slice(-1)[0]); // Return the latest message
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
