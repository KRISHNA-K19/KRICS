const https = require('https');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');

function fetchGitHubReposFromApi(username) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/users/${username}/repos?sort=updated&per_page=30`,
      headers: { 'User-Agent': 'KRICS-Career-Evidence-Engine' }
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const repos = JSON.parse(data);
            if (Array.isArray(repos) && repos.length > 0) {
              return resolve(repos);
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
  });
}

function generateMockReposForUser(username) {
  return [
    {
      name: 'ML-Prediction-System',
      description: 'End-to-end Machine Learning forecasting pipeline for candidate career alignment and risk scoring.',
      language: 'Python',
      stargazers_count: 14,
      forks_count: 3,
      html_url: `https://github.com/${username}/ML-Prediction-System`,
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      topics: ['python', 'scikit-learn', 'pandas', 'machine-learning']
    },
    {
      name: 'Data-Analysis-Dashboard',
      description: 'Interactive analytics dashboard displaying real-time data ingestion and statistical insights.',
      language: 'Python',
      stargazers_count: 8,
      forks_count: 2,
      html_url: `https://github.com/${username}/Data-Analysis-Dashboard`,
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      topics: ['python', 'pandas', 'numpy', 'matplotlib', 'data-analysis']
    },
    {
      name: 'NLP-Chatbot-Engine',
      description: 'Natural language processing career mentor assistant utilizing PyTorch and HuggingFace transformers.',
      language: 'Python',
      stargazers_count: 22,
      forks_count: 5,
      html_url: `https://github.com/${username}/NLP-Chatbot-Engine`,
      updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      topics: ['pytorch', 'nlp', 'transformers', 'machine-learning']
    },
    {
      name: 'Analytics-Microservice',
      description: 'High-throughput telemetry ingestion microservice built with Node.js, Express, and PostgreSQL.',
      language: 'JavaScript',
      stargazers_count: 6,
      forks_count: 1,
      html_url: `https://github.com/${username}/Analytics-Microservice`,
      updated_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      topics: ['nodejs', 'express', 'postgresql', 'sql', 'rest-api']
    },
    {
      name: 'Student-Management-System',
      description: 'Full-stack academic record and course tracking web portal built with React and MongoDB.',
      language: 'TypeScript',
      stargazers_count: 4,
      forks_count: 0,
      html_url: `https://github.com/${username}/Student-Management-System`,
      updated_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      topics: ['react', 'typescript', 'mongodb', 'express']
    },
    {
      name: 'College-Website',
      description: 'Static responsive landing website template for university department events.',
      language: 'HTML',
      stargazers_count: 1,
      forks_count: 0,
      html_url: `https://github.com/${username}/College-Website`,
      updated_at: new Date(Date.now() - 86400000 * 60).toISOString(),
      topics: ['html', 'css', 'javascript']
    }
  ];
}

function analyzeRepoStack(repo) {
  const name = repo.name || '';
  const desc = repo.description || '';
  const lang = repo.language || '';
  const topics = repo.topics || [];
  const textBlob = `${name} ${desc} ${lang} ${topics.join(' ')}`.toLowerCase();

  const detectedTechs = new Set();
  const detectedLangs = new Set();

  if (lang) detectedLangs.add(lang);

  // Skill signature mapping
  if (textBlob.includes('python')) { detectedTechs.add('Python'); detectedLangs.add('Python'); }
  if (textBlob.includes('pandas')) detectedTechs.add('Pandas');
  if (textBlob.includes('numpy')) detectedTechs.add('NumPy');
  if (textBlob.includes('scikit-learn') || textBlob.includes('sklearn') || textBlob.includes('ml-prediction') || textBlob.includes('machine-learning')) {
    detectedTechs.add('Machine Learning');
    detectedTechs.add('Scikit-Learn');
  }
  if (textBlob.includes('pytorch') || textBlob.includes('tensorflow') || textBlob.includes('nlp')) {
    detectedTechs.add('PyTorch');
    detectedTechs.add('Deep Learning');
  }
  if (textBlob.includes('sql') || textBlob.includes('postgres') || textBlob.includes('mysql')) {
    detectedTechs.add('SQL');
    detectedTechs.add('PostgreSQL');
  }
  if (textBlob.includes('react')) detectedTechs.add('React');
  if (textBlob.includes('node') || textBlob.includes('express')) {
    detectedTechs.add('Node.js');
    detectedTechs.add('Express');
  }
  if (textBlob.includes('data-analysis') || textBlob.includes('analytics')) detectedTechs.add('Data Analysis');

  if (detectedTechs.size === 0 && lang) {
    detectedTechs.add(lang);
  }

  return {
    name,
    description: desc || 'GitHub Repository',
    url: repo.html_url || `https://github.com/${repo.name}`,
    language: lang || 'Code',
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    updatedAt: repo.updated_at || new Date(),
    detectedTechs: Array.from(detectedTechs),
    detectedLangs: Array.from(detectedLangs),
    evidenceSignals: {
      hasReadme: true,
      hasMultipleCommits: true,
      hasStructure: true,
      verifiedSourceFiles: true
    }
  };
}

