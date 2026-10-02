const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');

exports.calculateCareerDna = async (userId) => {
  const skills = await Skill.find({ user: userId });
  const projects = await Project.find({ user: userId });
  const experiences = await Experience.find({ user: userId });

  const textCorpus = [
    ...skills.map(s => `${s.name} ${s.category}`),
    ...projects.map(p => `${p.name} ${p.desc} ${(p.techs||[]).join(' ')}`),
    ...experiences.map(e => `${e.title} ${e.company} ${e.desc} ${(e.skills||[]).join(' ')}`)
  ].join(' ').toLowerCase();

  const calculateDimensionScore = (keywords, baseScore = 40) => {
    let matches = 0;
    keywords.forEach(kw => {
      if (textCorpus.includes(kw.toLowerCase())) matches++;
    });
    const score = Math.min(baseScore + (matches * 15), 98);
    return Math.max(score, 30);
  };

  const dimensions = {
    Technical: calculateDimensionScore(['python', 'react', 'node', 'sql', 'javascript', 'code', 'developer'], 65),
    Analytical: calculateDimensionScore(['statistics', 'analytics', 'data', 'math', 'pandas', 'numpy', 'sql'], 60),
    Development: calculateDimensionScore(['react', 'frontend', 'full stack', 'web', 'api', 'backend', 'node'], 58),
    'AI/ML': calculateDimensionScore(['machine learning', 'pytorch', 'ai', 'deep learning', 'neural', 'model'], 50),
    Data: calculateDimensionScore(['sql', 'database', 'bigquery', 'data', 'pandas', 'postgres', 'mongo'], 62),
    Cloud: calculateDimensionScore(['docker', 'kubernetes', 'aws', 'azure', 'cloud', 'deployment'], 42),
    Research: calculateDimensionScore(['research', 'paper', 'iit', 'thesis', 'publication', 'model'], 40),
    Leadership: calculateDimensionScore(['lead', 'lead architect', 'management', 'coordinator', 'head'], 45),
    Communication: calculateDimensionScore(['presentation', 'documentation', 'report', 'client', 'lead'], 50)
  };

  return {
    userId,
    dimensions,
    primaryArchetype: Object.keys(dimensions).reduce((a, b) => dimensions[a] > dimensions[b] ? a : b),
    generatedAt: new Date()
  };
};
