const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Certification = require('../models/Certification');
const Learning = require('../models/Learning');
const CareerPath = require('../models/CareerPath');
const { analyzeSkillEvidence } = require('./careerEvidenceService');

const LEVEL_WEIGHTS = {
  'BEGINNER': 25,
  'INTERMEDIATE': 55,
  'ADVANCED': 85,
  'EXPERT': 100
};

exports.calculateCareerAlignment = async (userId, targetRoleOverride = null) => {
  const user = await User.findById(userId);
  const targetRoleTitle = targetRoleOverride || (user ? user.careerGoal : 'Data Scientist');

  const userSkills = await Skill.find({ user: userId });
  const userProjects = await Project.find({ user: userId });
  const userExperiences = await Experience.find({ user: userId });
  const userCertifications = await Certification.find({ user: userId });
  const userLearning = await Learning.find({ user: userId });

  let careerPath = await CareerPath.findOne({ title: new RegExp(`^${targetRoleTitle}$`, 'i') });

  if (!careerPath) {
    careerPath = {
      title: targetRoleTitle,
      requiredSkills: [
        { name: 'Python', minLevel: 'ADVANCED' },
        { name: 'SQL', minLevel: 'INTERMEDIATE' },
        { name: 'Machine Learning', minLevel: 'ADVANCED' },
        { name: 'Inferential Statistics', minLevel: 'INTERMEDIATE' },
        { name: 'Data Visualization', minLevel: 'INTERMEDIATE' }
      ]
    };
  }

  const evidenceMap = await analyzeSkillEvidence(userId);
  const requiredSkills = careerPath.requiredSkills || [];

  let skillCoverageCount = 0;
  let totalProficiencyEarned = 0;
  let projectEvidenceEarned = 0;
  let experienceEvidenceEarned = 0;
  let learningEvidenceEarned = 0;
  let certEvidenceEarned = 0;

  const strongEvidenceList = [];
  const developingList = [];
  const limitedEvidenceList = [];

  requiredSkills.forEach(req => {
    const key = req.name.toLowerCase().trim();
    const minLevel = req.minLevel || 'INTERMEDIATE';
    const targetScore = LEVEL_WEIGHTS[minLevel] || 55;

    const evidence = evidenceMap[key];

    if (evidence) {
      skillCoverageCount++;

      const userProfScore = LEVEL_WEIGHTS[evidence.level] || 35;
      totalProficiencyEarned += Math.min(userProfScore / targetScore, 1.0);

      if (evidence.projectsCount > 0) projectEvidenceEarned++;
      if (evidence.experienceCount > 0) experienceEvidenceEarned++;
      if (evidence.learningCount > 0) learningEvidenceEarned++;
      if (evidence.certificationsCount > 0) certEvidenceEarned++;

      if (evidence.status === 'STRONG_EVIDENCE' || evidence.status === 'DEMONSTRATED') {
        strongEvidenceList.push(`✓ ${req.name} — ${evidence.level} (${evidence.projectsCount} projects)`);
      } else {
        developingList.push(`◐ ${req.name} — ${evidence.level}`);
      }
    } else {
      limitedEvidenceList.push(`○ ${req.name} — Missing in profile`);
    }
  });

  const totalReq = requiredSkills.length || 1;

  // Conceptual Weighting Model (Section 10)
  const coverageScore = (skillCoverageCount / totalReq) * 35;
  const proficiencyScore = (totalProficiencyEarned / totalReq) * 20;
  const projectScore = Math.min((projectEvidenceEarned / totalReq), 1.0) * 20;
  const expScore = Math.min((experienceEvidenceEarned / totalReq), 1.0) * 10;
  const learningScore = Math.min((learningEvidenceEarned / totalReq), 1.0) * 10;
  const certScore = Math.min((certEvidenceEarned / totalReq), 1.0) * 5;

  const alignmentScore = parseFloat((coverageScore + proficiencyScore + projectScore + expScore + learningScore + certScore).toFixed(1));

  // Update user profile alignment score if not simulation
  if (user && !targetRoleOverride) {
    user.alignmentScore = alignmentScore;
    await user.save();
  }

  return {
    targetRole: targetRoleTitle,
    alignmentScore,
    weightsBreakdown: {
      requiredSkillCoverage: parseFloat(coverageScore.toFixed(1)),
      skillProficiency: parseFloat(proficiencyScore.toFixed(1)),
      projectEvidence: parseFloat(projectScore.toFixed(1)),
      experienceEvidence: parseFloat(expScore.toFixed(1)),
      learningEvidence: parseFloat(learningScore.toFixed(1)),
      certificationEvidence: parseFloat(certScore.toFixed(1))
    },
    explainableBreakdown: {
      strongEvidence: strongEvidenceList,
      developing: developingList,
      limitedEvidence: limitedEvidenceList
    },
    calculatedAt: new Date()
  };
};
