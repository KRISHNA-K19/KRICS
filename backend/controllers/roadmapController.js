const User = require('../models/User');
const roadmapEngine = require('../services/roadmapEngine');
const { calculateSkillGap } = require('../services/skillGapEngine');

/**
 * GET /api/roadmap
 * Get personalized career roadmap for the authenticated user
 */
exports.getCareerRoadmap = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const roadmap = await roadmapEngine.generateOrGetRoadmap(userId);
    const gapResult = await calculateSkillGap(userId);

    const skillsYouHave = gapResult.gapAnalysis
      .filter(g => g.currentScore >= 55 || g.hasProjectEvidence)
      .map(g => ({
        name: g.skillName,
        level: g.currentLevel,
        score: g.currentScore,
        evidence: g.hasProjectEvidence ? 'Demonstrated' : 'Claimed'
      }));

    const skillsToDevelop = gapResult.gapAnalysis
      .filter(g => g.currentScore < g.targetScore)
      .map(g => ({
        name: g.skillName,
        requiredLevel: g.requiredLevel,
        priority: g.gapPriority
      }));

    const nextAction = await roadmapEngine.getNextAction(userId);

    res.status(200).json({
      success: true,
      data: {
        targetRole: roadmap.careerGoal,
        alignmentScore: roadmap.alignmentScore,
        overallProgress: roadmap.overallProgress,
        lastRecalculatedAt: roadmap.lastRecalculatedAt,
        phases: roadmap.phases,
        skillsYouHave,
        skillsToDevelop,
        nextAction
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/roadmap/generate
 * Generate or switch career roadmap to a new target career goal
 */
exports.generateCareerRoadmap = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { careerGoal } = req.body;

    if (!careerGoal) {
      return res.status(400).json({ success: false, message: 'Career goal is required.' });
    }

    const roadmap = await roadmapEngine.generateOrGetRoadmap(userId, true, careerGoal);
    const gapResult = await calculateSkillGap(userId);
    const nextAction = await roadmapEngine.getNextAction(userId);

    res.status(200).json({
      success: true,
      message: `Personalized roadmap generated for ${careerGoal}`,
      data: {
        targetRole: roadmap.careerGoal,
        alignmentScore: roadmap.alignmentScore,
        overallProgress: roadmap.overallProgress,
        phases: roadmap.phases,
        gapAnalysis: gapResult.gapAnalysis,
        nextAction
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/roadmap/recalculate
 * Recalculate active roadmap against updated profile data
 */
exports.recalculateCareerRoadmap = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const roadmap = await roadmapEngine.generateOrGetRoadmap(userId, true);
    const nextAction = await roadmapEngine.getNextAction(userId);

    res.status(200).json({
      success: true,
      message: 'Roadmap recalculated with latest profile evidence.',
      data: {
        targetRole: roadmap.careerGoal,
        alignmentScore: roadmap.alignmentScore,
        overallProgress: roadmap.overallProgress,
        phases: roadmap.phases,
        nextAction
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/roadmap/tasks/:taskId/complete
 * Mark a task complete in the roadmap
 */
exports.completeRoadmapTask = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { taskId } = req.params;

    const roadmap = await roadmapEngine.completeRoadmapTask(userId, taskId);
    const nextAction = await roadmapEngine.getNextAction(userId);

    res.status(200).json({
      success: true,
      message: 'Roadmap task marked complete!',
      data: {
        targetRole: roadmap.careerGoal,
        alignmentScore: roadmap.alignmentScore,
        overallProgress: roadmap.overallProgress,
        phases: roadmap.phases,
        nextAction
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/roadmap/next-action
 * Retrieve top next action card for dashboard/roadmap header
 */
exports.getNextActionCard = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const nextAction = await roadmapEngine.getNextAction(userId);

    res.status(200).json({
      success: true,
      data: nextAction
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
