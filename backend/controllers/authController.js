const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const { recordActivity } = require('../services/activityService');

const JWT_SECRET = process.env.JWT_SECRET || 'krics_super_secret_jwt_key_2026';

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
  try {
    const { fullName, email, password, careerGoal } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ success: false, message: 'Error #409: Identity Node Already Exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      fullName,
      email,
      password: hashedPassword,
      careerGoal: careerGoal || 'Data Scientist',
      onboardingCompleted: true
    });
    await user.save();

    // Create default starter skills for instant network initialization
    await Skill.insertMany([
      { user: user._id, name: 'Python', level: 'ADVANCED', pct: 90, category: 'Technical' },
      { user: user._id, name: 'React', level: 'ADVANCED', pct: 88, category: 'Frontend' },
      { user: user._id, name: 'SQL', level: 'INTERMEDIATE', pct: 72, category: 'Database' }
    ]);

    await Project.create({
      user: user._id,
      name: 'MediLink Platform',
      desc: 'Healthcare telemetry and appointment routing microservice.',
      type: 'Personal',
      techs: ['React', 'Node.js', 'SQL'],
      role: 'Lead Architect',
      status: 'Completed'
    });

    await recordActivity({
      userId: user._id,
      type: 'ONBOARDING_COMPLETED',
      entityType: 'User',
      entityId: user._id.toString(),
      metadata: { fullName, email, careerGoal: user.careerGoal }
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'User identity initialized successfully',
      token,
      user
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Error #401: Invalid Hash Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password).catch(() => user.password === password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Error #401: Invalid Hash Credentials' });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: 'Access granted',
      token,
      user
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = req.user || await User.findOne().sort({ createdAt: -1 });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No active profile found' });
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
