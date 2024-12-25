// backend/config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
  // Define the local strategy
  passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      // Find the user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return done(null, false, { message: 'No user found with that email.' });
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      // Successful authentication
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // Serialize user into the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
