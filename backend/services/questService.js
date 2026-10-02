const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Learning = require('../models/Learning');
const ActivityEvent = require('../models/ActivityEvent');
const GitHubRepo = require('../models/GitHubRepo');
const { calculateSkillGap } = require('./skillGapEngine');
const { calculateCareerAlignment } = require('./careerAlignmentService');

const LEVEL_MAP = [
  { level: 1, title: 'Novice Explorer', minXp: 0, unlockText: 'Basic Career Quests' },
  { level: 2, title: 'Skill Builder', minXp: 500, unlockText: 'Advanced Skill Evidence Missions' },
  { level: 3, title: 'Project Creator', minXp: 1000, unlockText: 'Project Intelligence Missions' },
  { level: 4, title: 'Career Builder', minXp: 1500, unlockText: 'Career Alignment Missions' },
  { level: 5, title: 'Career Strategist', minXp: 2500, unlockText: 'What-If Career Simulation' },
  { level: 6, title: 'Career Architect', minXp: 4000, unlockText: 'Advanced Career Network Insights' }
];

function calculateUserLevel(xp = 0) {
  let current = LEVEL_MAP[0];
  for (let i = LEVEL_MAP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_MAP[i].minXp) {
      current = LEVEL_MAP[i];
      break;
    }
  }
  const nextLevel = LEVEL_MAP.find(l => l.level === current.level + 1) || current;
  const xpToNextLevel = Math.max(0, nextLevel.minXp - xp);
  return { current, nextLevel, xpToNextLevel };
}

