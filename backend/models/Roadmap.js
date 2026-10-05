const mongoose = require('mongoose');

const RoadmapTaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true },
  title: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['SKILL', 'LEARNING', 'PROJECT', 'EVIDENCE', 'GITHUB'], 
    default: 'SKILL' 
  },
  description: { type: String },
  fulfilled: { type: Boolean, default: false },
  completedAt: { type: Date },
  actionView: { type: String, default: 'skills' },
  actionText: { type: String, default: '[ADD EVIDENCE]' },
  xpReward: { type: Number, default: 50 },
  skillName: { type: String }
});

const RoadmapPhaseSchema = new mongoose.Schema({
  phaseId: { type: String, required: true },
  phaseNumber: { type: Number, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  whyThisPhaseMatters: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'BLOCKED', 'READY', 'COMPLETED'], 
    default: 'LOCKED' 
  },
  progress: { type: Number, default: 0 },
  estimatedEffort: { type: String, default: '2-3 weeks' },
  careerImpact: {
    level: { type: String, default: 'HIGH' },
    alignmentDelta: { type: String, default: '+5.0% Alignment Potential' },
    summary: { type: String }
  },
  dependencies: [{ type: String }], // Array of phaseId prerequisites
  skills: [{
    name: { type: String, required: true },
    targetLevel: { type: String, default: 'INTERMEDIATE' },
    currentLevel: { type: String, default: 'NONE' },
    status: { type: String, default: 'GAP' }
  }],
  tasks: [RoadmapTaskSchema],
  projects: [{
    title: { type: String, required: true },
    description: { type: String },
    suggestedTechs: [{ type: String }],
    fulfilled: { type: Boolean, default: false }
  }],
  evidenceRequirements: [{
    label: { type: String, required: true },
    fulfilled: { type: Boolean, default: false },
    evidenceType: { type: String }
  }]
});

const RoadmapSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerGoal: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  lastRecalculatedAt: { type: Date, default: Date.now },
  overallProgress: { type: Number, default: 0 },
  alignmentScore: { type: Number, default: 0 },
  phases: [RoadmapPhaseSchema]
}, { timestamps: true });

module.exports = mongoose.model('Roadmap', RoadmapSchema);
