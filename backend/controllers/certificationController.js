const Certification = require('../models/Certification');
const User = require('../models/User');
const { recordActivity } = require('../services/activityService');

exports.getCertifications = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const certs = await Certification.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: certs, total: certs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addCertification = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { name, issuer, issueDate, credentialId, credentialUrl, skills } = req.body;

    const cert = new Certification({
      user: userId,
      name,
      issuer,
      issueDate,
      credentialId,
      credentialUrl,
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : [])
    });
    await cert.save();

    await recordActivity({
      userId,
      type: 'CERTIFICATION_ADDED',
      entityType: 'Certification',
      entityId: cert._id.toString(),
      metadata: { name, issuer }
    });

    res.status(201).json({ success: true, message: 'Certification credential recorded', data: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCertification = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;
    const { name, issuer, issueDate, credentialId, credentialUrl, skills } = req.body;

    const formattedSkills = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []);

    const cert = await Certification.findOneAndUpdate(
      { _id: id, user: userId },
      { name, issuer, issueDate, credentialId, credentialUrl, skills: formattedSkills },
      { new: true }
    );

    if (!cert) return res.status(404).json({ success: false, message: 'Certification not found' });

    res.status(200).json({ success: true, message: 'Certification updated', data: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCertification = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;

    const cert = await Certification.findOneAndDelete({ _id: id, user: userId });
    if (!cert) return res.status(404).json({ success: false, message: 'Certification not found' });

    res.status(200).json({ success: true, message: 'Certification removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
