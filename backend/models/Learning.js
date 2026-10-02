const mongoose = require('mongoose');

const LearningSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  provider: { type: String, default: 'Self-Paced / Online' },
  category: { type: String, default: 'Technical Skill' },
  targetSkill: { type: String },
  progress: { type: Number, default: 0 },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed', 'Paused'], default: 'In Progress' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Learning', LearningSchema);
