const Roadmap = require('../models/Roadmap');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Learning = require('../models/Learning');
const Certification = require('../models/Certification');
const CareerPath = require('../models/CareerPath');
const GitHubRepo = require('../models/GitHubRepo');
const { calculateSkillGap } = require('./skillGapEngine');
const { calculateCareerAlignment } = require('./careerAlignmentService');

const LEVEL_WEIGHTS = {
  'BEGINNER': 25,
  'INTERMEDIATE': 55,
  'ADVANCED': 85,
  'EXPERT': 100
};

/**
 * Default career template fallback definitions
 */
const CAREER_TEMPLATES = {
  'Data Scientist': {
    foundational: [
      { name: 'Python', targetLevel: 'ADVANCED' },
      { name: 'SQL', targetLevel: 'INTERMEDIATE' }
    ],
    core: [
      { name: 'Pandas & NumPy', targetLevel: 'ADVANCED' },
      { name: 'Inferential Statistics', targetLevel: 'INTERMEDIATE' },
      { name: 'Machine Learning', targetLevel: 'ADVANCED' },
      { name: 'Data Visualization', targetLevel: 'INTERMEDIATE' }
    ],
    advanced: [
      { name: 'Deep Learning', targetLevel: 'INTERMEDIATE' },
      { name: 'Feature Engineering', targetLevel: 'ADVANCED' },
      { name: 'Model Evaluation', targetLevel: 'ADVANCED' }
    ],
    projects: [
      { title: 'Predictive Modeling Engine', description: 'Build an end-to-end ML model pipeline using Scikit-Learn/Pandas with cross-validation.', suggestedTechs: ['Python', 'Pandas', 'Machine Learning', 'SQL'] },
      { title: 'Data Analytics & Visualization Dashboard', description: 'Interactive dashboard analyzing real-world dataset metrics and statistical distributions.', suggestedTechs: ['Python', 'SQL', 'Data Visualization', 'Pandas'] }
    ]
  },
  'AI/ML Engineer': {
    foundational: [
      { name: 'Python', targetLevel: 'ADVANCED' },
      { name: 'Data Structures & Algorithms', targetLevel: 'INTERMEDIATE' }
    ],
    core: [
      { name: 'Machine Learning', targetLevel: 'ADVANCED' },
      { name: 'PyTorch or TensorFlow', targetLevel: 'ADVANCED' },
      { name: 'REST API & Model Serving', targetLevel: 'INTERMEDIATE' }
    ],
    advanced: [
      { name: 'Deep Learning & Neural Networks', targetLevel: 'ADVANCED' },
      { name: 'MLOps & Model Deployment', targetLevel: 'INTERMEDIATE' },
      { name: 'LLM & Prompt Engineering', targetLevel: 'INTERMEDIATE' }
    ],
    projects: [
      { title: 'Containerized Model Serving Microservice', description: 'Deploy a PyTorch/Scikit-Learn ML inference API container with fast response latency.', suggestedTechs: ['Python', 'PyTorch', 'REST API', 'Docker'] },
      { title: 'Deep Learning Neural Pipeline', description: 'Implement computer vision or NLP Transformer pipeline evaluated on custom datasets.', suggestedTechs: ['Python', 'PyTorch', 'Deep Learning'] }
    ]
  },
  'Software Engineer': {
    foundational: [
      { name: 'JavaScript or Python', targetLevel: 'ADVANCED' },
      { name: 'Data Structures & Algorithms', targetLevel: 'ADVANCED' },
      { name: 'Git & Version Control', targetLevel: 'INTERMEDIATE' }
    ],
    core: [
      { name: 'Object-Oriented Programming', targetLevel: 'ADVANCED' },
      { name: 'RESTful API Design', targetLevel: 'ADVANCED' },
      { name: 'Database Architecture (SQL/NoSQL)', targetLevel: 'INTERMEDIATE' }
    ],
    advanced: [
      { name: 'System Design & Scalability', targetLevel: 'INTERMEDIATE' },
      { name: 'CI/CD & DevOps Basics', targetLevel: 'INTERMEDIATE' },
      { name: 'Automated Testing & QA', targetLevel: 'INTERMEDIATE' }
    ],
    projects: [
      { title: 'Full-Stack Scalable Web Application', description: 'Architect a modular web app featuring JWT auth, REST endpoints, and database persistent storage.', suggestedTechs: ['JavaScript', 'RESTful API', 'SQL/NoSQL', 'Git'] },
      { title: 'Distributed Microservice Architecture', description: 'Design decoupled service endpoints utilizing async queuing and database indexing.', suggestedTechs: ['System Design', 'RESTful API', 'Git'] }
    ]
  },
  'Full Stack Developer': {
    foundational: [
      { name: 'HTML & CSS & Tailwind', targetLevel: 'ADVANCED' },
      { name: 'JavaScript', targetLevel: 'ADVANCED' },
      { name: 'Node.js & Express', targetLevel: 'ADVANCED' }
    ],
    core: [
      { name: 'React / SPA Architecture', targetLevel: 'ADVANCED' },
      { name: 'MongoDB / SQL Database', targetLevel: 'ADVANCED' },
      { name: 'REST API Integration', targetLevel: 'ADVANCED' }
    ],
    advanced: [
      { name: 'State Management & Performance', targetLevel: 'INTERMEDIATE' },
      { name: 'Security & Auth (JWT/OAuth)', targetLevel: 'ADVANCED' },
      { name: 'Cloud Deployment (Vercel/AWS)', targetLevel: 'INTERMEDIATE' }
    ],
    projects: [
      { title: 'Full-Stack SaaS Management Platform', description: 'Build an end-to-end web system with authentication, interactive UI, and analytics.', suggestedTechs: ['JavaScript', 'Node.js', 'MongoDB', 'React'] },
      { title: 'Real-Time Dynamic Web Portal', description: 'Deploy an interactive single-page application communicating via WebSocket or REST.', suggestedTechs: ['JavaScript', 'HTML/CSS', 'Express'] }
    ]
  },
  'Data Analyst': {
    foundational: [
      { name: 'SQL', targetLevel: 'ADVANCED' },
      { name: 'Excel / Spreadsheet Modeling', targetLevel: 'ADVANCED' }
    ],
    core: [
      { name: 'Python or R', targetLevel: 'INTERMEDIATE' },
      { name: 'Data Visualization (Power BI/Tableau)', targetLevel: 'ADVANCED' },
      { name: 'Descriptive Statistics', targetLevel: 'INTERMEDIATE' }
    ],
    advanced: [
      { name: 'Business Intelligence & ETL', targetLevel: 'INTERMEDIATE' },
      { name: 'A/B Testing & Experimentation', targetLevel: 'INTERMEDIATE' }
    ],
    projects: [
      { title: 'Executive BI Analytics Dashboard', description: 'Build automated interactive dashboard reporting key business KPIs and trend metrics.', suggestedTechs: ['SQL', 'Power BI', 'Excel'] },
      { title: 'Customer Cohort Analysis Script', description: 'Extract SQL data queries and apply Python Pandas retention cohort analytics.', suggestedTechs: ['SQL', 'Python', 'Data Visualization'] }
    ]
  },
  'Cloud Engineer': {
    foundational: [
      { name: 'Linux Administration', targetLevel: 'ADVANCED' },
      { name: 'Networking & Security', targetLevel: 'INTERMEDIATE' },
      { name: 'Python or Bash Scripting', targetLevel: 'INTERMEDIATE' }
    ],
    core: [
      { name: 'AWS / GCP / Azure Platform', targetLevel: 'ADVANCED' },
      { name: 'Docker Containerization', targetLevel: 'ADVANCED' },
      { name: 'Infrastructure as Code (Terraform)', targetLevel: 'INTERMEDIATE' }
    ],
    advanced: [
      { name: 'Kubernetes Orchestration', targetLevel: 'INTERMEDIATE' },
      { name: 'Cloud Security & IAM', targetLevel: 'ADVANCED' }
    ],
    projects: [
      { title: 'Cloud Infrastructure Provisioning', description: 'Automate multi-region cloud server topology setup using IaC scripts.', suggestedTechs: ['Linux', 'AWS/GCP', 'Terraform'] },
      { title: 'Containerized Microservice Deployment', description: 'Deploy load-balanced Docker containers with automated health-check monitoring.', suggestedTechs: ['Docker', 'Linux', 'Networking'] }
    ]
  },
  'DevOps Engineer': {
    foundational: [
      { name: 'Linux / Shell Automation', targetLevel: 'ADVANCED' },
      { name: 'Git & Source Control', targetLevel: 'ADVANCED' }
    ],
    core: [
      { name: 'CI/CD Pipelines (GitHub Actions)', targetLevel: 'ADVANCED' },
      { name: 'Docker & Containerization', targetLevel: 'ADVANCED' },
      { name: 'Cloud Services & Provisioning', targetLevel: 'INTERMEDIATE' }
    ],
    advanced: [
      { name: 'Kubernetes & Helm', targetLevel: 'INTERMEDIATE' },
      { name: 'Prometheus & Grafana Monitoring', targetLevel: 'INTERMEDIATE' }
    ],
    projects: [
      { title: 'Automated CI/CD Delivery Pipeline', description: 'Configure automated build, test, lint, and deployment workflows triggered on git push.', suggestedTechs: ['Git', 'CI/CD', 'Docker'] },
      { title: 'Infrastructure Monitoring Dashboard', description: 'Deploy metrics collector and alerting suite tracking cluster CPU and memory.', suggestedTechs: ['Linux', 'Docker', 'Monitoring'] }
    ]
  },
  'Cybersecurity Engineer': {
    foundational: [
      { name: 'Networking Protocols (TCP/IP)', targetLevel: 'ADVANCED' },
      { name: 'Linux Administration', targetLevel: 'ADVANCED' },
      { name: 'Python / Scripting', targetLevel: 'INTERMEDIATE' }
    ],
    core: [
      { name: 'Ethical Hacking & Vulnerability Analysis', targetLevel: 'ADVANCED' },
      { name: 'Cryptography & Identity Management', targetLevel: 'INTERMEDIATE' },
      { name: 'SIEM & Threat Detection', targetLevel: 'INTERMEDIATE' }
    ],
    advanced: [
      { name: 'Cloud Security & Compliance', targetLevel: 'INTERMEDIATE' },
      { name: 'Penetration Testing', targetLevel: 'INTERMEDIATE' }
    ],
    projects: [
      { title: 'Vulnerability Scanner & Audit Script', description: 'Build python tool detecting open network ports and insecure HTTP header flags.', suggestedTechs: ['Python', 'Networking', 'Security'] },
      { title: 'Log Intrusion Analysis Suite', description: 'Implement automated log analyzer matching threat signatures and anomaly spikes.', suggestedTechs: ['Linux', 'Python', 'Security'] }
    ]
  }
};

