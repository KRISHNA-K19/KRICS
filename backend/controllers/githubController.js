const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Learning = require('../models/Learning');
const Experience = require('../models/Experience');
const {
  fetchGitHubReposFromApi,
  generateMockReposForUser,
  analyzeRepoStack,
  calculateSkillEvidenceStrength,
  generateGitHubCareerInsight
} = require('../services/githubEvidenceEngine');
const { calculateCareerAlignment } = require('../services/careerAlignmentService');
const { calculateSkillGap } = require('../services/skillGapEngine');
const { logActivity } = require('../services/activityService');

async function getUserId(req) {
  if (req.user && req.user._id) return req.user._id;
  let user = await User.findOne().sort({ createdAt: -1 });
  if (!user) {
    user = await User.create({
      fullName: 'Krishna Kumar',
      email: 'krishna@krics.ai',
      password: 'hashedpassword',
      careerGoal: 'Data Scientist'
    });
  }
  return user._id;
}

exports.getGitHubStatus = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const user = await User.findById(userId);
    const skills = await Skill.find({ user: userId }) || [];
    const projects = await Project.find({ user: userId }) || [];
    const learnings = await Learning.find({ user: userId }) || [];
    const experiences = await Experience.find({ user: userId }) || [];

    const gh = user.githubProfile || {};
    const username = gh.username || user.github || 'KRISHNA-K19';
    const isConnected = gh.connected !== undefined ? gh.connected : true;

    // Fetch and analyze user repos
    let rawRepos = await fetchGitHubReposFromApi(username);
    if (!rawRepos || rawRepos.length === 0) {
      rawRepos = generateMockReposForUser(username);
    }

    const analyzedRepos = rawRepos.map(analyzeRepoStack);

    // Selected repos selection (default to top 4 if empty)
    let selectedRepos = gh.selectedRepos && gh.selectedRepos.length > 0
      ? gh.selectedRepos
      : analyzedRepos.slice(0, 4).map(r => r.name);

    const selectedAnalyzed = analyzedRepos.filter(r => selectedRepos.includes(r.name));

    // Potential project recommendations (repos not yet added to KRICS Projects)
    const existingProjectRepos = projects.map(p => (p.githubLink || '').toLowerCase());
    const potentialProjects = analyzedRepos.filter(r => 
      !existingProjectRepos.some(link => link.includes(r.name.toLowerCase()))
    ).map(r => ({
      repoName: r.name,
      title: r.name.replace(/[-_]/g, ' '),
      description: r.description,
      detectedTechs: r.detectedTechs,
      githubUrl: r.url,
      language: r.language,
      stars: r.stars
    }));

    // Calculate Skill Evidence Strength Matrix
    const skillEvidenceMatrix = skills.map(s => {
      const evalResult = calculateSkillEvidenceStrength(
        s.name,
        projects,
        learnings,
        experiences,
        selectedAnalyzed
      );
      return {
        _id: s._id,
        name: s.name,
        level: s.level || 'INTERMEDIATE',
        pct: s.pct || 70,
        category: s.category || 'Technical',
        evidence: evalResult
      };
    });

    const aiInsight = generateGitHubCareerInsight(
      user.careerGoal || 'Data Scientist',
      skills,
      selectedAnalyzed
    );

    const githubData = {
      connected: isConnected,
      username,
      avatarUrl: gh.avatarUrl || `https://github.com/${username}.png`,
      lastSyncedAt: gh.lastSyncedAt || new Date(Date.now() - 3600000 * 2),
      publicReposCount: analyzedRepos.length,
      selectedReposCount: selectedRepos.length,
      selectedRepos,
      analyzedRepos,
      potentialProjects,
      skillEvidenceMatrix,
      aiInsight,
      timeline: gh.timeline && gh.timeline.length > 0 ? gh.timeline : [
        { date: new Date(Date.now() - 86400000 * 2), title: 'Connected GitHub Identity', repoName: '@' + username, action: 'CONNECTED' },
        { date: new Date(Date.now() - 86400000 * 1), title: 'Analyzed ML-Prediction-System Evidence', repoName: 'ML-Prediction-System', action: 'EVIDENCE_DETECTED' }
      ]
    };

    res.status(200).json({ success: true, data: githubData });
  } catch (err) {
    console.error('Error fetching GitHub status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.connectGitHub = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'GitHub username is required' });

    let rawRepos = await fetchGitHubReposFromApi(username);
    if (!rawRepos || rawRepos.length === 0) {
      rawRepos = generateMockReposForUser(username);
    }

    const analyzedRepos = rawRepos.map(analyzeRepoStack);
    const defaultSelected = analyzedRepos.slice(0, 4).map(r => r.name);

    const user = await User.findById(userId);
    user.github = username;
    user.githubProfile = {
      connected: true,
      username,
      avatarUrl: `https://github.com/${username}.png`,
      publicReposCount: analyzedRepos.length,
      selectedRepos: defaultSelected,
      detectedLanguages: Array.from(new Set(analyzedRepos.map(r => r.language))),
      detectedTechnologies: Array.from(new Set(analyzedRepos.flatMap(r => r.detectedTechs))),
      lastSyncedAt: new Date(),
      timeline: [
        { date: new Date(), title: `Connected GitHub account @${username}`, repoName: username, action: 'CONNECTED' }
      ],
      evidenceStats: {
        totalReposAnalyzed: analyzedRepos.length,
        confirmedProjectsCount: 4,
        skillEvidenceCount: analyzedRepos.flatMap(r => r.detectedTechs).length,
        evidenceLevel: 'GITHUB EVIDENCE'
      }
    };
    await user.save();

    await logActivity(userId, 'CONNECT_GITHUB', `Connected GitHub account @${username}`);

    res.status(200).json({
      success: true,
      message: `Successfully connected GitHub identity @${username}!`,
      data: {
        username,
        analyzedReposCount: analyzedRepos.length,
        selectedRepos: defaultSelected
      }
    });
  } catch (err) {
    console.error('Error connecting GitHub:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.syncGitHubRepositories = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { selectedRepos } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const username = user.githubProfile.username || user.github || 'KRISHNA-K19';

    let rawRepos = await fetchGitHubReposFromApi(username);
    if (!rawRepos || rawRepos.length === 0) {
      rawRepos = generateMockReposForUser(username);
    }
    const analyzedRepos = rawRepos.map(analyzeRepoStack);

    if (Array.isArray(selectedRepos)) {
      user.githubProfile.selectedRepos = selectedRepos;
    }
    user.githubProfile.connected = true;
    user.githubProfile.lastSyncedAt = new Date();

    if (!user.githubProfile.timeline) user.githubProfile.timeline = [];
    user.githubProfile.timeline.unshift({
      date: new Date(),
      title: `Synchronized ${selectedRepos ? selectedRepos.length : analyzedRepos.length} repository evidence links`,
      repoName: 'Sync Event',
      action: 'SYNCED'
    });

    await user.save();

    // Trigger alignment recalculation
    await calculateCareerAlignment(userId);
    await calculateSkillGap(userId);
    await logActivity(userId, 'SYNC_GITHUB', `Synchronized GitHub repository evidence for @${username}`);

    res.status(200).json({
      success: true,
      message: 'GitHub career evidence synchronized successfully!',
      lastSyncedAt: user.githubProfile.lastSyncedAt
    });
  } catch (err) {
    console.error('Error syncing GitHub repositories:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.confirmPotentialProject = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { repoName, action } = req.body; // action: 'ADD', 'REVIEW', 'IGNORE'

    if (!repoName) return res.status(400).json({ success: false, message: 'Repository name is required' });

    const user = await User.findById(userId);
    const username = (user.githubProfile && user.githubProfile.username) || user.github || 'KRISHNA-K19';

    let rawRepos = await fetchGitHubReposFromApi(username);
    if (!rawRepos || rawRepos.length === 0) {
      rawRepos = generateMockReposForUser(username);
    }
    const analyzed = rawRepos.map(analyzeRepoStack).find(r => r.name.toLowerCase() === repoName.toLowerCase());

    if (!analyzed) return res.status(404).json({ success: false, message: 'Repository stack not found' });

    if (action === 'ADD' || action === 'REVIEW') {
      let existingProj = await Project.findOne({ user: userId, name: analyzed.name });
      if (!existingProj) {
        existingProj = new Project({
          user: userId,
          name: analyzed.name.replace(/[-_]/g, ' '),
          desc: analyzed.description,
          type: 'GitHub Repository',
          techs: analyzed.detectedTechs,
          githubLink: analyzed.url,
          status: 'Completed'
        });
        await existingProj.save();
      }

      // Auto-add skills missing from Skills Matrix with GITHUB EVIDENCE category
      for (const tech of analyzed.detectedTechs) {
        let existingSkill = await Skill.findOne({ user: userId, name: new RegExp(`^${tech}$`, 'i') });
        if (!existingSkill) {
          existingSkill = new Skill({
            user: userId,
            name: tech,
            level: 'INTERMEDIATE',
            pct: 75,
            category: 'GitHub Evidence'
          });
          await existingSkill.save();
        }
      }

      await logActivity(userId, 'CONFIRM_PROJECT', `Confirmed GitHub repository project: ${analyzed.name}`);
      await calculateCareerAlignment(userId);

      return res.status(200).json({
        success: true,
        message: `Project "${analyzed.name}" confirmed and added to your KRICS Project Artifacts!`,
        project: existingProj
      });
    }

    res.status(200).json({ success: true, message: `Repository "${repoName}" ignored from suggestions.` });
  } catch (err) {
    console.error('Error confirming potential project:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.disconnectGitHub = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const user = await User.findById(userId);
    if (user.githubProfile) {
      user.githubProfile.connected = false;
      await user.save();
    }
    await logActivity(userId, 'DISCONNECT_GITHUB', 'Disconnected GitHub integration');

    res.status(200).json({ success: true, message: 'GitHub integration disconnected.' });
  } catch (err) {
    console.error('Error disconnecting GitHub:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
