const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  preferredName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  location: { type: String },
  photoUrl: { type: String },
  bio: { type: String },
  linkedin: { type: String },
  github: { type: String },
  portfolio: { type: String },
  careerGoal: { type: String, default: 'Data Scientist' },
  alignmentScore: { type: Number, default: 78.4 },
  xp: { type: Number, default: 1250 },
  level: { type: Number, default: 4 },
  claimedMissionIds: [{ type: String }],
  xpHistory: [{
    title: { type: String },
    xp: { type: Number },
    category: { type: String },
    rationale: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  achievements: [{
    id: { type: String },
    title: { type: String },
    description: { type: String },
    badge: { type: String },
    unlockedAt: { type: Date, default: Date.now }
  }],
  careerActionStreak: {
    count: { type: Number, default: 3 },
    lastActionDate: { type: Date, default: Date.now }
  },
  isVerified: { type: Boolean, default: false },
  onboardingCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
