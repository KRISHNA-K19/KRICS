const mongoose = require('mongoose');

const GitHubRepoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  githubRepoId: { type: Number, required: true },
  name: { type: String, required: true },
  fullName: { type: String },
  owner: { type: String },
  description: { type: String },
  htmlUrl: { type: String },
  defaultBranch: { type: String, default: 'main' },
  visibility: { type: String, default: 'public' },
  isPrivate: { type: Boolean, default: false },
  isFork: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  stars: { type: Number, default: 0 },
  forks: { type: Number, default: 0 },
  openIssues: { type: Number, default: 0 },
  language: { type: String },
  languages: [{
    language: { type: String },
    bytes: { type: Number },
    percentage: { type: Number }
  }],
  topics: [{ type: String }],
  readmeAvailable: { type: Boolean, default: false },
  readmeContent: { type: String },
  readmeSha: { type: String },
  commitCount: { type: Number, default: 0 },
  recentActivityAt: { type: Date },
  detectedTechs: [{ type: String }],
  selectedForKrics: { type: Boolean, default: false },
  linkedProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  linkedExperienceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Experience' },
  linkedSkillIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  lastSyncedAt: { type: Date, default: Date.now },
  githubCreatedAt: { type: Date },
  githubUpdatedAt: { type: Date },
  githubPushedAt: { type: Date }
}, { timestamps: true });

GitHubRepoSchema.index({ user: 1, githubRepoId: 1 }, { unique: true });

module.exports = mongoose.model('GitHubRepo', GitHubRepoSchema);
