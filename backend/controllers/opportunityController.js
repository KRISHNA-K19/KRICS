const Opportunity = require('../models/Opportunity');
const Skill = require('../models/Skill');
const User = require('../models/User');
const { logActivity } = require('../services/activityService');

exports.getOpportunities = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const userSkills = await Skill.find({ user: userId });
    const userSkillNames = new Set(userSkills.map(s => s.name.toLowerCase().trim()));

    const opportunities = await Opportunity.find().sort({ createdAt: -1 });

    const matchedOpportunities = opportunities.map(opp => {
      const required = opp.requiredSkills || [];
      if (required.length === 0) {
        return { ...opp.toObject(), matchScore: 100, missingSkills: [] };
      }

      let matchedCount = 0;
      const missing = [];
      required.forEach(reqSkill => {
        if (userSkillNames.has(reqSkill.toLowerCase().trim())) {
          matchedCount++;
        } else {
          missing.push(reqSkill);
        }
      });

      const matchScore = parseFloat(((matchedCount / required.length) * 100).toFixed(0));
      return {
        ...opp.toObject(),
        matchScore,
        matchedCount,
        totalRequired: required.length,
        missingSkills: missing
      };
    });

    res.status(200).json({ success: true, data: matchedOpportunities, total: matchedOpportunities.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.applyToOpportunity = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { opportunityId } = req.body;

    const opp = await Opportunity.findById(opportunityId);
    if (!opp) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    await logActivity(userId, 'APPLY_OPPORTUNITY', `Submitted 1-click application for ${opp.title} at ${opp.company}`);

    res.status(200).json({
      success: true,
      message: `1-Click KRICS Application submitted for ${opp.title} at ${opp.company}!`,
      appliedAt: new Date()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
