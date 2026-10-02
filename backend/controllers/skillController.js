const Skill = require('../models/Skill');
const User = require('../models/User');
const { recordActivity } = require('../services/activityService');
const { calculateSkillGap } = require('../services/skillGapEngine');

const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Learning = require('../models/Learning');

exports.getSkills = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const skills = await Skill.find({ user: userId }).sort({ pct: -1 });

    const projects = await Project.find({ user: userId });
    const experiences = await Experience.find({ user: userId });
    const learningTracks = await Learning.find({ user: userId });

    const enhancedSkills = skills.map(s => {
      const key = s.name.toLowerCase().trim();
      const projLinks = projects.filter(p => (p.techs || p.technologies || []).some(t => t.toLowerCase().trim() === key));
      const expLinks = experiences.filter(e => (e.skills || []).some(sk => sk.toLowerCase().trim() === key) || (e.description || '').toLowerCase().includes(key));
      const learnLinks = learningTracks.filter(l => (l.targetSkill || l.title || '').toLowerCase().includes(key));

      const linkedCount = projLinks.length + expLinks.length + learnLinks.length;
      const isDemonstrated = linkedCount > 0;
      const evidenceLevel = isDemonstrated ? 'DEMONSTRATED' : 'CLAIMED';
      const evidenceBadge = isDemonstrated ? 'Demonstrated Skill (Strong Evidence)' : 'Claimed Skill (Limited Evidence)';
      const evidenceScore = isDemonstrated ? Math.min(95, 70 + linkedCount * 10) : 40;
      const evidenceBar = isDemonstrated 
        ? `████████░░ ${evidenceScore}% Strong` 
        : `████░░░░░░ ${evidenceScore}% Limited`;

      return {
        ...s.toObject(),
        evidenceLevel,
        evidenceBadge,
        evidenceScore,
        evidenceBar,
        linkedCount,
        isDemonstrated,
        backingArtifacts: [
          ...projLinks.map(p => `Project: ${p.title || p.name}`),
          ...expLinks.map(e => `Experience: ${e.role || e.title} @ ${e.company}`)
        ]
      };
    });

    res.status(200).json({ success: true, data: enhancedSkills, total: enhancedSkills.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addSkill = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { name, level, category, pct } = req.body;

    let calculatedPct = pct;
    if (!calculatedPct) {
      if (level === 'BEGINNER') calculatedPct = 35;
      else if (level === 'INTERMEDIATE') calculatedPct = 65;
      else if (level === 'ADVANCED') calculatedPct = 88;
      else if (level === 'EXPERT') calculatedPct = 98;
    }

    const skill = new Skill({
      user: userId,
      name,
      level: level || 'INTERMEDIATE',
      pct: calculatedPct || 70,
      category: category || 'Technical'
    });
    await skill.save();

    await recordActivity({
      userId,
      type: 'SKILL_ADDED',
      entityType: 'Skill',
      entityId: skill._id.toString(),
      metadata: { name, level: skill.level }
    });

    // Recalculate skill gap & alignment score
    await calculateSkillGap(userId);

    res.status(201).json({ success: true, message: 'Skill synapse added to network', data: skill });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSkill = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;
    const { name, level, pct, category } = req.body;

    const skill = await Skill.findOneAndUpdate(
      { _id: id, user: userId },
      { name, level, pct, category },
      { new: true }
    );

    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

    await recordActivity({
      userId,
      type: 'SKILL_UPDATED',
      entityType: 'Skill',
      entityId: skill._id.toString(),
      metadata: { name: skill.name, level: skill.level }
    });

    await calculateSkillGap(userId);

    res.status(200).json({ success: true, message: 'Skill updated', data: skill });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSkill = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;

    const skill = await Skill.findOneAndDelete({ _id: id, user: userId });
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

    await recordActivity({
      userId,
      type: 'SKILL_DELETED',
      entityType: 'Skill',
      entityId: id,
      metadata: { name: skill.name }
    });

    await calculateSkillGap(userId);

    res.status(200).json({ success: true, message: 'Skill deleted from network' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
