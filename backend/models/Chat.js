// backend/models/Chat.js
const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Participants
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    text: String,
    timestamp: Date,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Chat', ChatSchema);
