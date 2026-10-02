const mongoose = require('mongoose');

const CareerPathSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  requiredSkills: [{
    name: { type: String, required: true },
    minLevel: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], default: 'INTERMEDIATE' }
  }],
  importantSkills: [{ type: String }],
  supportingSkills: [{ type: String }],
  averageSalary: { type: String },
  demandLevel: { type: String, default: 'High' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CareerPath', CareerPathSchema);
