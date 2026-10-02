const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Certification = require('../models/Certification');
const Learning = require('../models/Learning');

exports.analyzeSkillEvidence = async (userId) => {
  const skills = await Skill.find({ user: userId });
  const projects = await Project.find({ user: userId });
  const experiences = await Experience.find({ user: userId });
  const certifications = await Certification.find({ user: userId });
  const learning = await Learning.find({ user: userId });

  const evidenceMap = {};

  skills.forEach(s => {
    const key = s.name.toLowerCase().trim();

    const matchingProjects = projects.filter(p => 
      (p.techs || []).some(t => t.toLowerCase().trim() === key)
    );

    const matchingExp = experiences.filter(e => 
      (e.skills || []).some(sk => sk.toLowerCase().trim() === key)
    );

    const matchingCerts = certifications.filter(c => 
      (c.skills || []).some(sk => sk.toLowerCase().trim() === key)
    );

    const matchingLearning = learning.filter(l => 
      l.targetSkill && l.targetSkill.toLowerCase().trim() === key
    );

    let score = 20; // base claimed skill
    if (s.level === 'INTERMEDIATE') score = 40;
    else if (s.level === 'ADVANCED') score = 70;
    else if (s.level === 'EXPERT') score = 90;

    score += (matchingProjects.length * 15);
    score += (matchingExp.length * 15);
    score += (matchingCerts.length * 10);
    score += (matchingLearning.length * 10);
    if (score > 100) score = 100;

    let status = 'CLAIMED_ONLY';
    if (score >= 80) status = 'STRONG_EVIDENCE';
    else if (score >= 50) status = 'DEMONSTRATED';
    else if (score >= 30) status = 'DEVELOPING';

    evidenceMap[key] = {
      skillName: s.name,
      level: s.level,
      pct: s.pct,
      evidenceScore: score,
      status,
      projectsCount: matchingProjects.length,
      experienceCount: matchingExp.length,
      certificationsCount: matchingCerts.length,
      learningCount: matchingLearning.length,
      projects: matchingProjects.map(p => p.name),
      experiences: matchingExp.map(e => e.company)
    };
  });

  return evidenceMap;
};