exports.getUserQuests = async (userId) => {
  let user = await User.findById(userId);
  if (!user) {
    user = await User.findOne().sort({ createdAt: -1 });
  }

  const skills = await Skill.find({ user: userId }) || [];
  const projects = await Project.find({ user: userId }) || [];
  const experiences = await Experience.find({ user: userId }) || [];
  const learnings = await Learning.find({ user: userId }) || [];
  const alignment = await calculateCareerAlignment(userId);
  const skillGap = await calculateSkillGap(userId);

  const targetRole = user.careerGoal || 'Data Scientist';
  const claimedIds = user.claimedMissionIds || [];
  const userXp = user.xp || 1250;

  const { current: levelInfo, nextLevel, xpToNextLevel } = calculateUserLevel(userXp);

  const missingGaps = (skillGap.gapAnalysis || []).filter(g => g.gapPriority === 'HIGH' || g.gapPriority === 'MEDIUM');
  const primaryFocusSkill = missingGaps.length > 0 ? missingGaps[0].skillName : 'Machine Learning';

  // Build Dynamic Missions based on real user profile evidence
  const mlSkill = skills.find(s => s.name.toLowerCase().includes(primaryFocusSkill.toLowerCase()) || s.name.toLowerCase().includes('machine learning'));
  const githubRepoCount = await GitHubRepo.countDocuments({ user: userId, selectedForKrics: true });
  const hasGithubProject = (githubRepoCount > 0) || projects.some(p => p.githubUrl || p.githubLink);
  const activeLearning = learnings.find(l => l.progress > 0) || learnings[0];

  const rawMissions = [
    {
      id: 'm_skill_ml_evidence',
      title: `EXPAND ${primaryFocusSkill.toUpperCase()} EVIDENCE`,
      subtitle: `Strengthen your ${primaryFocusSkill} evidence to align with target ${targetRole} role.`,
      category: 'SKILLS',
      priority: 'RECOMMENDED',
      xp: 150,
      rewardBadge: 'Skill Evidence Master',
      purpose: `${primaryFocusSkill} is a core requirement for your ${targetRole} path, but your current profile needs backing evidence connections.`,
      hukumGuidance: `Your ${primaryFocusSkill} evidence is currently building. Connecting 1 engineering project or learning artifact will complete this mission.`,
      requirements: [
        { id: 'req_skill_exists', label: `Add ${primaryFocusSkill} skill to matrix`, fulfilled: !!mlSkill, targetView: 'skills', actionText: `[ADD ${primaryFocusSkill.toUpperCase()} SKILL]` },
        { id: 'req_skill_level', label: 'Set proficiency level to INTERMEDIATE or higher', fulfilled: (mlSkill && mlSkill.level) ? (mlSkill.level !== 'BEGINNER') : false, targetView: 'skills', actionText: '[UPDATE PROFICIENCY]' },
        { id: 'req_project_link', label: 'Connect an engineering project demonstrating this skill', fulfilled: projects.length >= 1, targetView: 'projects', actionText: '[CREATE PROJECT ARTIFACT]' },
        { id: 'req_learning_link', label: 'Add supporting learning evidence track', fulfilled: learnings.length >= 1, targetView: 'learning', actionText: '[ENROLL LEARNING TRACK]' }
      ],
      careerImpact: {
        evidenceDelta: 'Limited → Stronger',
        graphRelationshipDelta: '+2 Synapse Links',
        expectedAlignmentImpact: '+3.5% Alignment Potential',
        before: { skillStatus: (mlSkill && mlSkill.level) ? mlSkill.level : 'Missing', evidenceCount: 1, alignmentScore: `${alignment.alignmentScore}%` },
        after: { skillStatus: 'ADVANCED', evidenceCount: 3, alignmentScore: `${Math.min((alignment.alignmentScore || 70) + 3.5, 100).toFixed(1)}%` }
      }
    },
    {
      id: 'm_project_github_artifact',
      title: 'DEPLOY GITHUB ENGINEERING ARTIFACT',
      subtitle: 'Link a verified GitHub repository to an engineering project to generate proof-of-work.',
      category: 'PROJECTS',
      priority: 'RECOMMENDED',
      xp: 300,
      rewardBadge: 'Artifact Creator',
      purpose: 'Recruiters and neural alignment engines prioritize verified source code repositories over claimed skills.',
      hukumGuidance: 'Connecting a real GitHub repository adds strong evidence badges to all associated skill synapses.',
      requirements: [
        { id: 'req_proj_exists', label: 'Deploy at least 1 engineering project artifact', fulfilled: projects.length >= 1, targetView: 'projects', actionText: '[CREATE PROJECT]' },
        { id: 'req_proj_techs', label: 'Tag project with 2+ technical technologies', fulfilled: projects.some(p => (p.technologies || p.techs || []).length >= 2), targetView: 'projects', actionText: '[TAG TECHNOLOGIES]' },
        { id: 'req_github_url', label: 'Connect verified GitHub repository link', fulfilled: hasGithubProject, targetView: 'projects', actionText: '[LINK GITHUB REPOSITORY]' }
      ],
      careerImpact: {
        evidenceDelta: 'Claimed → Verified GitHub Evidence',
        graphRelationshipDelta: '+3 Topology Edges',
        expectedAlignmentImpact: '+5.0% Alignment Potential',
        before: { artifactCount: projects.length, githubLinked: hasGithubProject ? 'Yes' : 'No', alignmentScore: `${alignment.alignmentScore}%` },
        after: { artifactCount: Math.max(projects.length, 1), githubLinked: 'Verified GitHub Link', alignmentScore: `${Math.min((alignment.alignmentScore || 70) + 5.0, 100).toFixed(1)}%` }
      }
    },
    {
      id: 'm_career_alignment_50',
      title: 'OPTIMIZE CAREER ALIGNMENT MILESTONE',
      subtitle: `Reach 50%+ overall career alignment for ${targetRole}.`,
      category: 'CAREER',
      priority: 'NEXT',
      xp: 500,
      rewardBadge: 'Career Alignment Champion',
      purpose: 'Crossing the 50% alignment threshold unlocks high-match candidate recommendations.',
      hukumGuidance: 'Your alignment score reflects your connected career graph strength. Keep building verified synapses!',
      requirements: [
        { id: 'req_skills_count', label: 'Maintain 3+ verified skills in matrix', fulfilled: skills.length >= 3, targetView: 'skills', actionText: '[ADD SKILLS]' },
        { id: 'req_projects_count', label: 'Deploy 1+ technical project artifact', fulfilled: projects.length >= 1, targetView: 'projects', actionText: '[DEPLOY PROJECT]' },
        { id: 'req_alignment_threshold', label: 'Achieve 50%+ weighted alignment score', fulfilled: (alignment.alignmentScore || 0) >= 50, targetView: 'roadmap', actionText: '[VIEW ROADMAP]' }
      ],
      careerImpact: {
        evidenceDelta: 'Baseline → High-Alignment Profile',
        graphRelationshipDelta: '+4 Topology Links',
        expectedAlignmentImpact: 'Milestone Threshold Met',
        before: { currentAlignment: `${alignment.alignmentScore}%`, status: 'Developing' },
        after: { targetAlignment: '50.0%+', status: 'Optimized' }
      }
    },
    {
      id: 'm_active_learning_commit',
      title: 'COMPLETE ACTIVE LEARNING MILESTONE',
      subtitle: activeLearning ? `Complete module progress for "${activeLearning.title}".` : 'Enroll in a targeted learning roadmap track.',
      category: 'LEARNING',
      priority: 'OPTIONAL',
      xp: 200,
      rewardBadge: 'Knowledge Hunter',
      purpose: 'Structured learning commitments verify your continuous upskilling velocity.',
      hukumGuidance: 'Completing a course or learning module updates your career momentum rating.',
      requirements: [
        { id: 'req_learning_enroll', label: 'Enroll in a learning roadmap module', fulfilled: learnings.length >= 1, targetView: 'learning', actionText: '[ENROLL MODULE]' },
        { id: 'req_learning_progress', label: 'Achieve 50%+ module completion progress', fulfilled: learnings.some(l => l.progress >= 50), targetView: 'learning', actionText: '[UPDATE PROGRESS]' },
        { id: 'req_learning_complete', label: 'Mark module status as Completed', fulfilled: learnings.some(l => l.status === 'Completed'), targetView: 'learning', actionText: '[MARK COMPLETED]' }
      ],
      careerImpact: {
        evidenceDelta: 'In Progress → Verified Completion',
        graphRelationshipDelta: '+1 Knowledge Node',
        expectedAlignmentImpact: '+2.0% Alignment Potential',
        before: { learningTrackCount: learnings.length, completedCount: learnings.filter(l => l.status === 'Completed').length },
        after: { learningTrackCount: Math.max(learnings.length, 1), completedCount: learnings.filter(l => l.status === 'Completed').length + 1 }
      }
    },
    {
      id: 'm_experience_synapse',
      title: 'CONNECT WORK & INTERNSHIP EXPERIENCE',
      subtitle: 'Add work experience or internship history to strengthen real-world evidence.',
      category: 'EVIDENCE',
      priority: 'OPTIONAL',
      xp: 300,
      rewardBadge: 'Industry Practitioner',
      purpose: 'Real-world experience adds heavy weighting to your career evidence score.',
      hukumGuidance: 'Even internship or academic project experience provides strong backing evidence.',
      requirements: [
        { id: 'req_exp_exists', label: 'Add an experience or internship record', fulfilled: experiences.length >= 1, targetView: 'experience', actionText: '[ADD EXPERIENCE]' },
        { id: 'req_exp_desc', label: 'Detail key technical responsibilities and skills used', fulfilled: experiences.some(e => (e.description || e.desc || '').length > 20), targetView: 'experience', actionText: '[ADD RESPONSIBILITIES]' }
      ],
      careerImpact: {
        evidenceDelta: 'Academic → Verified Industry Practice',
        graphRelationshipDelta: '+3 Experience Edges',
        expectedAlignmentImpact: '+4.0% Alignment Potential',
        before: { experienceCount: experiences.length },
        after: { experienceCount: Math.max(experiences.length, 1) }
      }
    }
  ];

  // Process status for each mission
  const missions = rawMissions.map(m => {
    const isClaimed = claimedIds.includes(m.id);
    const fulfilledCount = m.requirements.filter(r => r.fulfilled).length;
    const totalCount = m.requirements.length;
    const progressPercentage = Math.round((fulfilledCount / totalCount) * 100);

    let status = 'IN_PROGRESS';
    if (isClaimed) {
      status = 'COMPLETED';
    } else if (fulfilledCount === totalCount) {
      status = 'READY';
    }

    return {
      ...m,
      fulfilledCount,
      totalCount,
      progressPercentage,
      progress: progressPercentage,
      completed: isClaimed,
      isClaimable: status === 'READY',
      status,
      isClaimed
    };
  });

  // Level map with unlocked statuses
  const levelMap = LEVEL_MAP.map(l => ({
    ...l,
    isCurrent: l.level === levelInfo.level,
    unlocked: userXp >= l.minXp,
    isUnlocked: userXp >= l.minXp
  }));

  return {
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    xp: userXp,
    xpToNextLevel,
    nextLevelThreshold: nextLevel.minXp,
    levelMap,
    currentMission: missions.find(m => m.status === 'READY') || missions.find(m => m.status === 'IN_PROGRESS') || missions[0],
    missions,
    quests: missions,
    streak: {
      weeks: user.careerActionStreak ? user.careerActionStreak.count : 3,
      label: `${user.careerActionStreak ? user.careerActionStreak.count : 3}-Week Career Action Streak`
    },
    achievements: user.achievements || [
      { id: 'ach_first_node', title: 'First Synapse', description: 'Created initial skill node in KRICS graph.', badge: '🌱' },
      { id: 'ach_level4', title: 'Career Builder', description: 'Reached Level 4 in career progression.', badge: '⚡' }
    ]
  };
};

