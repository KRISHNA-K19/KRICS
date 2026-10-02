const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Learning = require('../models/Learning');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');

exports.globalSearch = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(200).json({ success: true, data: { skills: [], projects: [], experience: [], learning: [], opportunities: [] } });
    }

    const regex = new RegExp(q, 'i');

    const skills = await Skill.find({ user: userId, name: regex });
    const projects = await Project.find({ user: userId, $or: [{ name: regex }, { desc: regex }] });
    const experience = await Experience.find({ user: userId, $or: [{ title: regex }, { company: regex }] });
    const learning = await Learning.find({ user: userId, title: regex });
    const opportunities = await Opportunity.find({ $or: [{ title: regex }, { organization: regex }] });

    res.status(200).json({
      success: true,
      data: {
        skills,
        projects,
        experience,
        learning,
        opportunities
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