/**
 * Generate or retrieve existing user roadmap
 */
exports.generateOrGetRoadmap = async (userId, forceRecalculate = false, newCareerGoal = null) => {
  let user = await User.findById(userId);
  if (!user) {
    user = await User.findOne().sort({ createdAt: -1 });
  }

  if (newCareerGoal && user.careerGoal !== newCareerGoal) {
    user.careerGoal = newCareerGoal;
    await user.save();
  }

  const careerGoal = user.careerGoal || 'Data Scientist';

  let roadmap = await Roadmap.findOne({ user: user._id });

  if (!roadmap || forceRecalculate || roadmap.careerGoal !== careerGoal) {
    roadmap = await exports.buildPersonalizedRoadmap(user._id, careerGoal, roadmap);
  }

  return roadmap;
};

/**
 * Core Algorithm: Build Personalized Dynamic Roadmap from real database evidence
 */
exports.buildPersonalizedRoadmap = async (userId, careerGoal, existingRoadmap = null) => {
  const user = await User.findById(userId);
  const userSkills = await Skill.find({ user: userId }) || [];
  const userProjects = await Project.find({ user: userId }) || [];
  const userExperiences = await Experience.find({ user: userId }) || [];
  const userLearning = await Learning.find({ user: userId }) || [];
  const userCertifications = await Certification.find({ user: userId }) || [];
  const githubRepos = await GitHubRepo.find({ user: userId, selectedForKrics: true }) || [];

  const gapResult = await calculateSkillGap(userId);
  const alignmentResult = await calculateCareerAlignment(userId);

  // Retrieve career path template or fallback
  let careerPath = await CareerPath.findOne({ title: new RegExp(`^${careerGoal}$`, 'i') });
  const template = CAREER_TEMPLATES[careerGoal] || CAREER_TEMPLATES['Data Scientist'];

  // Map user skill set for fast lookup
  const userSkillMap = {};
  userSkills.forEach(s => {
    userSkillMap[s.name.toLowerCase().trim()] = s;
  });

  const projectTechSet = new Set();
  userProjects.forEach(p => {
    (p.techs || p.technologies || []).forEach(t => projectTechSet.add(t.toLowerCase().trim()));
  });

  const expSkillSet = new Set();
  userExperiences.forEach(e => {
    (e.skills || []).forEach(s => expSkillSet.add(s.toLowerCase().trim()));
  });

  const learningSkillSet = new Set();
  userLearning.forEach(l => {
    if (l.targetSkill) learningSkillSet.add(l.targetSkill.toLowerCase().trim());
  });

  const githubTechSet = new Set();
  githubRepos.forEach(r => {
    (r.detectedTechs || []).forEach(t => githubTechSet.add(t.toLowerCase().trim()));
    if (r.language) githubTechSet.add(r.language.toLowerCase().trim());
  });

  // Helper to get skill status
  const evaluateSkillStatus = (skillName, targetLevel = 'INTERMEDIATE') => {
    const key = skillName.toLowerCase().trim();
    const userSkill = userSkillMap[key];
    const hasProj = projectTechSet.has(key) || githubTechSet.has(key);
    const hasExp = expSkillSet.has(key);

    if (!userSkill) {
      return { status: 'GAP', currentLevel: 'NONE', score: 0, hasEvidence: false };
    }

    const currentScore = LEVEL_WEIGHTS[userSkill.level] || 25;
    const targetScore = LEVEL_WEIGHTS[targetLevel] || 55;

    if (currentScore >= targetScore && (hasProj || hasExp)) {
      return { status: 'MASTERED', currentLevel: userSkill.level, score: currentScore, hasEvidence: true };
    } else if (currentScore >= targetScore) {
      return { status: 'CLAIMED_EVIDENCE_NEEDED', currentLevel: userSkill.level, score: currentScore, hasEvidence: false };
    } else {
      return { status: 'DEVELOPING', currentLevel: userSkill.level, score: currentScore, hasEvidence: hasProj || hasExp };
    }
  };

  // Helper to extract existing task completions
  const completedTaskIds = new Set();
  if (existingRoadmap && existingRoadmap.phases) {
    existingRoadmap.phases.forEach(ph => {
      (ph.tasks || []).forEach(t => {
        if (t.fulfilled) completedTaskIds.add(t.taskId);
      });
    });
  }

  // Define dynamic phases
  const rawPhases = [];

  // ----------------------------------------------------
  // PHASE 1: CORE FOUNDATIONS & PREREQUISITES
  // ----------------------------------------------------
  const foundSkillsDef = (careerPath && careerPath.requiredSkills ? careerPath.requiredSkills.slice(0, 2) : null) || template.foundational;
  const p1Skills = foundSkillsDef.map(s => {
    const name = s.name || s;
    const targetLevel = s.minLevel || s.targetLevel || 'INTERMEDIATE';
    const evalResult = evaluateSkillStatus(name, targetLevel);
    return {
      name,
      targetLevel,
      currentLevel: evalResult.currentLevel,
      status: evalResult.status
    };
  });

  const p1Tasks = [];
  p1Skills.forEach((sk, idx) => {
    const tid = `t_p1_sk_${idx}`;
    const isDone = completedTaskIds.has(tid) || sk.status === 'MASTERED';
    p1Tasks.push({
      taskId: tid,
      title: sk.status === 'GAP' ? `Add ${sk.name} to Skills Matrix` : `Upgrade ${sk.name} to ${sk.targetLevel}`,
      type: 'SKILL',
      description: `Establish baseline proficiency in ${sk.name} for ${careerGoal}.`,
      fulfilled: isDone,
      completedAt: isDone ? new Date() : null,
      actionView: 'skills',
      actionText: sk.status === 'GAP' ? `[ADD ${sk.name.toUpperCase()} SKILL]` : `[UPDATE PROFICIENCY]`,
      xpReward: 100,
      skillName: sk.name
    });
  });

  const p1ProjTaskFulfilled = completedTaskIds.has('t_p1_proj') || userProjects.length >= 1;
  p1Tasks.push({
    taskId: 't_p1_proj',
    title: 'Deploy Initial Engineering Project Artifact',
    type: 'PROJECT',
    description: 'Create at least 1 project demonstrating foundation technologies.',
    fulfilled: p1ProjTaskFulfilled,
    completedAt: p1ProjTaskFulfilled ? new Date() : null,
    actionView: 'projects',
    actionText: '[CREATE PROJECT]',
    xpReward: 150
  });

  const p1CompletedTasks = p1Tasks.filter(t => t.fulfilled).length;
  const p1Progress = Math.round((p1CompletedTasks / p1Tasks.length) * 100);
  const p1Status = p1Progress === 100 ? 'COMPLETED' : (p1CompletedTasks > 0 ? 'IN_PROGRESS' : 'AVAILABLE');

  rawPhases.push({
    phaseId: 'phase_01',
    phaseNumber: 1,
    title: 'STRENGTHEN FOUNDATIONS & PREREQUISITES',
    category: 'FOUNDATION',
    description: `Establish core prerequisite competencies required before building complex ${careerGoal} models or systems.`,
    whyThisPhaseMatters: 'Foundational skills form the bedrock of your career profile. High alignment candidate profiles have 100% verified baseline coverage.',
    status: p1Status,
    progress: p1Progress,
    estimatedEffort: '1-2 weeks',
    careerImpact: {
      level: 'CRITICAL',
      alignmentDelta: '+8.0% Alignment Potential',
      summary: 'Eliminates foundation skill gaps and satisfies core recruiter search queries.'
    },
    dependencies: [],
    skills: p1Skills,
    tasks: p1Tasks,
    projects: template.projects.slice(0, 1),
    evidenceRequirements: [
      { label: `Verified proficiency in ${p1Skills.map(s=>s.name).join(' & ')}`, fulfilled: p1Skills.every(s => s.status === 'MASTERED' || s.status === 'CLAIMED_EVIDENCE_NEEDED'), evidenceType: 'SKILL_MATRIX' },
      { label: 'At least 1 technical project artifact deployed', fulfilled: userProjects.length >= 1, evidenceType: 'PROJECT_ARTIFACT' }
    ]
  });

  // ----------------------------------------------------
  // PHASE 2: CORE TECHNICAL & DOMAIN MASTERY
  // ----------------------------------------------------
  const coreSkillsDef = (careerPath && careerPath.requiredSkills ? careerPath.requiredSkills.slice(2, 6) : null) || template.core;
  const p2Skills = coreSkillsDef.map(s => {
    const name = s.name || s;
    const targetLevel = s.minLevel || s.targetLevel || 'ADVANCED';
    const evalResult = evaluateSkillStatus(name, targetLevel);
    return {
      name,
      targetLevel,
      currentLevel: evalResult.currentLevel,
      status: evalResult.status
    };
  });

  const p2Tasks = [];
  p2Skills.forEach((sk, idx) => {
    const tid = `t_p2_sk_${idx}`;
    const isDone = completedTaskIds.has(tid) || sk.status === 'MASTERED';
    p2Tasks.push({
      taskId: tid,
      title: sk.status === 'GAP' ? `Master ${sk.name}` : `Strengthen ${sk.name} Proficiency`,
      type: 'SKILL',
      description: `Target ${sk.targetLevel} level in ${sk.name} for ${careerGoal} standards.`,
      fulfilled: isDone,
      completedAt: isDone ? new Date() : null,
      actionView: 'skills',
      actionText: sk.status === 'GAP' ? `[ADD ${sk.name.toUpperCase()}]` : `[UPDATE ${sk.name.toUpperCase()}]`,
      xpReward: 150,
      skillName: sk.name
    });
  });

  const p2LearnFulfilled = completedTaskIds.has('t_p2_learn') || userLearning.length >= 1;
  p2Tasks.push({
    taskId: 't_p2_learn',
    title: 'Enroll in Domain Upskilling Track',
    type: 'LEARNING',
    description: `Complete a structured learning module covering ${p2Skills[0] ? p2Skills[0].name : 'core technologies'}.`,
    fulfilled: p2LearnFulfilled,
    completedAt: p2LearnFulfilled ? new Date() : null,
    actionView: 'learning',
    actionText: '[ENROLL LEARNING MODULE]',
    xpReward: 150
  });

  const p2CompletedTasks = p2Tasks.filter(t => t.fulfilled).length;
  const p2Progress = Math.round((p2CompletedTasks / p2Tasks.length) * 100);

  let p2Status = 'LOCKED';
  if (p1Status === 'COMPLETED') {
    p2Status = p2Progress === 100 ? 'COMPLETED' : (p2CompletedTasks > 0 ? 'IN_PROGRESS' : 'AVAILABLE');
  } else if (p2CompletedTasks > 0) {
    p2Status = 'IN_PROGRESS';
  } else {
    p2Status = 'LOCKED';
  }

  rawPhases.push({
    phaseId: 'phase_02',
    phaseNumber: 2,
    title: 'CORE TECHNICAL & DOMAIN MASTERY',
    category: 'MACHINE_LEARNING',
    description: `Develop main domain technical capabilities that define high-performing ${careerGoal} professionals.`,
    whyThisPhaseMatters: 'Core domain mastery accounts for over 40% of the weighted KRICS career alignment algorithm.',
    status: p2Status,
    progress: p2Progress,
    estimatedEffort: '2-3 weeks',
    careerImpact: {
      level: 'HIGH',
      alignmentDelta: '+12.5% Alignment Potential',
      summary: 'Drives primary technical score up and unlocks advanced engineering assignments.'
    },
    dependencies: ['phase_01'],
    skills: p2Skills,
    tasks: p2Tasks,
    projects: template.projects.slice(1, 2),
    evidenceRequirements: [
      { label: `Verified proficiency in ${p2Skills.map(s=>s.name).slice(0, 2).join(' & ')}`, fulfilled: p2Skills.slice(0, 2).every(s => s.status === 'MASTERED' || s.status === 'CLAIMED_EVIDENCE_NEEDED'), evidenceType: 'SKILL_MATRIX' },
      { label: 'Active learning module enrollment', fulfilled: userLearning.length >= 1, evidenceType: 'LEARNING_MODULE' }
    ]
  });

  // ----------------------------------------------------
  // PHASE 3: ENGINEERING PROJECT EVIDENCE
  // ----------------------------------------------------
  const p3Tasks = [];
  const p3Proj1Fulfilled = completedTaskIds.has('t_p3_proj_1') || userProjects.length >= 1;
  const p3Proj2Fulfilled = completedTaskIds.has('t_p3_proj_2') || userProjects.length >= 2;

  p3Tasks.push({
    taskId: 't_p3_proj_1',
    title: `Build Flagship ${careerGoal} Project`,
    type: 'PROJECT',
    description: `Deploy a production-ready project incorporating ${p2Skills[0] ? p2Skills[0].name : 'domain skills'}.`,
    fulfilled: p3Proj1Fulfilled,
    completedAt: p3Proj1Fulfilled ? new Date() : null,
    actionView: 'projects',
    actionText: '[DEPLOY FLAGSHIP PROJECT]',
    xpReward: 250
  });

  p3Tasks.push({
    taskId: 't_p3_proj_2',
    title: 'Tag Project with Required Technologies',
    type: 'EVIDENCE',
    description: 'Ensure project artifacts are tagged with tech stack tags to generate synapse links.',
    fulfilled: p3Proj2Fulfilled,
    completedAt: p3Proj2Fulfilled ? new Date() : null,
    actionView: 'projects',
    actionText: '[TAG TECHNOLOGIES]',
    xpReward: 150
  });

  const p3CompletedTasks = p3Tasks.filter(t => t.fulfilled).length;
  const p3Progress = Math.round((p3CompletedTasks / p3Tasks.length) * 100);

  let p3Status = 'LOCKED';
  if (p2Status === 'COMPLETED' || p2Status === 'IN_PROGRESS') {
    p3Status = p3Progress === 100 ? 'COMPLETED' : (p3CompletedTasks > 0 ? 'IN_PROGRESS' : 'AVAILABLE');
  } else if (p3CompletedTasks > 0) {
    p3Status = 'IN_PROGRESS';
  }

  rawPhases.push({
    phaseId: 'phase_03',
    phaseNumber: 3,
    title: 'ENGINEERING PROJECT EVIDENCE',
    category: 'PROJECT_EVIDENCE',
    description: `Convert claimed theoretical knowledge into verified proof-of-work engineering projects.`,
    whyThisPhaseMatters: 'Demonstrated project evidence carries 2x weight compared to unverified claimed skills.',
    status: p3Status,
    progress: p3Progress,
    estimatedEffort: '2-4 weeks',
    careerImpact: {
      level: 'HIGH',
      alignmentDelta: '+15.0% Alignment Potential',
      summary: 'Creates verified proof-of-work badges across your 3D KRICS graph topology.'
    },
    dependencies: ['phase_02'],
    skills: p2Skills.slice(0, 2),
    tasks: p3Tasks,
    projects: template.projects,
    evidenceRequirements: [
      { label: 'Deployed 1+ engineering project with tagged technologies', fulfilled: userProjects.length >= 1, evidenceType: 'PROJECT_ARTIFACT' }
    ]
  });

  // ----------------------------------------------------
  // PHASE 4: ADVANCED COMPETENCIES
  // ----------------------------------------------------
  const advSkillsDef = template.advanced;
  const p4Skills = advSkillsDef.map(s => {
    const name = s.name || s;
    const targetLevel = s.targetLevel || 'INTERMEDIATE';
    const evalResult = evaluateSkillStatus(name, targetLevel);
    return {
      name,
      targetLevel,
      currentLevel: evalResult.currentLevel,
      status: evalResult.status
    };
  });

  const p4Tasks = [];
  p4Skills.forEach((sk, idx) => {
    const tid = `t_p4_sk_${idx}`;
    const isDone = completedTaskIds.has(tid) || sk.status === 'MASTERED';
    p4Tasks.push({
      taskId: tid,
      title: `Develop Advanced Competency: ${sk.name}`,
      type: 'SKILL',
      description: `Expand high-level expertise in ${sk.name}.`,
      fulfilled: isDone,
      completedAt: isDone ? new Date() : null,
      actionView: 'skills',
      actionText: `[ADD ${sk.name.toUpperCase()}]`,
      xpReward: 200,
      skillName: sk.name
    });
  });

  const p4CompletedTasks = p4Tasks.filter(t => t.fulfilled).length;
  const p4Progress = Math.round((p4CompletedTasks / p4Tasks.length) * 100);

  let p4Status = 'LOCKED';
  if (p3Status === 'COMPLETED' || p3Status === 'IN_PROGRESS') {
    p4Status = p4Progress === 100 ? 'COMPLETED' : (p4CompletedTasks > 0 ? 'IN_PROGRESS' : 'AVAILABLE');
  } else if (p4CompletedTasks > 0) {
    p4Status = 'IN_PROGRESS';
  }

  rawPhases.push({
    phaseId: 'phase_04',
    phaseNumber: 4,
    title: 'ADVANCED & SPECIALIZED COMPETENCIES',
    category: 'ADVANCED',
    description: `Master modern specialized frameworks and deployment patterns expected of senior candidates.`,
    whyThisPhaseMatters: 'Specialized competencies distinguish top candidate submissions in competitive talent pools.',
    status: p4Status,
    progress: p4Progress,
    estimatedEffort: '3-4 weeks',
    careerImpact: {
      level: 'TRANSFORMATIVE',
      alignmentDelta: '+10.0% Alignment Potential',
      summary: 'Elevates role competency rating to top percentile matches.'
    },
    dependencies: ['phase_03'],
    skills: p4Skills,
    tasks: p4Tasks,
    projects: [],
    evidenceRequirements: [
      { label: `Advanced skill coverage in ${p4Skills.map(s=>s.name).join(', ')}`, fulfilled: p4Skills.every(s=>s.status === 'MASTERED' || s.status === 'CLAIMED_EVIDENCE_NEEDED'), evidenceType: 'SKILL_MATRIX' }
    ]
  });

  // ----------------------------------------------------
  // PHASE 5: CAREER EVIDENCE & PORTFOLIO READINESS
  // ----------------------------------------------------
  const p5Tasks = [];
  const hasGithub = (githubRepos && githubRepos.length > 0) || userProjects.some(p => p.githubUrl || p.githubLink);
  const p5GithubFulfilled = completedTaskIds.has('t_p5_github') || hasGithub;

  p5Tasks.push({
    taskId: 't_p5_github',
    title: 'Connect Verified GitHub Source Code',
    type: 'GITHUB',
    description: 'Link GitHub repository to generate automated proof-of-work badges.',
    fulfilled: p5GithubFulfilled,
    completedAt: p5GithubFulfilled ? new Date() : null,
    actionView: 'github',
    actionText: '[CONNECT GITHUB REPO]',
    xpReward: 300
  });

  const p5CertFulfilled = completedTaskIds.has('t_p5_cert') || userCertifications.length >= 1;
  p5Tasks.push({
    taskId: 't_p5_cert',
    title: 'Add Industry Certification Credential',
    type: 'EVIDENCE',
    description: `Earn or record 1 industry certification verifying ${careerGoal} skills.`,
    fulfilled: p5CertFulfilled,
    completedAt: p5CertFulfilled ? new Date() : null,
    actionView: 'experience',
    actionText: '[ADD CERTIFICATION]',
    xpReward: 250
  });

  const p5AlignFulfilled = completedTaskIds.has('t_p5_align') || (alignmentResult.alignmentScore >= 75);
  p5Tasks.push({
    taskId: 't_p5_align',
    title: 'Achieve 75%+ Overall Career Alignment',
    type: 'EVIDENCE',
    description: 'Reach high-match threshold to trigger 1-click opportunity submissions.',
    fulfilled: p5AlignFulfilled,
    completedAt: p5AlignFulfilled ? new Date() : null,
    actionView: 'roadmap',
    actionText: '[CHECK ALIGNMENT]',
    xpReward: 400
  });

  const p5CompletedTasks = p5Tasks.filter(t => t.fulfilled).length;
  const p5Progress = Math.round((p5CompletedTasks / p5Tasks.length) * 100);

  let p5Status = 'LOCKED';
  if (p4Status === 'COMPLETED' || p4Status === 'IN_PROGRESS' || p3Status === 'COMPLETED') {
    p5Status = p5Progress === 100 ? 'COMPLETED' : (p5CompletedTasks > 0 ? 'IN_PROGRESS' : 'AVAILABLE');
  } else if (p5CompletedTasks > 0) {
    p5Status = 'IN_PROGRESS';
  }

  rawPhases.push({
    phaseId: 'phase_05',
    phaseNumber: 5,
    title: 'CAREER EVIDENCE & PORTFOLIO READINESS',
    category: 'CAREER_READINESS',
    description: 'Finalize verified evidence, link GitHub repositories, and prepare profile for recruiter matching.',
    whyThisPhaseMatters: 'Verified portfolio profiles receive 3.8x higher response rates from hiring managers.',
    status: p5Status,
    progress: p5Progress,
    estimatedEffort: '1-2 weeks',
    careerImpact: {
      level: 'TRANSFORMATIVE',
      alignmentDelta: '100% Verified Candidate Profile',
      summary: 'Unlocks priority placement on KRICS employer recommendation portal.'
    },
    dependencies: ['phase_04'],
    skills: [],
    tasks: p5Tasks,
    projects: [],
    evidenceRequirements: [
      { label: 'Linked GitHub source code evidence', fulfilled: hasGithub, evidenceType: 'GITHUB_REPOS' },
      { label: '75%+ Career Alignment score achieved', fulfilled: alignmentResult.alignmentScore >= 75, evidenceType: 'ALIGNMENT_METRIC' }
    ]
  });

  // Calculate Overall Progress
  const totalPhaseProgressSum = rawPhases.reduce((sum, p) => sum + p.progress, 0);
  const overallProgress = Math.round(totalPhaseProgressSum / rawPhases.length);

  // Save or Update Mongoose Roadmap document
  if (!existingRoadmap) {
    existingRoadmap = new Roadmap({
      user: userId,
      careerGoal,
      alignmentScore: alignmentResult.alignmentScore,
      overallProgress,
      phases: rawPhases,
      generatedAt: new Date(),
      lastRecalculatedAt: new Date()
    });
  } else {
    existingRoadmap.careerGoal = careerGoal;
    existingRoadmap.alignmentScore = alignmentResult.alignmentScore;
    existingRoadmap.overallProgress = overallProgress;
    existingRoadmap.phases = rawPhases;
    existingRoadmap.lastRecalculatedAt = new Date();
  }

  await existingRoadmap.save();
  return existingRoadmap;
};

