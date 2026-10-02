const Learning = require('../models/Learning');
const User = require('../models/User');
const { recordActivity } = require('../services/activityService');
const { calculateSkillGap } = require('../services/skillGapEngine');

exports.getLearning = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const items = await Learning.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: items, total: items.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addLearning = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { title, provider, category, targetSkill, progress, status } = req.body;

    const item = new Learning({
      user: userId,
      title,
      provider: provider || 'Self-Paced / Online',
      category: category || 'Technical Skill',
      targetSkill,
      progress: progress || 0,
      status: status || 'In Progress'
    });
    await item.save();

    await recordActivity({
      userId,
      type: 'LEARNING_STARTED',
      entityType: 'Learning',
      entityId: item._id.toString(),
      metadata: { title, targetSkill }
    });

    await calculateSkillGap(userId);

    res.status(201).json({ success: true, message: 'Learning activity registered', data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateLearning = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;
    const { progress, status } = req.body;

    const item = await Learning.findOneAndUpdate(
      { _id: id, user: userId },
      { progress, status },
      { new: true }
    );

    if (!item) return res.status(404).json({ success: false, message: 'Learning item not found' });

    const eventType = (status === 'Completed' || progress === 100) ? 'LEARNING_COMPLETED' : 'LEARNING_UPDATED';

    await recordActivity({
      userId,
      type: eventType,
      entityType: 'Learning',
      entityId: item._id.toString(),
      metadata: { title: item.title, progress: item.progress, status: item.status }
    });

    await calculateSkillGap(userId);

    res.status(200).json({ success: true, message: 'Learning progress updated', data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteLearning = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;

    const item = await Learning.findOneAndDelete({ _id: id, user: userId });
    if (!item) return res.status(404).json({ success: false, message: 'Learning item not found' });

    res.status(200).json({ success: true, message: 'Learning item removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