exports.verifyMissionRequirements = async (userId, missionId) => {
  const questData = await exports.getUserQuests(userId);
  const mission = questData.missions.find(m => m.id === missionId);
  if (!mission) {
    throw new Error('Mission not found');
  }

  const allFulfilled = mission.requirements.every(r => r.fulfilled);

  return {
    missionId,
    title: mission.title,
    verified: allFulfilled,
    requirements: mission.requirements,
    message: allFulfilled
      ? 'All mission requirements verified by KRICS Intelligence Engine.'
      : 'Some requirements are still incomplete. Complete all steps to claim XP.'
  };
};

exports.claimMissionReward = async (userId, missionId) => {
  let user = await User.findById(userId);
  if (!user) {
    user = await User.findOne().sort({ createdAt: -1 });
  }

  const verification = await exports.verifyMissionRequirements(userId, missionId);
  if (!verification.verified) {
    throw new Error('Cannot claim mission: requirements not fulfilled.');
  }

  const claimedIds = user.claimedMissionIds || [];
  if (claimedIds.includes(missionId)) {
    throw new Error('Mission reward already claimed.');
  }

  const questData = await exports.getUserQuests(userId);
  const mission = questData.missions.find(m => m.id === missionId);

  const oldXp = user.xp || 1250;
  const oldLevelInfo = calculateUserLevel(oldXp);

  const earnedXp = mission.xp || 150;
  const newXp = oldXp + earnedXp;

  const newLevelInfo = calculateUserLevel(newXp);
  const isLevelUp = newLevelInfo.current.level > oldLevelInfo.current.level;

  user.xp = newXp;
  user.level = newLevelInfo.current.level;
  user.claimedMissionIds.push(missionId);

  // Append to XP history
  user.xpHistory.unshift({
    title: mission.title,
    xp: earnedXp,
    category: mission.category,
    rationale: `Completed mission: ${mission.subtitle}`,
    createdAt: new Date()
  });

  // Check achievement unlock
  let unlockedAchievement = null;
  if (user.claimedMissionIds.length === 1) {
    unlockedAchievement = {
      id: 'ach_first_mission',
      title: 'FIRST MISSION COMPLETED',
      description: 'Completed your first KRICS career intelligence mission.',
      badge: '🎯',
      unlockedAt: new Date()
    };
    user.achievements.push(unlockedAchievement);
  }

  await user.save();

  // Log activity event
  await ActivityEvent.create({
    user: userId,
    type: 'MISSION_COMPLETED',
    title: `Completed Mission: ${mission.title}`,
    description: `Earned +${earnedXp} XP. Current XP: ${newXp}`,
    category: mission.category
  });

  const hukumReaction = isLevelUp
    ? `Level Up! You reached Level ${newLevelInfo.current.level}: ${newLevelInfo.current.title}. ${newLevelInfo.current.unlockText} unlocked!`
    : `Mission Complete! +${earnedXp} XP added to your profile. Your KRICS graph relationships have been updated.`;

  return {
    success: true,
    missionId,
    title: mission.title,
    earnedXp,
    oldXp,
    newXp,
    oldLevel: oldLevelInfo.current.level,
    newLevel: newLevelInfo.current.level,
    isLevelUp,
    unlockedFeature: isLevelUp ? newLevelInfo.current.unlockText : null,
    unlockedAchievement,
    hukumReaction,
    beforeAfter: mission.careerImpact
  };
};

