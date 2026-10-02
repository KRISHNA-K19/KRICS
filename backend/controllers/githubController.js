const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const GitHubRepo = require('../models/GitHubRepo');
const GitHubEvidence = require('../models/GitHubEvidence');
const {
  syncUserGitHubData,
  calculateSkillEvidenceMatrix,
  generateHukumGitHubInsight
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

// 1. GET GitHub Status & Dashboard Data
exports.getGitHubStatus = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const gh = user.githubProfile || {};
    const username = gh.username || user.github || '';
    const isConnected = !!gh.connected;

    // Fetch real persisted repositories from DB
    const allRepos = await GitHubRepo.find({ user: userId }).sort({ githubPushedAt: -1, updatedAt: -1 });
    const selectedReposDocs = allRepos.filter(r => r.selectedForKrics);
    const selectedReposNames = selectedReposDocs.map(r => r.name);

    // Calculate project link recommendations
    const existingProjects = await Project.find({ user: userId }) || [];
    const potentialProjects = allRepos
      .filter(r => !r.linkedProjectId)
      .map(r => ({
        repoId: r._id,
        repoName: r.name,
        title: r.name.replace(/[-_]/g, ' '),
        description: r.description || 'GitHub Repository',
        detectedTechs: r.detectedTechs || [],
        githubUrl: r.htmlUrl,
        language: r.language || 'Code',
        stars: r.stars || 0
      }));

    // Real skill evidence matrix
    const skillEvidenceMatrix = await calculateSkillEvidenceMatrix(userId);

    // Dynamic HUKUM insight
    const aiInsight = await generateHukumGitHubInsight(userId, user.careerGoal || 'Data Scientist');

    // Real Database Metrics
    const publicReposCount = await GitHubRepo.countDocuments({ user: userId, isPrivate: false });
    const selectedReposCount = selectedReposDocs.length;

    const uniqueLangs = new Set();
    selectedReposDocs.forEach(r => {
      if (r.language && r.language !== 'Code') uniqueLangs.add(r.language);
      (r.languages || []).forEach(l => { if (l.language) uniqueLangs.add(l.language); });
    });

    const projectEvidenceLinksCount = await GitHubRepo.countDocuments({ user: userId, linkedProjectId: { $ne: null } });
    const skillEvidenceLinksCount = await GitHubEvidence.countDocuments({ user: userId, skillId: { $ne: null } });

    const githubData = {
      connected: isConnected,
      username,
      avatarUrl: gh.avatarUrl || (username ? `https://github.com/${username}.png` : ''),
      lastSyncedAt: gh.lastSyncedAt || null,
      publicReposCount,
      selectedReposCount,
      languagesDetectedCount: uniqueLangs.size,
      detectedLanguages: Array.from(uniqueLangs),
      projectEvidenceLinksCount,
      skillEvidenceLinksCount,
      selectedRepos: selectedReposNames,
      analyzedRepos: allRepos.map(r => ({
        _id: r._id,
        githubRepoId: r.githubRepoId,
        name: r.name,
        description: r.description,
        url: r.htmlUrl,
        language: r.language,
        languages: r.languages,
        stars: r.stars,
        forks: r.forks,
        updatedAt: r.githubUpdatedAt || r.updatedAt,
        detectedTechs: r.detectedTechs,
        selectedForKrics: r.selectedForKrics,
        readmeAvailable: r.readmeAvailable,
        commitCount: r.commitCount,
        linkedProjectId: r.linkedProjectId,
        linkedExperienceId: r.linkedExperienceId
      })),
      potentialProjects,
      skillEvidenceMatrix,
      aiInsight,
      timeline: gh.timeline || []
    };

    res.status(200).json({ success: true, data: githubData });
  } catch (err) {
    console.error('Error fetching GitHub status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. CONNECT GitHub Account (Real Authentication & Sync Pipeline)
exports.connectGitHub = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Valid GitHub username or handle is required' });
    }

    const cleanUsername = username.trim().replace(/^@/, '');

    // Trigger Real Synchronization Pipeline
    const syncResult = await syncUserGitHubData(userId, cleanUsername);

    await calculateCareerAlignment(userId);
    await calculateSkillGap(userId);
    await logActivity(userId, 'CONNECT_GITHUB', `Connected authenticated GitHub account @${cleanUsername}`);

    res.status(200).json({
      success: true,
      message: `Successfully connected GitHub identity @${cleanUsername}! ${syncResult.metrics.publicReposCount} repositories synchronized.`,
      data: syncResult
    });
  } catch (err) {
    console.error('Error connecting GitHub:', err);
    res.status(500).json({ success: false, message: `GitHub connection failed: ${err.message}` });
  }
};

// 3. SYNC GitHub Repositories
exports.syncGitHubRepositories = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { selectedRepos } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const username = user.githubProfile?.username || user.github;
    if (!username) {
      return res.status(400).json({ success: false, message: 'No connected GitHub account found. Please connect GitHub first.' });
    }

    // Trigger Real Data Sync
    const syncResult = await syncUserGitHubData(userId, username, null, selectedRepos);

    await calculateCareerAlignment(userId);
    await calculateSkillGap(userId);
    await logActivity(userId, 'SYNC_GITHUB', `Synchronized GitHub repository evidence for @${username}`);

    res.status(200).json({
      success: true,
      message: 'GitHub career evidence synchronized successfully!',
      data: syncResult
    });
  } catch (err) {
    console.error('Error syncing GitHub repositories:', err);
    res.status(500).json({ success: false, message: `Synchronization failed: ${err.message}` });
  }
};

