const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Certification = require('../models/Certification');
const Education = require('../models/Education');
const Learning = require('../models/Learning');
const GitHubRepo = require('../models/GitHubRepo');
const { calculateCareerAlignment } = require('../services/careerAlignmentService');
const { calculateCareerDna } = require('../services/careerDnaService');
const { getUserQuests } = require('../services/questService');
const { logActivity } = require('../services/activityService');

function generateKricsId() {
  const hex = Math.floor(Math.random() * 0xFFFFF).toString(16).toUpperCase().padStart(5, '0');
  return `KR-26-${hex}`;
}

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const user = await User.findById(userId);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { fullName, preferredName, phone, location, photoUrl, bio, linkedin, github, portfolio, careerGoal } = req.body;

    const updateFields = {};
    if (fullName !== undefined) updateFields.fullName = fullName;
    if (preferredName !== undefined) updateFields.preferredName = preferredName;
    if (phone !== undefined) updateFields.phone = phone;
    if (location !== undefined) updateFields.location = location;
    if (photoUrl !== undefined) updateFields.photoUrl = photoUrl;
    if (bio !== undefined) updateFields.bio = bio;
    if (linkedin !== undefined) updateFields.linkedin = linkedin;
    if (github !== undefined) updateFields.github = github;
    if (portfolio !== undefined) updateFields.portfolio = portfolio;
    if (careerGoal !== undefined) updateFields.careerGoal = careerGoal;

    const user = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    );

    await logActivity(userId, 'PROFILE_UPDATED', `Updated profile credentials for ${user.fullName}`);

    res.status(200).json({ success: true, message: 'Profile updated successfully!', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getIdentityCard = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    let user = await User.findById(userId);
    if (!user) {
      user = await User.findOne().sort({ createdAt: -1 });
    }

    if (!user.kricsId) {
      let kricsId = generateKricsId();
      while (await User.findOne({ kricsId })) {
        kricsId = generateKricsId();
      }
      user.kricsId = kricsId;
      await user.save();
    }

    const skills = await Skill.find({ user: user._id }) || [];
    const projects = await Project.find({ user: user._id }) || [];
    const experiences = await Experience.find({ user: user._id }) || [];
    const certifications = await Certification.find({ user: user._id }) || [];
    const educations = await Education.find({ user: user._id }) || [];
    const learning = await Learning.find({ user: user._id }) || [];
    const githubRepos = await GitHubRepo.find({ user: user._id, selectedForKrics: true }) || [];

    let alignment = { alignmentScore: user.alignmentScore || 78.4, targetRole: user.careerGoal };
    try {
      alignment = await calculateCareerAlignment(user._id);
    } catch (e) {}

    let dna = { primaryArchetype: 'Systems & Data Architect' };
    try {
      dna = await calculateCareerDna(user._id);
    } catch (e) {}

    let quests = { level: user.level || 4, levelTitle: 'Career Builder' };
    try {
      quests = await getUserQuests(user._id);
    } catch (e) {}

    // Rank skills by relevance, level, and evidence
    const projectTechs = new Set();
    projects.forEach(p => (p.techs || p.technologies || []).forEach(t => projectTechs.add(t.toLowerCase().trim())));

    const rankedSkills = skills.map(s => {
      const key = s.name.toLowerCase().trim();
      let score = (s.level === 'EXPERT' ? 100 : s.level === 'ADVANCED' ? 85 : s.level === 'INTERMEDIATE' ? 55 : 25);
      const hasEvidence = projectTechs.has(key);
      if (hasEvidence) score += 15;
      return {
        id: s._id,
        name: s.name,
        level: s.level,
        pct: s.pct,
        score,
        hasEvidence
      };
    }).sort((a, b) => b.score - a.score);

    const topSkills = rankedSkills.slice(0, 5);
    const remainingSkillsCount = Math.max(0, rankedSkills.length - 5);

    const primaryEdu = educations[0] 
      ? `${educations[0].degree || 'Degree'} @ ${educations[0].institution || 'University'}` 
      : (user.bio || 'Computer Science & Engineering');

    let completenessScore = 35;
    if (user.photoUrl) completenessScore += 15;
    if (skills.length > 0) completenessScore += 15;
    if (projects.length > 0) completenessScore += 15;
    if (experiences.length > 0) completenessScore += 10;
    if (user.githubProfile && user.githubProfile.connected) completenessScore += 10;
    completenessScore = Math.min(completenessScore, 100);

    const isGithubConnected = (user.githubProfile && user.githubProfile.connected) || (githubRepos.length > 0) || !!(user.github);

    res.status(200).json({
      success: true,
      data: {
        identity: {
          kricsId: user.kricsId,
          name: user.fullName || 'KRICS Architect',
          preferredName: user.preferredName || user.fullName,
          role: user.careerGoal ? `${user.careerGoal} Aspirant` : 'Engineering Student',
          education: primaryEdu,
          profilePhoto: user.photoUrl || null,
          level: quests.level || user.level || 4,
          levelTitle: quests.levelTitle || 'Career Builder',
          xp: user.xp || 1250,
          isVerified: !!user.isVerified,
          profileCompleteness: completenessScore
        },
        skills: topSkills,
        totalSkillsCount: skills.length,
        remainingSkillsCount,
        career: {
          targetRole: user.careerGoal || 'Data Scientist',
          alignmentScore: alignment.alignmentScore || 78.4,
          primaryArchetype: dna.primaryArchetype || 'Systems & Data Architect'
        },
        stats: {
          projectsCount: projects.length,
          experiencesCount: experiences.length,
          certificationsCount: certifications.length,
          educationsCount: educations.length,
          learningCount: learning.length,
          githubConnected: isGithubConnected
        },
        links: {
          github: user.github || (user.githubProfile ? user.githubProfile.username : null),
          linkedin: user.linkedin,
          portfolio: user.portfolio,
          email: user.email
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
