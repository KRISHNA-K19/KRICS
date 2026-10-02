const CareerPath = require('../models/CareerPath');
const User = require('../models/User');
const { recordActivity } = require('../services/activityService');
const { calculateSkillGap } = require('../services/skillGapEngine');

exports.getCareerPaths = async (req, res) => {
  try {
    const paths = await CareerPath.find().sort({ demandLevel: -1 });
    res.status(200).json({ success: true, data: paths, total: paths.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.setCareerGoal = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { careerGoal } = req.body;

    if (!careerGoal) return res.status(400).json({ success: false, message: 'Career goal title is required' });

    const user = await User.findByIdAndUpdate(
      userId,
      { careerGoal },
      { new: true }
    );

    await recordActivity({
      userId,
      type: 'CAREER_GOAL_UPDATED',
      entityType: 'User',
      entityId: userId.toString(),
      metadata: { careerGoal }
    });

    const gapResult = await calculateSkillGap(userId);

    res.status(200).json({
      success: true,
      message: `Target career direction updated to ${careerGoal}`,
      user,
      alignmentScore: gapResult.alignmentScore
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
