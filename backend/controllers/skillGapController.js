const User = require('../models/User');
const { calculateSkillGap } = require('../services/skillGapEngine');

exports.getSkillGap = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const result = await calculateSkillGap(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
