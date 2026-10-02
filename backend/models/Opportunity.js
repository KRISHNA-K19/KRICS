const mongoose = require('mongoose');

const OpportunitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  organization: { type: String, required: true },
  type: { type: String, enum: ['Full-Time Job', 'Internship', 'Research Fellow', 'Project Contract'], default: 'Full-Time Job' },
  description: { type: String },
  location: { type: String, default: 'Remote / Hybrid' },
  requiredSkills: [{ type: String }],
  preferredSkills: [{ type: String }],
  applicationUrl: { type: String, default: '#' },
  deadline: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Opportunity', OpportunitySchema);
