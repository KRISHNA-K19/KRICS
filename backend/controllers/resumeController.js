const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Education = require('../models/Education');
const Certification = require('../models/Certification');

exports.getResumeData = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;

    const user = await User.findById(userId);
    const skills = await Skill.find({ user: userId }).sort({ pct: -1 });
    const projects = await Project.find({ user: userId }).sort({ createdAt: -1 });
    const experience = await Experience.find({ user: userId }).sort({ createdAt: -1 });
    const education = await Education.find({ user: userId }).sort({ startYear: -1 });
    const certifications = await Certification.find({ user: userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        profile: user,
        skills,
        projects,
        experience,
        education,
        certifications,
        generatedAt: new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
