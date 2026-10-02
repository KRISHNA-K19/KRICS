const User = require('../models/User');
const {
  getUserQuests,
  verifyMissionRequirements,
  claimMissionReward,
  getXpJourney
} = require('../services/questService');
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
    console.error('Error fetching quests:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyMission = async (req, res) => {
  try {
    const userId = await getOrCreateUserId(req);
    const { missionId } = req.body;
    const verification = await verifyMissionRequirements(userId, missionId);
    res.status(200).json({ success: true, data: verification });
  } catch (err) {
    console.error('Error verifying mission:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.claimMission = async (req, res) => {
  try {
    const userId = await getOrCreateUserId(req);
    const { missionId } = req.body;
    const claimResult = await claimMissionReward(userId, missionId);
    
    await logActivity(userId, 'CLAIM_MISSION', `Claimed mission reward for ${missionId}`);

    res.status(200).json({
      success: true,
      message: 'Mission reward claimed successfully!',
      data: claimResult
    });
  } catch (err) {
    console.error('Error claiming mission:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getXpJourney = async (req, res) => {
  try {
    const userId = await getOrCreateUserId(req);
    const xpJourney = await getXpJourney(userId);
    res.status(200).json({ success: true, data: xpJourney });
  } catch (err) {
    console.error('Error fetching XP journey:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
