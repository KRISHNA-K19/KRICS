const mongoose = require('mongoose');

const GitHubEvidenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  githubRepoId: { type: mongoose.Schema.Types.ObjectId, ref: 'GitHubRepo' },
  repoName: { type: String },
  technology: { type: String, required: true },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  experienceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Experience' },
  evidenceType: { 
    type: String, 
    enum: ['LANGUAGE_USAGE', 'DEPENDENCY', 'README_SIGNAL', 'TOPIC_SIGNAL', 'COMMIT_ACTIVITY', 'PROJECT_IMPLEMENTATION'],
    default: 'LANGUAGE_USAGE' 
  },
  evidenceStrength: { 
    type: String, 
    enum: ['STRONG', 'MODERATE', 'SUPPORTING'], 
    default: 'SUPPORTING' 
  },
  signals: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('GitHubEvidence', GitHubEvidenceSchema);
