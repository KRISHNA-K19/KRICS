const Experience = require('../models/Experience');
const User = require('../models/User');
const { recordActivity } = require('../services/activityService');
const { calculateSkillGap } = require('../services/skillGapEngine');

exports.getExperiences = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const experiences = await Experience.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: experiences, total: experiences.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addExperience = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { title, company, type, duration, desc, skills } = req.body;

    const exp = new Experience({
      user: userId,
      title,
      company,
      type: type || 'Internship',
      duration,
      desc,
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : [])
    });
    await exp.save();

    await recordActivity({
      userId,
      type: 'EXPERIENCE_ADDED',
      entityType: 'Experience',
      entityId: exp._id.toString(),
      metadata: { title, company }
    });

    await calculateSkillGap(userId);

    res.status(201).json({ success: true, message: 'Experience record added', data: exp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateExperience = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;
    const { title, company, type, duration, desc, skills } = req.body;

    const formattedSkills = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []);

    const exp = await Experience.findOneAndUpdate(
      { _id: id, user: userId },
      { title, company, type, duration, desc, skills: formattedSkills },
      { new: true }
    );

    if (!exp) return res.status(404).json({ success: false, message: 'Experience record not found' });

    await recordActivity({
      userId,
      type: 'EXPERIENCE_UPDATED',
      entityType: 'Experience',
      entityId: exp._id.toString(),
      metadata: { title: exp.title, company: exp.company }
    });

    await calculateSkillGap(userId);

    res.status(200).json({ success: true, message: 'Experience record updated', data: exp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteExperience = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;

    const exp = await Experience.findOneAndDelete({ _id: id, user: userId });
    if (!exp) return res.status(404).json({ success: false, message: 'Experience record not found' });

    await recordActivity({
      userId,
      type: 'EXPERIENCE_DELETED',
      entityType: 'Experience',
      entityId: id,
      metadata: { title: exp.title }
    });

    await calculateSkillGap(userId);

    res.status(200).json({ success: true, message: 'Experience record removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