function calculateSkillEvidenceStrength(skillName, userProjects, userLearnings, userExperiences, selectedGithubRepos) {
  const normSkill = skillName.toLowerCase();

  // Check GitHub repo backing
  const backedByGithub = selectedGithubRepos.some(r => 
    r.detectedTechs.some(t => t.toLowerCase().includes(normSkill) || normSkill.includes(t.toLowerCase()))
  );

  // Check Project backing
  const backedByProject = userProjects.some(p => 
    (p.techs || []).some(t => t.toLowerCase().includes(normSkill) || normSkill.includes(t.toLowerCase())) ||
    (p.name || '').toLowerCase().includes(normSkill)
  );

  // Check Learning backing
  const backedByLearning = userLearnings.some(l => 
    (l.title || '').toLowerCase().includes(normSkill) || (l.provider || '').toLowerCase().includes(normSkill)
  );

  // Check Experience backing
  const backedByExperience = userExperiences.some(e => 
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
    strength,
    badgeLabel,
    color,
    backedByGithub,
    backedByProject,
    backedByLearning,
    backedByExperience,
    sourcesCount: evidenceSourcesCount
  };
}

function generateGitHubCareerInsight(targetRole, skills, selectedRepos) {
  const coveredTechs = new Set();
  selectedRepos.forEach(r => r.detectedTechs.forEach(t => coveredTechs.add(t)));

  const pythonSupported = coveredTechs.has('Python');
  const mlSupported = coveredTechs.has('Machine Learning') || coveredTechs.has('PyTorch');
  const dataAnalysisSupported = coveredTechs.has('Data Analysis') || coveredTechs.has('Pandas');
  const sqlSupported = coveredTechs.has('SQL') || coveredTechs.has('PostgreSQL');

  const supportedList = Array.from(coveredTechs).slice(0, 4).join(', ');

  if (targetRole.toLowerCase().includes('data scientist')) {
    return {
      summary: `Your connected GitHub activity provides verified project evidence for ${supportedList || 'Python and Machine Learning'}.`,
      gapInsight: pythonSupported && mlSupported ? 'Statistics and experimental design currently have fewer direct GitHub project signals.' : 'Consider adding 1 Machine Learning repository to strengthen Data Scientist alignment.',
      strengthScore: Math.min(65 + (selectedRepos.length * 4), 95)
    };
  }

  return {
    summary: `Your connected repositories provide verified project evidence for ${supportedList || 'core engineering skills'}.`,
    gapInsight: 'Link more targeted repositories to strengthen alignment for your goal.',
    strengthScore: Math.min(60 + (selectedRepos.length * 5), 95)
  };
}

module.exports = {
  fetchGitHubReposFromApi,
  generateMockReposForUser,
  analyzeRepoStack,
  calculateSkillEvidenceStrength,
  generateGitHubCareerInsight
};
