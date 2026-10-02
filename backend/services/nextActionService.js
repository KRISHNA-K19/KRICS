const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Learning = require('../models/Learning');
const { calculateSkillGap } = require('./skillGapEngine');

exports.generateNextBestAction = async (userId) => {
  const user = await User.findById(userId);
  const gapResult = await calculateSkillGap(userId);
  const userProjects = await Project.find({ user: userId });
  const activeLearning = await Learning.findOne({ user: userId, status: 'In Progress' });

  const actions = [];

  // High priority gap action
  const highGaps = gapResult.gapAnalysis.filter(g => g.gapPriority === 'HIGH');
  if (highGaps.length > 0) {
    const topGap = highGaps[0];
    actions.push({
      actionType: 'STRENGTHEN_SKILL',
      title: `Strengthen ${topGap.skillName}`,
      why: `${topGap.skillName} is a critical requirement for your target ${user.careerGoal} role, but your current profile has limited evidence.`,
      recommendedSteps: [
        `1. Start a focused learning track in ${topGap.skillName}`,
        `2. Build a practical hands-on project demonstrating ${topGap.skillName}`,
        `3. Connect the project to your KRICS career graph`
      ],
      priority: 'HIGH'
    });
  }

  // Project evidence action
  if (userProjects.length < 2) {
    actions.push({
      actionType: 'BUILD_PROJECT',
      title: 'Build a Practical Industry Project',
      why: 'Projects provide verified evidence of your claimed technical skills, significantly increasing your career alignment score.',
      recommendedSteps: [
        '1. Select a modern tech stack (e.g. PyTorch + React + PostgreSQL)',
        '2. Build an end-to-end microservice or machine learning application',
        '3. Add GitHub link and technology tags to KRICS Projects'
      ],
      priority: 'MEDIUM'
    });
  }

  // Active learning milestone action
  if (activeLearning) {
    actions.push({
      actionType: 'COMPLETE_LEARNING',
      title: `Complete Active Module: "${activeLearning.title}"`,
      why: `You are currently ${activeLearning.progress}% finished with this module. Completing it will verify your ${activeLearning.targetSkill || 'technical'} competency.`,
      recommendedSteps: [
        `1. Finish remaining lessons in ${activeLearning.title}`,
        '2. Update progress percentage to 100%',
        '3. Convert learning milestone into project evidence'
      ],
      priority: 'HIGH'
    });
  }

  return {
    userId,
    targetRole: user ? user.careerGoal : 'Data Scientist',
    primaryNextAction: actions[0] || {
      actionType: 'EXPLORE_CAREER_PATHS',
      title: 'Calibrate Your Career Direction',
      why: 'Explore industry career path blueprints to tailor your learning roadmap.',
      recommendedSteps: ['1. Visit Career Paths page', '2. Select a target role'],
      priority: 'LOW'
    },
    allSuggestedActions: actions
  };
};
