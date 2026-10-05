const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Learning = require('../models/Learning');
const GitHubRepo = require('../models/GitHubRepo');
const GitHubEvidence = require('../models/GitHubEvidence');

// Diagnostic logger that omits secrets
function logDiag(stage, detail) {
  console.log(`[GitHub Pipeline] ${stage}:`, detail);
}

// Helper: Sanitize GitHub username handle from full URLs or leading symbols
function sanitizeGitHubUsername(input) {
  if (!input) return '';
  let str = String(input).trim();
  str = str.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
  str = str.replace(/^[@\/]+/, '');
  str = str.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
  return str.split('/')[0].split('?')[0].split('#')[0].trim();
}

// Fetch authenticated or public GitHub user profile with 403 Rate-limit fallback
async function fetchGitHubUser(username, accessToken) {
  const cleanUsername = sanitizeGitHubUsername(username);
  const headers = { 'User-Agent': 'KRICS-Career-Evidence-Engine' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const url = accessToken 
    ? 'https://api.github.com/user'
    : `https://api.github.com/users/${encodeURIComponent(cleanUsername)}`;

  logDiag('FetchUser', `Querying ${url}`);
  try {
    const res = await fetch(url, { headers });
    if (res.status === 403 || res.status === 429) {
      logDiag('FetchUser', `Rate limit hit (HTTP ${res.status}). Using identity snapshot for @${cleanUsername}.`);
      return {
        githubUserId: 0,
        login: cleanUsername,
        name: cleanUsername,
        avatarUrl: `https://github.com/${cleanUsername}.png`,
        profileUrl: `https://github.com/${cleanUsername}`,
        publicRepos: 0,
        isRateLimited: true
      };
    }
    if (!res.ok) {
      throw new Error(`GitHub account "@${cleanUsername}" was not found or API returned status ${res.status}`);
    }
    const data = await res.json();
    logDiag('FetchUser', `Verified identity @${data.login}`);
    return {
      githubUserId: data.id,
      login: data.login,
      name: data.name || data.login,
      avatarUrl: data.avatar_url,
      profileUrl: data.html_url,
      publicRepos: data.public_repos || 0,
      type: data.type || 'User',
      isRateLimited: false
    };
  } catch (err) {
    if (err.message.includes('not found')) throw err;
    return {
      githubUserId: 0,
      login: cleanUsername,
      name: cleanUsername,
      avatarUrl: `https://github.com/${cleanUsername}.png`,
      profileUrl: `https://github.com/${cleanUsername}`,
      publicRepos: 0,
      isRateLimited: true
    };
  }
}

// Fetch real paginated repositories with rate-limit handling
async function fetchGitHubRepos(username, accessToken) {
  const cleanUsername = sanitizeGitHubUsername(username);
  const headers = { 'User-Agent': 'KRICS-Career-Evidence-Engine' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let allRepos = [];
  let page = 1;
  const perPage = 100;

  try {
    while (page <= 5) {
      const baseUrl = accessToken
        ? `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`
        : `https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?per_page=${perPage}&page=${page}&sort=updated`;

      logDiag('FetchRepos', `Fetching page ${page} from ${baseUrl}`);
      const res = await fetch(baseUrl, { headers });
      if (res.status === 403 || res.status === 429 || !res.ok) {
        logDiag('FetchRepos', `API limit/response code ${res.status} on page ${page}`);
        break;
      }

      const repos = await res.json();
      if (!Array.isArray(repos) || repos.length === 0) break;

      allRepos = allRepos.concat(repos);
      if (repos.length < perPage) break;
      page++;
    }
  } catch (err) {
    logDiag('FetchRepos', `Error fetching repos: ${err.message}`);
  }

  logDiag('FetchRepos', `Retrieved ${allRepos.length} repositories from API`);
  return allRepos;
}

// Fetch real language breakdown per repo
async function fetchRepoLanguages(owner, repoName, accessToken) {
  const headers = { 'User-Agent': 'KRICS-Career-Evidence-Engine' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/languages`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    const totalBytes = Object.values(data).reduce((acc, bytes) => acc + bytes, 0);
    if (totalBytes === 0) return [];

    return Object.entries(data).map(([lang, bytes]) => ({
      language: lang,
      bytes,
      percentage: Number(((bytes / totalBytes) * 100).toFixed(1))
    }));
  } catch (err) {
    return [];
  }
}

// Fetch real README content per repo
async function fetchRepoReadme(owner, repoName, accessToken) {
  const headers = { 'User-Agent': 'KRICS-Career-Evidence-Engine' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/readme`, { headers });
    if (!res.ok) return { available: false, content: '', sha: null };
    const data = await res.json();
    let decoded = '';
    if (data.content && data.encoding === 'base64') {
      decoded = Buffer.from(data.content, 'base64').toString('utf-8').slice(0, 30000);
    }
    return { available: true, content: decoded, sha: data.sha || null };
  } catch (err) {
    return { available: false, content: '', sha: null };
  }
}

// Fetch commit activity signals
async function fetchRepoCommits(owner, repoName, accessToken) {
  const headers = { 'User-Agent': 'KRICS-Career-Evidence-Engine' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/commits?per_page=30`, { headers });
    if (!res.ok) return { count: 0, recentActivityAt: null };
    const commits = await res.json();
    if (!Array.isArray(commits)) return { count: 0, recentActivityAt: null };
    return {
      count: commits.length,
      recentActivityAt: commits[0]?.commit?.committer?.date ? new Date(commits[0].commit.committer.date) : null
    };
  } catch (err) {
    return { count: 0, recentActivityAt: null };
  }
}

// Analyze repository stack from real repo metadata, languages, and readme
function analyzeRepoStack(repo, languageBreakdown = [], readmeContent = '') {
  const name = repo.name || '';
  const desc = repo.description || '';
  const mainLang = repo.language || '';
  const topics = repo.topics || [];
  const readmeText = readmeContent.slice(0, 10000).toLowerCase();

  const textBlob = `${name} ${desc} ${mainLang} ${topics.join(' ')} ${readmeText}`.toLowerCase();
  const detectedTechs = new Set();

  if (mainLang) detectedTechs.add(mainLang);
  languageBreakdown.forEach(l => {
    if (l.language) detectedTechs.add(l.language);
  });

  // Technology signatures detection
  if (textBlob.includes('python')) detectedTechs.add('Python');
  if (textBlob.includes('pandas')) detectedTechs.add('Pandas');
  if (textBlob.includes('numpy')) detectedTechs.add('NumPy');
  if (textBlob.includes('scikit-learn') || textBlob.includes('sklearn') || textBlob.includes('machine-learning') || textBlob.includes('machine learning')) {
    detectedTechs.add('Machine Learning');
    detectedTechs.add('Scikit-Learn');
  }
  if (textBlob.includes('pytorch') || textBlob.includes('tensorflow') || textBlob.includes('deep learning')) {
    detectedTechs.add('Deep Learning');
    if (textBlob.includes('pytorch')) detectedTechs.add('PyTorch');
    if (textBlob.includes('tensorflow')) detectedTechs.add('TensorFlow');
  }
  if (textBlob.includes('sql') || textBlob.includes('postgres') || textBlob.includes('mysql')) {
    detectedTechs.add('SQL');
    if (textBlob.includes('postgres')) detectedTechs.add('PostgreSQL');
  }
  if (textBlob.includes('react') || textBlob.includes('next.js') || textBlob.includes('nextjs')) detectedTechs.add('React');
  if (textBlob.includes('typescript') || textBlob.includes('.ts') || textBlob.includes('.tsx')) detectedTechs.add('TypeScript');
  if (textBlob.includes('node') || textBlob.includes('express')) {
    detectedTechs.add('Node.js');
    detectedTechs.add('Express');
  }
  if (textBlob.includes('mongodb') || textBlob.includes('mongoose')) detectedTechs.add('MongoDB');
  if (textBlob.includes('docker') || textBlob.includes('dockerfile')) detectedTechs.add('Docker');
  if (textBlob.includes('html') || textBlob.includes('css') || textBlob.includes('tailwind')) {
    if (textBlob.includes('html')) detectedTechs.add('HTML');
    if (textBlob.includes('tailwind')) detectedTechs.add('Tailwind CSS');
  }

  return Array.from(detectedTechs);
}

// Complete Real Sync Pipeline Function
async function syncUserGitHubData(userId, usernameInput, accessToken = null, selectedRepoNames = null) {
  logDiag('SyncPipeline', `Initiating real GitHub sync for user ID ${userId}`);
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const rawUsername = usernameInput || user.githubProfile?.username || user.github || 'KRISHNA-K19';
  const username = sanitizeGitHubUsername(rawUsername);

  // Step 1: Verify authenticated user
  const ghUser = await fetchGitHubUser(username, accessToken);

  // Step 2: Fetch real paginated repositories
  const rawRepos = await fetchGitHubRepos(ghUser.login, accessToken);

  // Step 3: Upsert repositories into MongoDB
  const existingRepos = await GitHubRepo.find({ user: userId });
  const existingMap = new Map(existingRepos.map(r => [r.githubRepoId, r]));

  const updatedRepoDocs = [];

  if (rawRepos.length > 0) {
    for (let i = 0; i < rawRepos.length; i++) {
      const r = rawRepos[i];
      const owner = r.owner?.login || ghUser.login;

      let langBreakdown = [];
      let readmeInfo = { available: false, content: '', sha: null };
      let commitInfo = { count: 0, recentActivityAt: null };

      if (i < 15 && !ghUser.isRateLimited) {
        langBreakdown = await fetchRepoLanguages(owner, r.name, accessToken);
        readmeInfo = await fetchRepoReadme(owner, r.name, accessToken);
        commitInfo = await fetchRepoCommits(owner, r.name, accessToken);
      }

      const detectedTechs = analyzeRepoStack(r, langBreakdown, readmeInfo.content);

      const existingDoc = existingMap.get(r.id);

      let isSelected = false;
      if (Array.isArray(selectedRepoNames)) {
        isSelected = selectedRepoNames.includes(r.name);
      } else if (existingDoc) {
        isSelected = existingDoc.selectedForKrics;
      } else {
        isSelected = i < 4;
      }

      const repoFields = {
        user: userId,
        githubRepoId: r.id,
        name: r.name,
        fullName: r.full_name,
        owner,
        description: r.description || '',
        htmlUrl: r.html_url,
        defaultBranch: r.default_branch || 'main',
        visibility: r.visibility || (r.private ? 'private' : 'public'),
        isPrivate: !!r.private,
        isFork: !!r.fork,
        isArchived: !!r.archived,
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        openIssues: r.open_issues_count || 0,
        language: r.language || 'Code',
        languages: langBreakdown.length > 0 ? langBreakdown : (existingDoc?.languages || []),
        topics: r.topics || [],
        readmeAvailable: readmeInfo.available || (existingDoc?.readmeAvailable || false),
        readmeContent: readmeInfo.content || (existingDoc?.readmeContent || ''),
        readmeSha: readmeInfo.sha || (existingDoc?.readmeSha || null),
        commitCount: commitInfo.count || (existingDoc?.commitCount || 0),
        recentActivityAt: commitInfo.recentActivityAt || new Date(r.pushed_at || r.updated_at),
        detectedTechs: detectedTechs.length > 0 ? detectedTechs : (existingDoc?.detectedTechs || [r.language].filter(Boolean)),
        selectedForKrics: isSelected,
        lastSyncedAt: new Date(),
        githubCreatedAt: r.created_at ? new Date(r.created_at) : null,
        githubUpdatedAt: r.updated_at ? new Date(r.updated_at) : null,
        githubPushedAt: r.pushed_at ? new Date(r.pushed_at) : null
      };

      const doc = await GitHubRepo.findOneAndUpdate(
        { user: userId, githubRepoId: r.id },
        repoFields,
        { upsert: true, new: true }
      );
      updatedRepoDocs.push(doc);
    }
  } else if (existingRepos.length > 0) {
    // If rate limited or 0 repos returned, preserve existing stored repo snapshot
    logDiag('SyncPipeline', `Rate limited or API returned 0 repos. Retaining ${existingRepos.length} existing DB repos.`);
    existingRepos.forEach(r => updatedRepoDocs.push(r));
  }

  // Step 4: Build Real Evidence Records in GitHubEvidence model
  const userSkills = await Skill.find({ user: userId });
  const userProjects = await Project.find({ user: userId });
  const selectedDocs = updatedRepoDocs.filter(r => r.selectedForKrics);

  await GitHubEvidence.deleteMany({ user: userId });

  let evidenceCreatedCount = 0;

  for (const repoDoc of selectedDocs) {
    for (const tech of repoDoc.detectedTechs) {
      const matchingSkill = userSkills.find(s => s.name.toLowerCase().trim() === tech.toLowerCase().trim());
      const matchingProject = userProjects.find(p => p.name.toLowerCase().includes(repoDoc.name.toLowerCase()) || (p.githubLink && p.githubLink.includes(repoDoc.name)));

      const evidenceDoc = new GitHubEvidence({
        user: userId,
        githubRepoId: repoDoc._id,
        repoName: repoDoc.name,
        technology: tech,
        skillId: matchingSkill ? matchingSkill._id : null,
        projectId: matchingProject ? matchingProject._id : null,
        evidenceType: repoDoc.readmeAvailable ? 'README_SIGNAL' : 'LANGUAGE_USAGE',
        evidenceStrength: repoDoc.stars > 5 || repoDoc.commitCount > 10 ? 'STRONG' : 'MODERATE',
        signals: {
          language: repoDoc.language,
          stars: repoDoc.stars,
          commits: repoDoc.commitCount,
          readme: repoDoc.readmeAvailable
        }
      });
      await evidenceDoc.save();
      evidenceCreatedCount++;
    }
  }

  // Step 5: Calculate DB Metrics
  const publicReposCount = await GitHubRepo.countDocuments({ user: userId, isPrivate: false });
  const selectedReposCount = await GitHubRepo.countDocuments({ user: userId, selectedForKrics: true });
  
  const selectedReposDocs = await GitHubRepo.find({ user: userId, selectedForKrics: true });
  const uniqueLangs = new Set();
  selectedReposDocs.forEach(r => {
    if (r.language && r.language !== 'Code') uniqueLangs.add(r.language);
    (r.languages || []).forEach(l => { if (l.language) uniqueLangs.add(l.language); });
  });

  const projectEvidenceLinksCount = await GitHubRepo.countDocuments({ user: userId, linkedProjectId: { $ne: null } });
  const skillEvidenceLinksCount = await GitHubEvidence.countDocuments({ user: userId, skillId: { $ne: null } });

  // Update user profile record
  user.github = ghUser.login;
  user.githubProfile = {
    connected: true,
    username: ghUser.login,
    avatarUrl: ghUser.avatarUrl,
    publicReposCount,
    selectedRepos: selectedReposDocs.map(r => r.name),
    detectedLanguages: Array.from(uniqueLangs),
    detectedTechnologies: Array.from(new Set(selectedReposDocs.flatMap(r => r.detectedTechs))),
    lastSyncedAt: new Date(),
    timeline: [
      {
        date: new Date(),
        title: `Synchronized ${updatedRepoDocs.length} GitHub repositories`,
        repoName: `@${ghUser.login}`,
        action: 'SYNCED'
      }
    ],
    evidenceStats: {
      totalReposAnalyzed: updatedRepoDocs.length,
      confirmedProjectsCount: projectEvidenceLinksCount,
      skillEvidenceCount: skillEvidenceLinksCount,
      evidenceLevel: skillEvidenceLinksCount > 0 ? 'VERIFIED GITHUB EVIDENCE' : 'GITHUB CONNECTED'
    }
  };
  await User.findOneAndUpdate(
    { _id: user._id },
    { $set: { github: ghUser.login, githubProfile: user.githubProfile } },
    { upsert: true }
  );

  logDiag('SyncPipeline', `Sync completed. ${updatedRepoDocs.length} repos persisted.`);

  return {
    status: ghUser.isRateLimited ? 'PARTIAL_SYNC' : 'SYNCED',
    githubUser: ghUser,
    metrics: {
      publicReposCount,
      selectedReposCount,
      languagesDetectedCount: uniqueLangs.size,
      projectEvidenceLinksCount,
      skillEvidenceLinksCount,
      evidenceCreatedCount
    },
    lastSyncedAt: user.githubProfile.lastSyncedAt
  };
}

// Calculate Skill Evidence Matrix for User
async function calculateSkillEvidenceMatrix(userId) {
  const skills = await Skill.find({ user: userId }) || [];
  const projects = await Project.find({ user: userId }) || [];
  const learnings = await Learning.find({ user: userId }) || [];
  const experiences = await Experience.find({ user: userId }) || [];
  const selectedGithubRepos = await GitHubRepo.find({ user: userId, selectedForKrics: true }) || [];

  return skills.map(s => {
    const normSkill = s.name.toLowerCase();

    const backedByGithub = selectedGithubRepos.some(r => 
      (r.detectedTechs || []).some(t => t.toLowerCase().includes(normSkill) || normSkill.includes(t.toLowerCase()))
    );

    const backedByProject = projects.some(p => 
      (p.techs || []).some(t => t.toLowerCase().includes(normSkill) || normSkill.includes(t.toLowerCase())) ||
      (p.name || '').toLowerCase().includes(normSkill)
    );

    const backedByLearning = learnings.some(l => 
      (l.title || '').toLowerCase().includes(normSkill) || (l.provider || '').toLowerCase().includes(normSkill)
    );

    const backedByExperience = experiences.some(e => 
      (e.description || '').toLowerCase().includes(normSkill) || (e.role || '').toLowerCase().includes(normSkill)
    );

    let evidenceSourcesCount = 0;
    if (backedByGithub) evidenceSourcesCount++;
    if (backedByProject) evidenceSourcesCount++;
    if (backedByLearning) evidenceSourcesCount++;
    if (backedByExperience) evidenceSourcesCount++;

    let strength = 'CLAIMED';
    let badgeLabel = 'Self-Claimed';
    let color = 'text-on-surface-variant';

    if (evidenceSourcesCount >= 3) {
      strength = 'MULTIPLE EVIDENCE SOURCES';
      badgeLabel = 'Multiple Evidence Sources ✓';
      color = 'text-amber-400';
    } else if (backedByGithub) {
      strength = 'GITHUB EVIDENCE';
      badgeLabel = 'GitHub Evidence ✓';
      color = 'text-primary';
    } else if (backedByProject) {
      strength = 'PROJECT EVIDENCE';
      badgeLabel = 'Project Evidence ✓';
      color = 'text-secondary';
    } else if (backedByLearning) {
      strength = 'PRACTICED';
      badgeLabel = 'Learning Track Verified';
      color = 'text-cyan-300';
    }

    return {
      _id: s._id,
      name: s.name,
      level: s.level || 'INTERMEDIATE',
      pct: s.pct || 70,
      category: s.category || 'Technical',
      evidence: {
        strength,
        badgeLabel,
        color,
        backedByGithub,
        backedByProject,
        backedByLearning,
        backedByExperience,
        sourcesCount: evidenceSourcesCount
      }
    };
  });
}

// Generate HUKUM AI Insight from real DB records
async function generateHukumGitHubInsight(userId, targetRole) {
  const selectedRepos = await GitHubRepo.find({ user: userId, selectedForKrics: true });
  if (selectedRepos.length === 0) {
    return {
      summary: "I don't have enough GitHub evidence yet. Select a repository and let me analyze it.",
      gapInsight: "Connect your GitHub account and select repositories to generate verified career evidence.",
      strengthScore: 40
    };
  }

  const coveredTechs = new Set();
  selectedRepos.forEach(r => (r.detectedTechs || []).forEach(t => coveredTechs.add(t)));

  const techList = Array.from(coveredTechs).slice(0, 4).join(', ');

  return {
    summary: `Your connected GitHub repositories provide verified project implementation evidence for ${techList || 'your technical skills'}.`,
    gapInsight: `Selected ${selectedRepos.length} repositories providing real evidence signals across ${coveredTechs.size} technologies.`,
    strengthScore: Math.min(50 + (selectedRepos.length * 5) + (coveredTechs.size * 3), 98)
  };
}

module.exports = {
  fetchGitHubUser,
  fetchGitHubRepos,
  fetchRepoLanguages,
  fetchRepoReadme,
  fetchRepoCommits,
  analyzeRepoStack,
  syncUserGitHubData,
  calculateSkillEvidenceMatrix,
  generateHukumGitHubInsight
};
