const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Certification = require('../models/Certification');
const Learning = require('../models/Learning');
const Opportunity = require('../models/Opportunity');

exports.buildUserNetworkGraph = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const skills = await Skill.find({ user: userId });
  const projects = await Project.find({ user: userId });
  const experiences = await Experience.find({ user: userId });
  const certifications = await Certification.find({ user: userId });
  const learning = await Learning.find({ user: userId });
  const opportunities = await Opportunity.find().limit(5);

  const nodes = [];
  const edges = [];

  // Root Node: User
  const rootId = `user_${user._id}`;
  nodes.push({
    id: rootId,
    label: user.fullName || 'YOU',
    type: 'USER',
    category: 'IDENTITY',
    detail: `Target Career: ${user.careerGoal} (${user.alignmentScore}% Aligned)`,
    color: '#8ed5ff',
    size: 28
  });

  // Career Goal Node
  const goalId = `goal_${user.careerGoal.replace(/\s+/g, '_')}`;
  nodes.push({
    id: goalId,
    label: user.careerGoal,
    type: 'CAREER_GOAL',
    category: 'CAREER',
    detail: `Target Role • Alignment Score: ${user.alignmentScore}%`,
    color: '#d2bbff',
    size: 24
  });
  edges.push({ source: rootId, target: goalId, label: 'TARGETS' });

  // Skill Nodes & Edges
  const skillNodeMap = {};
  skills.forEach(s => {
    const skillId = `skill_${s._id}`;
    skillNodeMap[s.name.toLowerCase().trim()] = skillId;
    nodes.push({
      id: skillId,
      label: s.name,
      type: 'SKILL',
      category: 'SKILLS',
      detail: `Proficiency: ${s.level} (${s.pct}%)`,
      color: '#38bdf8',
      size: 18
    });
    edges.push({ source: rootId, target: skillId, label: 'KNOWS' });
  });

  // Project Nodes & Edges
  projects.forEach(p => {
    const projId = `project_${p._id}`;
    nodes.push({
      id: projId,
      label: p.name,
      type: 'PROJECT',
      category: 'PROJECTS',
      detail: `${p.desc || 'Technical Project'} (${p.status})`,
      color: '#54ddfc',
      size: 20
    });
    edges.push({ source: rootId, target: projId, label: 'BUILT' });

    // Link Project to matching Skill nodes
    (p.techs || []).forEach(t => {
      const matchSkillId = skillNodeMap[t.toLowerCase().trim()];
      if (matchSkillId) {
        edges.push({ source: projId, target: matchSkillId, label: 'USES' });
      }
    });

    // Link Project to Target Role
    edges.push({ source: projId, target: goalId, label: 'SUPPORTS' });
  });

  // Experience Nodes & Edges
  experiences.forEach(e => {
    const expId = `exp_${e._id}`;
    nodes.push({
      id: expId,
      label: `${e.title} @ ${e.company}`,
      type: 'EXPERIENCE',
      category: 'EXPERIENCE',
      detail: `${e.type} • ${e.duration}`,
      color: '#c9aeff',
      size: 20
    });
    edges.push({ source: rootId, target: expId, label: 'WORKED_AT' });

    (e.skills || []).forEach(s => {
      const matchSkillId = skillNodeMap[s.toLowerCase().trim()];
      if (matchSkillId) {
        edges.push({ source: expId, target: matchSkillId, label: 'UTILIZED' });
      }
    });
  });

  // Certification Nodes & Edges
  certifications.forEach(c => {
    const certId = `cert_${c._id}`;
    nodes.push({
      id: certId,
      label: c.name,
      type: 'CERTIFICATION',
      category: 'CERTIFICATIONS',
      detail: `Issued by ${c.issuer}`,
      color: '#f472b6',
      size: 16
    });
    edges.push({ source: rootId, target: certId, label: 'EARNED' });
  });

  // Learning Nodes & Edges
  learning.forEach(l => {
    const learnId = `learn_${l._id}`;
    nodes.push({
      id: learnId,
      label: l.title,
      type: 'LEARNING',
      category: 'LEARNING',
      detail: `Progress: ${l.progress}% • ${l.status}`,
      color: '#facc15',
      size: 16
    });
    edges.push({ source: rootId, target: learnId, label: 'LEARNING' });
  });

  // Opportunity Nodes & Edges
  opportunities.forEach(o => {
    const oppId = `opp_${o._id}`;
    nodes.push({
      id: oppId,
      label: o.title,
      type: 'OPPORTUNITY',
      category: 'OPPORTUNITIES',
      detail: `${o.organization} (${o.location})`,
      color: '#34d399',
      size: 18
    });
    edges.push({ source: goalId, target: oppId, label: 'MATCHES_ROLE' });
  });

  // GitHub Evidence Nodes & Edges
  if (user.githubProfile && user.githubProfile.connected) {
    const selected = user.githubProfile.selectedRepos || ['ML-Prediction-System', 'Data-Analysis-Dashboard'];
    selected.forEach((repoName, idx) => {
      const ghId = `github_${idx}_${repoName.replace(/[\s\/-]+/g, '_')}`;
      nodes.push({
        id: ghId,
        label: `GitHub: ${repoName}`,
        type: 'GITHUB_EVIDENCE',
        category: 'EVIDENCE',
        detail: `Verified GitHub Repository Evidence • @${user.githubProfile.username || 'KRISHNA-K19'}`,
        color: '#06b6d4',
        size: 19
      });
      edges.push({ source: rootId, target: ghId, label: 'COMMITTED' });

      // Link GitHub evidence to matching skills
      skills.forEach(s => {
        const sName = s.name.toLowerCase().trim();
        const matchSkillId = skillNodeMap[sName];
        if (matchSkillId && (repoName.toLowerCase().includes(sName) || sName.includes('python') || sName.includes('machine learning') || sName.includes('sql'))) {
          edges.push({ source: ghId, target: matchSkillId, label: 'VERIFIES' });
        }
      });

      // Link GitHub evidence to target career goal
      edges.push({ source: ghId, target: goalId, label: 'PROVES' });
    });
  }

  return {
    nodes,
    edges,
    totalNodes: nodes.length,
    totalEdges: edges.length
  };
};
