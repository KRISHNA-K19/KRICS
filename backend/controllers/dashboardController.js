const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Certification = require('../models/Certification');
const Learning = require('../models/Learning');
const { calculateSkillGap } = require('../services/skillGapEngine');
const { calculateCareerAlignment } = require('../services/careerAlignmentService');
const { calculateCareerDna } = require('../services/careerDnaService');
const { calculateCareerMomentum } = require('../services/careerMomentumService');
const { generateNextBestAction } = require('../services/nextActionService');

exports.getDashboardData = async (req, res) => {
  try {
    let user = req.user || await User.findOne().sort({ createdAt: -1 });

    if (!user) {
      user = new User({
        fullName: 'Krishna Kumar',
        email: 'krishna@krics.io',
        password: 'password123',
        careerGoal: 'Data Scientist',
        alignmentScore: 78.4,
        onboardingCompleted: true
      });
      await user.save();
    }

    const userId = user._id;

    const skills = await Skill.find({ user: userId });
    const projects = await Project.find({ user: userId });
    const experiences = await Experience.find({ user: userId });
    const certifications = await Certification.find({ user: userId });
    const learning = await Learning.find({ user: userId });

    const gapResult = await calculateSkillGap(userId);
    const alignment = await calculateCareerAlignment(userId);
    const dna = await calculateCareerDna(userId);
    const momentum = await calculateCareerMomentum(userId);
    const nextAction = await generateNextBestAction(userId);

    const highGaps = gapResult.gapAnalysis.filter(g => g.gapPriority === 'HIGH').map(g => g.skillName);
    const strongSkills = gapResult.gapAnalysis.filter(g => g.currentScore >= 70 || g.hasProjectEvidence).map(g => g.skillName);

    const aiCoachAdvice = {
      focusArea: highGaps.length > 0 ? `Close ${highGaps[0]} Skill Gap` : 'Build Practical Project Evidence',
      coachingAdvice: highGaps.length > 0
        ? `Your current profile shows ${alignment.alignmentScore}% alignment with ${user.careerGoal || 'Data Scientist'}. Your top priority is mastering ${highGaps[0]}. We recommend building 1 engineering artifact demonstrating ${highGaps[0]} to raise your evidence score.`
        : `Excellent progress! Your profile is ${alignment.alignmentScore}% aligned with ${user.careerGoal || 'Data Scientist'}. Demonstrated strengths: ${strongSkills.join(', ') || 'Core Programming'}. Focus on expanding project artifacts.`
    };

    // Profile completeness calculation
    let completenessScore = 30; // base account created
    if (user.fullName && user.email) completenessScore += 10;
    if (skills.length > 0) completenessScore += 15;
    if (projects.length > 0) completenessScore += 15;
    if (experiences.length > 0) completenessScore += 10;
    if (certifications.length > 0) completenessScore += 10;
    if (learning.length > 0) completenessScore += 10;

    const dashboardPayload = {
      user,
      metrics: {
        skillsCount: skills.length,
        projectsCount: projects.length,
        experienceCount: experiences.length,
        certificationsCount: certifications.length,
        learningCount: learning.length,
        alignmentScore: alignment.alignmentScore || gapResult.alignmentScore,
        completenessScore
      },
      skills,
      projects,
      gapResult,
      alignment,
      dna,
      momentum,
      nextAction,
      aiCoachAdvice
    };

    res.status(200).json({
      success: true,
      data: dashboardPayload,
      ...dashboardPayload
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
