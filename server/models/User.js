const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    // email should be unique
  },
  email: {
    type: String,
    required: true,
    unique: true, // Email must be unique
    match: [/^[\w.-]+@[\w.-]*buksu\.edu\.ph$/i, "Please use a valid BUKSU email address"],
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password is required only if not using Google OAuth
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
  },
  profilePicture: {
    type: String,
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  role: {
    type: String,
    default: "user",
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  lastLogin: {
    type: Date,
    default: null, // null means user has never logged in
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  // Google Calendar integration tokens
  googleAccessToken: {
    type: String,
  },
  googleRefreshToken: {
    type: String,
  },
  googleTokenExpiry: {
    type: Date,
  },
  googleCalendarEnabled: {
    type: Boolean,
    default: false,
  },
  googleCalendarId: {
    type: String,
  },
}, {
  timestamps: true,
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
