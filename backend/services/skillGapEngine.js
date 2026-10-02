const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Learning = require('../models/Learning');
const CareerPath = require('../models/CareerPath');
const User = require('../models/User');

const LEVEL_WEIGHTS = {
  'BEGINNER': 25,
  'INTERMEDIATE': 55,
  'ADVANCED': 85,
  'EXPERT': 100
};

exports.calculateSkillGap = async (userId) => {
  const user = await User.findById(userId);
  const targetRoleTitle = user ? user.careerGoal : 'Data Scientist';

  const userSkills = await Skill.find({ user: userId });
  const userProjects = await Project.find({ user: userId });
  const userExperiences = await Experience.find({ user: userId });
  const userLearning = await Learning.find({ user: userId });

  // Get matching Career Path (or fallback template)
  let careerPath = await CareerPath.findOne({ title: new RegExp(`^${targetRoleTitle}$`, 'i') });

  if (!careerPath) {
    // Default fallback requirements if seed not loaded
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

  // Create Skill Map for fast lookup
  const userSkillMap = {};
  userSkills.forEach(s => {
    userSkillMap[s.name.toLowerCase().trim()] = s;
  });

  // Track evidence across projects, experience, learning
  const projectSkillSet = new Set();
  userProjects.forEach(p => {
    (p.techs || []).forEach(t => projectSkillSet.add(t.toLowerCase().trim()));
  });

  const experienceSkillSet = new Set();
  userExperiences.forEach(e => {
    (e.skills || []).forEach(s => experienceSkillSet.add(s.toLowerCase().trim()));
  });

  const learningSkillSet = new Set();
  userLearning.forEach(l => {
    if (l.targetSkill) learningSkillSet.add(l.targetSkill.toLowerCase().trim());
  });

  let totalWeight = 0;
  let earnedWeight = 0;
  const gapAnalysis = [];

  for (const reqSkill of careerPath.requiredSkills) {
    const key = reqSkill.name.toLowerCase().trim();
    const minLevel = reqSkill.minLevel || 'INTERMEDIATE';
    const targetScore = LEVEL_WEIGHTS[minLevel] || 55;
    totalWeight += targetScore;

    const userSkill = userSkillMap[key];
    const currentLevel = userSkill ? userSkill.level : 'NONE';
    const currentScore = userSkill ? (LEVEL_WEIGHTS[currentLevel] || 0) : 0;

    // Check evidence
    const hasProjectEvidence = projectSkillSet.has(key);
    const hasExpEvidence = experienceSkillSet.has(key);
    const isLearningActive = learningSkillSet.has(key);

    let scoreContribution = currentScore;
    if (hasProjectEvidence) scoreContribution += 10;
    if (hasExpEvidence) scoreContribution += 10;
    if (scoreContribution > 100) scoreContribution = 100;

    earnedWeight += Math.min(scoreContribution, targetScore);

    let gapPriority = 'NONE';
    if (currentScore === 0) {
      gapPriority = 'HIGH';
    } else if (currentScore < targetScore) {
      gapPriority = (targetScore - currentScore >= 30) ? 'HIGH' : 'MEDIUM';
    } else if (!hasProjectEvidence && !hasExpEvidence) {
      gapPriority = 'EVIDENCE_REQUIRED';
    }

    gapAnalysis.push({
      skillName: reqSkill.name,
      requiredLevel: minLevel,
      currentLevel,
      currentScore,
      targetScore,
      gapPriority,
      hasProjectEvidence,
      hasExpEvidence,
      isLearningActive
    });
  }

  const alignmentScore = totalWeight > 0 
    ? parseFloat(((earnedWeight / totalWeight) * 100).toFixed(1))
    : 75.0;

  // Persist updated alignment score on user profile
  if (user) {
    user.alignmentScore = alignmentScore;
    await user.save();
  }

  return {
    targetRole: targetRoleTitle,
    alignmentScore,
    totalRequiredSkills: careerPath.requiredSkills.length,
    gapAnalysis,
    lastEvaluated: new Date()
  };
};