/**
 * Complete a specific task in the user's roadmap
 */
exports.completeRoadmapTask = async (userId, taskId) => {
  let roadmap = await Roadmap.findOne({ user: userId });
  if (!roadmap) {
    roadmap = await Roadmap.findOne().sort({ updatedAt: -1 });
  }
  if (!roadmap) {
    throw new Error('Roadmap not found for user');
  }

  let targetTask = null;
  let targetPhase = null;

  for (const ph of roadmap.phases) {
    const t = ph.tasks.find(tk => tk.taskId === taskId || (tk._id && tk._id.toString() === taskId));
    if (t) {
      targetTask = t;
      targetPhase = ph;
      break;
    }
  }

  if (!targetTask) {
    throw new Error(`Task ${taskId} not found in roadmap`);
  }

  targetTask.fulfilled = true;
  targetTask.completedAt = new Date();

  // Recalculate phase progress
  const fulfilledCount = targetPhase.tasks.filter(t => t.fulfilled).length;
  targetPhase.progress = Math.round((fulfilledCount / targetPhase.tasks.length) * 100);

  if (targetPhase.progress === 100) {
    targetPhase.status = 'COMPLETED';
    // Unlock next phase if locked
    const nextPhaseIndex = roadmap.phases.findIndex(p => p.phaseId === targetPhase.phaseId) + 1;
    if (nextPhaseIndex < roadmap.phases.length && roadmap.phases[nextPhaseIndex].status === 'LOCKED') {
      roadmap.phases[nextPhaseIndex].status = 'AVAILABLE';
    }
  } else {
    targetPhase.status = 'IN_PROGRESS';
  }

  // Recalculate overall progress
  const totalProgress = roadmap.phases.reduce((acc, p) => acc + p.progress, 0);
  roadmap.overallProgress = Math.round(totalProgress / roadmap.phases.length);
  roadmap.lastRecalculatedAt = new Date();

  await roadmap.save();

  // Trigger recalculation against real database state to preserve consistency
  return exports.buildPersonalizedRoadmap(userId, roadmap.careerGoal, roadmap);
};

