const User = require('../models/User');
const { calculateCareerAlignment } = require('../services/careerAlignmentService');
const { calculateCareerDna } = require('../services/careerDnaService');
const { calculateCareerMomentum } = require('../services/careerMomentumService');
const { generateNextBestAction } = require('../services/nextActionService');
const { simulateProfileImpact } = require('../services/whatIfSimulationService');
const { calculateSkillGap } = require('../services/skillGapEngine');

exports.getIntelligence = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;

    const alignment = await calculateCareerAlignment(userId);
    const dna = await calculateCareerDna(userId);
    const momentum = await calculateCareerMomentum(userId);
    const nextAction = await generateNextBestAction(userId);

    res.status(200).json({
      success: true,
      data: {
        alignment,
        dna,
        momentum,
        nextAction
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCareerAlignment = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const result = await calculateCareerAlignment(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCareerDna = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const result = await calculateCareerDna(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCareerMomentum = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const result = await calculateCareerMomentum(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getNextAction = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const result = await generateNextBestAction(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.runWhatIfSimulation = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { simulatedSkills, simulatedProjects } = req.body;
    const result = await simulateProfileImpact(userId, simulatedSkills || [], simulatedProjects || []);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
