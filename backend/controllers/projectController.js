const Project = require('../models/Project');
const User = require('../models/User');
const { recordActivity } = require('../services/activityService');
const { calculateSkillGap } = require('../services/skillGapEngine');

exports.getProjects = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const projects = await Project.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: projects, total: projects.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addProject = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { name, desc, type, techs, role, projectLink, githubLink, status } = req.body;

    const project = new Project({
      user: userId,
      name,
      desc,
      type: type || 'Personal',
      techs: Array.isArray(techs) ? techs : (techs ? techs.split(',').map(t => t.trim()) : []),
      role: role || 'Lead Developer',
      projectLink,
      githubLink,
      status: status || 'Completed'
    });
    await project.save();

    await recordActivity({
      userId,
      type: 'PROJECT_ADDED',
      entityType: 'Project',
      entityId: project._id.toString(),
      metadata: { name, techs: project.techs }
    });

    await calculateSkillGap(userId);

    res.status(201).json({ success: true, message: 'Project evidence node added', data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;
    const { name, desc, type, techs, role, projectLink, githubLink, status } = req.body;

    const formattedTechs = Array.isArray(techs) ? techs : (techs ? techs.split(',').map(t => t.trim()) : []);

    const project = await Project.findOneAndUpdate(
      { _id: id, user: userId },
      { name, desc, type, techs: formattedTechs, role, projectLink, githubLink, status },
      { new: true }
    );

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    await recordActivity({
      userId,
      type: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: project._id.toString(),
      metadata: { name: project.name }
    });

    await calculateSkillGap(userId);

    res.status(200).json({ success: true, message: 'Project updated', data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { id } = req.params;

    const project = await Project.findOneAndDelete({ _id: id, user: userId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    await recordActivity({
      userId,
      type: 'PROJECT_DELETED',
      entityType: 'Project',
      entityId: id,
      metadata: { name: project.name }
    });

    await calculateSkillGap(userId);

    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