/**
 * Get Next Best Action card recommendation
 */
exports.getNextAction = async (userId) => {
  const roadmap = await exports.generateOrGetRoadmap(userId);
  
  // Find highest active phase (first non-completed phase)
  const activePhase = roadmap.phases.find(p => p.status === 'IN_PROGRESS' || p.status === 'AVAILABLE' || p.status === 'READY') || roadmap.phases[0];
  
  // Find first unfulfilled task in active phase
  const nextTask = activePhase ? (activePhase.tasks.find(t => !t.fulfilled) || activePhase.tasks[0]) : null;

  return {
    targetRole: roadmap.careerGoal,
    overallProgress: roadmap.overallProgress,
    alignmentScore: roadmap.alignmentScore,
    activePhaseNumber: activePhase ? activePhase.phaseNumber : 1,
    activePhaseTitle: activePhase ? activePhase.title : 'FOUNDATION',
    nextTask: nextTask ? {
      taskId: nextTask.taskId,
      title: nextTask.title,
      description: nextTask.description,
      actionView: nextTask.actionView,
      actionText: nextTask.actionText,
      xpReward: nextTask.xpReward,
      type: nextTask.type
    } : null,
    estimatedTimeToCompletion: activePhase ? activePhase.estimatedEffort : '1-2 weeks',
    careerImpact: activePhase ? activePhase.careerImpact : {}
  };
};
