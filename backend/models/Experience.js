const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  type: { type: String, enum: ['Internship', 'Employment', 'Research', 'Freelance', 'Leadership'], default: 'Internship' },
  duration: { type: String },
  desc: { type: String },
  skills: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Experience', ExperienceSchema);