exports.getXpJourney = async (userId) => {
  let user = await User.findById(userId);
  if (!user) {
    user = await User.findOne().sort({ createdAt: -1 });
  }

  const history = user.xpHistory || [];
  const defaultHistory = [
    { title: 'Skills Matrix Initialization', xp: 450, category: 'SKILLS', rationale: 'Verified initial technical skills in graph.', createdAt: new Date(Date.now() - 86400000 * 5) },
    { title: 'Project Evidence Creation', xp: 300, category: 'PROJECTS', rationale: 'Deployed engineering artifact with GitHub link.', createdAt: new Date(Date.now() - 86400000 * 3) },
    { title: 'Learning Roadmap Track', xp: 200, category: 'LEARNING', rationale: 'Enrolled in active learning module.', createdAt: new Date(Date.now() - 86400000 * 2) },
    { title: 'Career Alignment Milestone', xp: 300, category: 'CAREER', rationale: 'Achieved baseline weighted alignment.', createdAt: new Date(Date.now() - 86400000 * 1) }
  ];

  const fullHistory = history.length > 0 ? history : defaultHistory;
  const totalXp = user.xp || 1250;

  const sources = {
    'Career Quests': Math.round(totalXp * 0.45),
    'Projects': Math.round(totalXp * 0.25),
    'Learning': Math.round(totalXp * 0.15),
    'Alignment Milestones': Math.round(totalXp * 0.15)
  };

  return {
    totalXp,
    sources,
    history: fullHistory
  };
};