// 4. CONFIRM Potential Project Link
exports.confirmPotentialProject = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { repoName, action } = req.body;

    if (!repoName) return res.status(400).json({ success: false, message: 'Repository name is required' });

    const repoDoc = await GitHubRepo.findOne({ user: userId, name: new RegExp(`^${repoName}$`, 'i') });
    if (!repoDoc) {
      return res.status(404).json({ success: false, message: `Repository "${repoName}" not found in synchronized records.` });
    }

    if (action === 'ADD' || action === 'REVIEW') {
      let existingProj = await Project.findOne({ user: userId, name: repoDoc.name });
      if (!existingProj) {
        existingProj = new Project({
          user: userId,
          name: repoDoc.name.replace(/[-_]/g, ' '),
          desc: repoDoc.description || 'Verified GitHub Repository Artifact',
          type: 'GitHub Repository',
          techs: repoDoc.detectedTechs,
          githubLink: repoDoc.htmlUrl,
          status: 'Completed'
        });
        await existingProj.save();
      }

      // Link repo to Project doc
      repoDoc.linkedProjectId = existingProj._id;
      await repoDoc.save();

      // Auto-add missing skills with GITHUB EVIDENCE category
      for (const tech of repoDoc.detectedTechs) {
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

        // Link Evidence
        await GitHubEvidence.findOneAndUpdate(
          { user: userId, githubRepoId: repoDoc._id, technology: tech },
          { skillId: existingSkill._id, projectId: existingProj._id, evidenceStrength: 'STRONG' },
          { upsert: true }
        );
      }

      await logActivity(userId, 'CONFIRM_PROJECT', `Confirmed GitHub repository project link: ${repoDoc.name}`);
      await calculateCareerAlignment(userId);

      return res.status(200).json({
        success: true,
        message: `Project "${repoDoc.name}" confirmed and linked to KRICS Project Artifacts!`,
        project: existingProj
      });
    }

    res.status(200).json({ success: true, message: `Repository "${repoName}" ignored.` });
  } catch (err) {
    console.error('Error confirming potential project:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. LINK Repository to Skill
exports.linkRepositoryToSkill = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { repoId, skillId } = req.body;

    const repoDoc = await GitHubRepo.findOne({ _id: repoId, user: userId });
    const skillDoc = await Skill.findOne({ _id: skillId, user: userId });

    if (!repoDoc || !skillDoc) {
      return res.status(404).json({ success: false, message: 'Repository or Skill not found' });
    }

    if (!repoDoc.linkedSkillIds.includes(skillDoc._id)) {
      repoDoc.linkedSkillIds.push(skillDoc._id);
      await repoDoc.save();
    }

    await GitHubEvidence.findOneAndUpdate(
      { user: userId, githubRepoId: repoDoc._id, technology: skillDoc.name },
      { skillId: skillDoc._id, evidenceStrength: 'STRONG' },
      { upsert: true }
    );

    await calculateCareerAlignment(userId);
    res.status(200).json({ success: true, message: `Linked ${repoDoc.name} as verified evidence for ${skillDoc.name}!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. LINK Repository to Experience
exports.linkRepositoryToExperience = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { repoId, experienceId } = req.body;

    const repoDoc = await GitHubRepo.findOne({ _id: repoId, user: userId });
    const expDoc = await Experience.findOne({ _id: experienceId, user: userId });

    if (!repoDoc || !expDoc) {
      return res.status(404).json({ success: false, message: 'Repository or Experience not found' });
    }

    repoDoc.linkedExperienceId = expDoc._id;
    await repoDoc.save();

    await calculateCareerAlignment(userId);
    res.status(200).json({ success: true, message: `Linked ${repoDoc.name} as supporting evidence for ${expDoc.role || 'Experience'}!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 7. GET Repositories List
exports.getRepositories = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const repos = await GitHubRepo.find({ user: userId }).sort({ githubPushedAt: -1, updatedAt: -1 });
    res.status(200).json({ success: true, count: repos.length, data: repos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 8. DISCONNECT GitHub Integration
exports.disconnectGitHub = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const user = await User.findById(userId);
    if (user && user.githubProfile) {
      user.githubProfile.connected = false;
      await user.save();
    }
    await logActivity(userId, 'DISCONNECT_GITHUB', 'Disconnected GitHub integration');

    res.status(200).json({ success: true, message: 'GitHub integration disconnected successfully.' });
  } catch (err) {
    console.error('Error disconnecting GitHub:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 9. GitHub OAuth Auth URL
exports.getOAuthUrl = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({ success: false, message: 'GITHUB_CLIENT_ID is not configured in environment.' });
  }
  const redirectUri = process.env.GITHUB_CALLBACK_URL || `http://localhost:${process.env.PORT || 8000}/api/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user%20user:email%20repo&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.status(200).json({ success: true, url });
};

// 10. GitHub OAuth Callback
exports.handleOAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'Missing OAuth authorization code' });

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ success: false, message: 'GitHub OAuth credentials not configured on server.' });
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(400).json({ success: false, message: 'Failed to obtain GitHub access token' });
    }

    const userId = await getUserId(req);
    await syncUserGitHubData(userId, null, tokenData.access_token);

    res.redirect('/#githubintelligence');
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
