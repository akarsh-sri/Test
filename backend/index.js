require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const MongoStore = require('connect-mongo');
const User = require('./models/User');
const Chat = require('./models/Chat');
const Ride = require('./models/Ride');
const userRoutes = require('./routes/user');
const rideRoutes = require('./routes/matching');
const getpath = require('./routes/route');
const chatRoutes = require('./routes/chat');
const registerRoutes = require('./routes/register');
const bookingsRoute = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true, // Allow credentials (cookies) to be sent
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    secure: false, // Set to true in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport Config
require('./config/passport')(passport);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/path', getpath);
app.use('/api/chat', chatRoutes);
app.use('/api/bookings', bookingsRoute);
app.use('/api/register', registerRoutes);

// Example Notification Route
app.get('/api/notifications/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid User ID format' });
  }

  try {
    const rides = await Ride.find({
      userId: new mongoose.Types.ObjectId(userId),
      'bookedBy.status': 'pending',
    }).populate('bookedBy.user', 'username email');

    const notifications = rides.flatMap(ride =>
      ride.bookedBy
        .filter(booking => booking.status === 'pending')
        .map(booking => ({
          text: `You have a new ride request from ${booking.user.username} for the ride "${ride.name}".`,
          rideId: ride._id,
          requesterId: booking.user._id,
          rideName: ride.name,
          requesterName: booking.user.username,
          createdAt: ride.startTime,
        }))
    );

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications: ", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // Exit the app if DB connection fails
  });

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('New client connected');

  // Join a chat room
  socket.on('joinChat', (chatId) => {
    socket.join(chatId);
    console.log(`Socket joined chat: ${chatId}`);
  });

  // Handle sending messages
  socket.on('sendMessage', async ({ chatId, sender, text }) => {
    try {
      const message = { sender, text, timestamp: new Date() };
      const chat = await Chat.findByIdAndUpdate(
        chatId,
        { $push: { messages: message } },
        { new: true }
      ).populate('messages.sender', 'name email profile');

      io.to(chatId).emit('messageReceived', message);
    } catch (error) {
      console.error('Send Message Error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});



// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const session = require('express-session');
// const passport = require('passport');
// const http = require('http');
// const { Server } = require('socket.io');
// const User = require('./models/User');
// const Chat=require('./models/Chat')
// const app = express();
// const router = express.Router();
// // Import Routes
// const bodyParser = require('body-parser');
// const userRoutes = require('./routes/user'); // Corrected filename
// const rideRoutes = require('./routes/matching'); // Corrected filename
// const getpath = require('./routes/route');
// const chatRoutes = require('./routes/chat');
// const registerRoutes = require('./routes/register');
// const bookingsRoute=require("./routes/bookings")
// // const Booking=require("./models/")
// // Middleware
// app.use(bodyParser.json());
// app.use(cors({
//   origin: process.env.CLIENT_URL,
//   credentials: true, // Allow credentials (cookies) to be sent
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// const MongoStore = require('connect-mongo');
// // Express Session
// app.use(session({
//   secret: process.env.SESSION_SECRET, // e.g., 'your_secret_key'
//   resave: false,
//   saveUninitialized: false,
//   store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
//   cookie: {
//     secure: false, // Set to true in production
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000, // 1 day
//   },
// }));

// // Passport Middleware
// app.use(passport.initialize());
// app.use(passport.session());

// // Passport Config
// require('./config/passport')(passport);


// // Routes (after session and passport middleware)
// const Ride = require('./models/Ride');
// // Example route for canceling a booking
// app.delete('/api/bookings/:rideId', async (req, res) => {
//   const { rideId } = req.params;
//   try {
     
//       const booking = await Booking.findByIdAndDelete(rideId);
//       if (!booking) {
//           return res.status(404).send({ message: 'Booking not found' });
//       }
//       res.send({ message: 'Booking canceled successfully' });
//   } catch (error) {
//       res.status(500).send({ message: 'Failed to cancel booking' });
//   }
// });

// app.use('/api/users', userRoutes);
// app.use('/api/rides', rideRoutes);
// app.use('/api/path', getpath);
// app.use('/api/chat', chatRoutes);
// app.use('/api/bookings', bookingsRoute);
// app.use('/api/register', registerRoutes);

// app.get('/api/notifications/:userId',  async (req, res) => {
//   const { userId } = req.params;

  
//   if (!userId) {
//     return res.status(400).json({ error: 'User ID is required' });
//   }

//   // 2. Validate ObjectId format
//   if (!mongoose.Types.ObjectId.isValid(userId)) {
//     return res.status(400).json({ error: 'Invalid User ID format' });
//   }

//   try {
//     console.log("Fetching notifications for user (host):", userId);

    
//     const rides = await Ride.find({
//       userId: new mongoose.Types.ObjectId(userId), 
//       'bookedBy.status': 'pending' 
//     }).populate('bookedBy.user', 'username email'); 


//     const notifications = rides.flatMap(ride => 
//       ride.bookedBy
//         .filter(booking => booking.status === 'pending')
//         .map(booking => ({
//           text: `You have a new ride request from ${booking.user.username} for the ride "${ride.name}".`,
//           rideId: ride._id,
//           requesterId: booking.user._id,
//           rideName: ride.name,
//           requesterName: booking.user.username,
//           createdAt: ride.startTime, 
//         }))
//     );

//     res.status(200).json(notifications);
//   } catch (error) {
//     console.error("Error fetching notifications: ", error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//   // Remove deprecated options
// })
//   .then(() => console.log('✅ MongoDB Connected'))
//   .catch(err => console.error('MongoDB connection error:', err));

// // Create HTTP Server
// const server = http.createServer(app);

// // Initialize Socket.IO
// const io = new Server(server, {
//   cors: {
//     origin: process.env.CLIENT_URL,
//     methods: ['GET', 'POST'],
//     credentials: true,
//   },
// });

// // Socket.IO Connection
// io.on('connection', (socket) => {
//   console.log('New client connected');

//   // Join a chat room
//   socket.on('joinChat', (chatId) => {
//     socket.join(chatId);
//     console.log(`Socket joined chat: ${chatId}`);
//   });

//   // Handle sending messages
//   socket.on('sendMessage', async ({ chatId, sender, text }) => {
//     try {
//       const message = { sender, text, timestamp: new Date() };
//       const chat = await Chat.findByIdAndUpdate(
//         chatId,
//         { $push: { messages: message } },
//         { new: true }
//       ).populate('messages.sender', 'name email profile');

//       // Emit the message to all clients in the chat room
//       io.to(chatId).emit('messageReceived', message);
//     } catch (error) {
//       console.error('Send Message Error:', error);
//     }
//   });

//   socket.on('disconnect', () => {
//     console.log('Client disconnected');
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
