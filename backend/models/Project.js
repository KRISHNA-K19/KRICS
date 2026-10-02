const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  desc: { type: String },
  type: { type: String, default: 'Personal' },
  techs: [{ type: String }],
  role: { type: String },
  projectLink: { type: String },
  githubLink: { type: String },
  status: { type: String, default: 'Completed' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);
