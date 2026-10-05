const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Certification = require('../models/Certification');
const Education = require('../models/Education');
const { calculateCareerAlignment } = require('../services/careerAlignmentService');
const { calculateCareerDna } = require('../services/careerDnaService');

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

exports.generateShareLink = async (req, res) => {
  try {
    const userId = await getOrCreateUserId(req);
    const shareToken = Buffer.from(`${userId}-${Date.now()}`).toString('base64').substring(0, 16);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:8000';
    const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : `${protocol}://${host}`;

    const shareUrl = `${baseUrl}/?share=${shareToken}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

    res.status(200).json({
      success: true,
      shareToken,
      shareUrl,
      qrCodeUrl
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const userId = await getOrCreateUserId(req);
    const user = await User.findById(userId);

    const skills = await Skill.find({ user: userId });
    const projects = await Project.find({ user: userId });
    const experiences = await Experience.find({ user: userId });
    const certifications = await Certification.find({ user: userId });
    const educations = await Education.find({ user: userId });
    const alignment = await calculateCareerAlignment(userId);
    const dna = await calculateCareerDna(userId);

    res.status(200).json({
      success: true,
      data: {
        user: {
          fullName: user.fullName,
          preferredName: user.preferredName,
          careerGoal: user.careerGoal,
          location: user.location,
          githubUrl: user.githubUrl,
          linkedinUrl: user.linkedinUrl,
          bio: user.bio
        },
        alignmentScore: alignment.alignmentScore,
        targetRole: alignment.targetRole,
        primaryArchetype: dna.primaryArchetype,
        skillsCount: skills.length,
        projectsCount: projects.length,
        experiencesCount: experiences.length,
        certificationsCount: certifications.length,
        skills,
        projects,
        experiences,
        certifications,
        educations
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
