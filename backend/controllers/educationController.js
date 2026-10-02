const Education = require('../models/Education');
const User = require('../models/User');

exports.getEducation = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const items = await Education.find({ user: userId }).sort({ startYear: -1 });
    res.status(200).json({ success: true, data: items, total: items.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addEducation = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { institution, degree, field, startYear, endYear, gpa, description } = req.body;

    const item = new Education({
      user: userId,
      institution,
      degree,
      field,
      startYear,
      endYear,
      gpa,
      description
    });
    await item.save();

    res.status(201).json({ success: true, message: 'Academic education record saved', data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateEducation = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;
    const { institution, degree, field, startYear, endYear, gpa, description } = req.body;

    const item = await Education.findOneAndUpdate(
      { _id: id, user: userId },
      { institution, degree, field, startYear, endYear, gpa, description },
      { new: true }
    );

    if (!item) return res.status(404).json({ success: false, message: 'Education record not found' });

    res.status(200).json({ success: true, message: 'Education record updated', data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteEducation = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;

    const item = await Education.findOneAndDelete({ _id: id, user: userId });
    if (!item) return res.status(404).json({ success: false, message: 'Education record not found' });

    res.status(200).json({ success: true, message: 'Education record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
