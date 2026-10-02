const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Certification = require('../models/Certification');

exports.submitOnboarding = async (req, res) => {
  try {
    const { profile, skills, projects, experience, certifications, careerGoal } = req.body;

    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = new User({ fullName: profile.fullName, email: profile.email, password: 'password123' });
    }

    user.fullName = profile.fullName || user.fullName;
    user.preferredName = profile.preferredName || user.preferredName;
    user.phone = profile.phone;
    user.location = profile.location;
    user.linkedin = profile.linkedin;
    user.github = profile.github;
    user.portfolio = profile.portfolio;
    user.careerGoal = careerGoal || 'Data Scientist';
    user.onboardingCompleted = true;
    await user.save();

    // Save Skills
    if (skills && skills.length > 0) {
      await Skill.deleteMany({ user: user._id });
      const skillDocs = skills.map(s => ({ user: user._id, name: s.name, level: s.level || 'INTERMEDIATE', pct: s.pct || 75 }));
      await Skill.insertMany(skillDocs);
    }

    // Save Projects
    if (projects && projects.length > 0) {
      await Project.deleteMany({ user: user._id });
      const projDocs = projects.map(p => ({ user: user._id, name: p.name, desc: p.desc, techs: p.techs }));
      await Project.insertMany(projDocs);
    }

    // Save Experience
    if (experience && experience.length > 0) {
      await Experience.deleteMany({ user: user._id });
      const expDocs = experience.map(e => ({ user: user._id, org: e.org, role: e.role, duration: e.duration }));
      await Experience.insertMany(expDocs);
    }

    // Save Certifications
    if (certifications && certifications.length > 0) {
      await Certification.deleteMany({ user: user._id });
      const certDocs = certifications.map(c => ({ user: user._id, name: c.name, issuer: c.issuer }));
      await Certification.insertMany(certDocs);
    }

    res.status(200).json({
      success: true,
      message: 'Onboarding telemetry successfully persisted to MongoDB',
      userId: user._id
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
