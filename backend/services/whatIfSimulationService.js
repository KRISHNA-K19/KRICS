const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const CareerPath = require('../models/CareerPath');
const { calculateCareerAlignment } = require('./careerAlignmentService');

exports.simulateProfileImpact = async (userId, simulatedSkills = [], simulatedProjects = []) => {
  const user = await User.findById(userId);
  const currentAlignment = await calculateCareerAlignment(userId);

  // Perform temporary in-memory simulation
  const existingSkills = await Skill.find({ user: userId });
  const simulatedSkillNames = new Set([
    ...existingSkills.map(s => s.name.toLowerCase().trim()),
    ...simulatedSkills.map(s => s.toLowerCase().trim())
  ]);

  let careerPath = await CareerPath.findOne({ title: new RegExp(`^${user.careerGoal}$`, 'i') });
  if (!careerPath) {
    careerPath = {
      requiredSkills: [
        { name: 'Python', minLevel: 'ADVANCED' },
        { name: 'SQL', minLevel: 'INTERMEDIATE' },
        { name: 'Machine Learning', minLevel: 'ADVANCED' },
        { name: 'Inferential Statistics', minLevel: 'INTERMEDIATE' },
        { name: 'Data Visualization', minLevel: 'INTERMEDIATE' }
      ]
    };
  }

  const reqCount = (careerPath.requiredSkills || []).length || 1;
  let matchedCount = 0;
  careerPath.requiredSkills.forEach(req => {
    if (simulatedSkillNames.has(req.name.toLowerCase().trim())) matchedCount++;
  });

  const simulatedScore = Math.min(parseFloat(((matchedCount / reqCount) * 100).toFixed(1)), 98);
  const impactDelta = parseFloat((simulatedScore - currentAlignment.alignmentScore).toFixed(1));

  return {
    userId,
    targetRole: user.careerGoal,
    currentScore: currentAlignment.alignmentScore,
    simulatedScore,
    impactDelta: impactDelta > 0 ? `+${impactDelta}%` : `${impactDelta}%`,
    simulatedSkills,
    simulatedProjects,
    rationale: `Adding ${simulatedSkills.join(', ')} fills critical skill requirements for your target ${user.careerGoal} role.`
  };
};
