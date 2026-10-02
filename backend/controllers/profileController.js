const User = require('../models/User');
const { logActivity } = require('../services/activityService');

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
