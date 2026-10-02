const ActivityEvent = require('../models/ActivityEvent');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;

    const recentEvents = await ActivityEvent.find({ user: userId }).sort({ createdAt: -1 }).limit(20);
    const skillCount = await Skill.countDocuments({ user: userId });
    const projectCount = await Project.countDocuments({ user: userId });

    res.status(200).json({
      success: true,
      data: {
        recentEvents,
        metrics: {
          skillSynapses: skillCount,
          projectEvidence: projectCount,
          activityVelocity: recentEvents.length
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
