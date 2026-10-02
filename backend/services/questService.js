const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Learning = require('../models/Learning');
const { calculateSkillGap } = require('./skillGapEngine');
const { calculateCareerAlignment } = require('./careerAlignmentService');

exports.getUserQuests = async (userId) => {
  const user = await User.findById(userId) || {};
  const skills = await Skill.find({ user: userId }) || [];
  const projects = await Project.find({ user: userId }) || [];
  const learnings = await Learning.find({ user: userId }) || [];
  const alignment = await calculateCareerAlignment(userId);
  const skillGap = await calculateSkillGap(userId);

  const missingSkills = (skillGap.gapAnalysis || []).filter(g => g.gapPriority === 'HIGH' || g.gapPriority === 'MEDIUM');

  const quests = [
    {
      id: 'q_skill_matrix',
      title: 'Expand Skill Evidence',
      description: missingSkills.length > 0 
        ? `Add or demonstrate evidence for missing critical skill: ${missingSkills[0].skillName}`
        : 'Add 1 new technical skill to your KRICS Skill Matrix',
      category: 'SKILL',
      xp: 150,
      completed: skills.length >= 5,
      progress: Math.min(skills.length, 5),
      total: 5,
      rewardBadge: 'Skill Builder'
    },
    {
      id: 'q_project_evidence',
      title: 'Deploy Engineering Artifact',
      description: 'Link a GitHub repository to a project as verified evidence',
      category: 'PROJECT',
      xp: 300,
      completed: projects.some(p => p.githubUrl || (p.technologies && p.technologies.length >= 2)),
      progress: projects.filter(p => p.githubUrl).length,
      total: 1,
      rewardBadge: 'Artifact Creator'
    },
    {
      id: 'q_career_alignment',
      title: 'Optimize Target Career Alignment',
      description: `Reach 50%+ alignment for target role (${user.careerGoal || 'Data Scientist'})`,
      category: 'ALIGNMENT',
      xp: 500,
      completed: (alignment.alignmentScore || 0) >= 50,
      progress: Math.round(alignment.alignmentScore || 0),
      total: 50,
      rewardBadge: 'Career Strategist'
    },
    {
      id: 'q_learning_milestone',
      title: 'Active Learning Commitment',
      description: 'Enroll in or complete 1 learning roadmap module',
      category: 'LEARNING',
      xp: 200,
      completed: learnings.length > 0,
      progress: learnings.length,
      total: 1,
      rewardBadge: 'Knowledge Hunter'
    }
  ];

  const completedQuestsCount = quests.filter(q => q.completed).length;
  const totalXp = quests.filter(q => q.completed).reduce((sum, q) => sum + q.xp, 0);

  const level = Math.floor(totalXp / 300) + 1;
  const levelTitles = ['Novice Explorer', 'Neural Apprentice', 'Knowledge Architect', 'Career Strategist', 'System Sovereign'];
  const levelTitle = levelTitles[Math.min(level - 1, levelTitles.length - 1)];

  return {
    level,
    levelTitle,
    totalXp,
    xpToNextLevel: 300 - (totalXp % 300),
    streakDays: user.loginStreak || 3,
    quests,
    summary: `${completedQuestsCount}/${quests.length} Quests Completed`
  };
};
