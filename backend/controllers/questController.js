const User = require('../models/User');
const { getUserQuests } = require('../services/questService');
const { logActivity } = require('../services/activityService');

async function getOrCreateUserId(req) {
  if (req.user && req.user._id) return req.user._id;
  let user = await User.findOne().sort({ createdAt: -1 });
  if (!user) {
    user = await User.create({
      fullName: 'Krishna Kumar',
      email: 'krishna@krics.ai',
      password: 'hashedpassword',
      careerGoal: 'Data Scientist'
    });
  }
  return user._id;
}

exports.getQuests = async (req, res) => {
  try {
    const userId = await getOrCreateUserId(req);
    const questsData = await getUserQuests(userId);
    res.status(200).json({ success: true, data: questsData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.claimQuestReward = async (req, res) => {
  try {
    const userId = await getOrCreateUserId(req);
    const { questId } = req.body;
    
    await logActivity(userId, 'CLAIM_QUEST', `Claimed reward for quest ${questId}`);
    const questsData = await getUserQuests(userId);

    res.status(200).json({
      success: true,
      message: 'Quest reward claimed successfully!',
      data: questsData
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
