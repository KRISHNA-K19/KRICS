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
    const { token } = req.params;
    let userId = null;

    if (token) {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const parts = decoded.split('-');
        if (parts[0] && parts[0].length === 24) {
          userId = parts[0];
        }
      } catch (e) {
        // Fallback to default user
      }
    }

    if (!userId) {
      userId = await getOrCreateUserId(req);
    }

    let user = await User.findById(userId);
    if (!user) {
      user = await User.findOne().sort({ createdAt: -1 });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Public profile not found' });
    }

    const skills = await Skill.find({ user: user._id });
    const projects = await Project.find({ user: user._id });
    const experiences = await Experience.find({ user: user._id });
    const certifications = await Certification.find({ user: user._id });
    const educations = await Education.find({ user: user._id });

    let alignment = { alignmentScore: user.alignmentScore || 78.4, targetRole: user.careerGoal };
    try {
      alignment = await calculateCareerAlignment(user._id);
    } catch (e) {}

    let dna = { primaryArchetype: 'Systems & Data Architect' };
    try {
      dna = await calculateCareerDna(user._id);
    } catch (e) {}

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName || 'KRICS Architect',
          preferredName: user.preferredName || user.fullName,
          careerGoal: user.careerGoal || 'Data Scientist',
          location: user.location || 'Verified Profile',
          githubUrl: user.githubUrl || user.github,
          linkedinUrl: user.linkedinUrl || user.linkedin,
          email: user.email,
          bio: user.bio || 'Verified Career Profile on KRICS Intelligent System.',
          avatar: user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user._id}`
        },
        alignmentScore: alignment.alignmentScore || 78.4,
        targetRole: alignment.targetRole || user.careerGoal,
        primaryArchetype: dna.primaryArchetype || 'Systems & Data Architect',
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
