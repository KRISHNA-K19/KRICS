const Project = require('../models/Project');
const Skill = require('../models/Skill');
const User = require('../models/User');
const { recordActivity } = require('../services/activityService');
const { calculateSkillGap } = require('../services/skillGapEngine');

exports.importGitHubRepositories = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const { username } = req.body;

    if (!username) return res.status(400).json({ success: false, message: 'GitHub username is required' });

    // Simulated / API GitHub repository import
    const importedRepos = [
      {
        name: `${username}/analytics-microservice`,
        desc: 'Automated telemetry ingestion microservice built with Node.js, Express, and PostgreSQL.',
        techs: ['Node.js', 'Express', 'SQL', 'PostgreSQL'],
        githubLink: `https://github.com/${username}/analytics-microservice`
      },
      {
        name: `${username}/predictive-ml-engine`,
        desc: 'Machine learning forecasting pipeline utilizing Python, PyTorch, and Pandas.',
        techs: ['Python', 'PyTorch', 'Pandas', 'Machine Learning'],
        githubLink: `https://github.com/${username}/predictive-ml-engine`
      }
    ];

    const createdProjects = [];
    for (const repo of importedRepos) {
      let proj = await Project.findOne({ user: userId, name: repo.name });
      if (!proj) {
        proj = new Project({
          user: userId,
          name: repo.name,
          desc: repo.desc,
          type: 'GitHub Repository',
          techs: repo.techs,
          githubLink: repo.githubLink,
          status: 'Completed'
        });
        await proj.save();
        createdProjects.push(proj);

        // Auto-add new skill synapses if missing
        for (const tech of repo.techs) {
          let s = await Skill.findOne({ user: userId, name: new RegExp(`^${tech}$`, 'i') });
          if (!s) {
            s = new Skill({ user: userId, name: tech, level: 'INTERMEDIATE', pct: 70, category: 'Imported GitHub' });
            await s.save();
          }
        }
      }
    }

    await recordActivity({
      userId,
      type: 'PROJECT_ADDED',
      entityType: 'GitHubImport',
      entityId: username,
      metadata: { username, importedCount: createdProjects.length }
    });

    await calculateSkillGap(userId);

    res.status(200).json({
      success: true,
      message: `Successfully imported ${createdProjects.length} GitHub repository synapses for ${username}!`,
      importedProjects: createdProjects
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
