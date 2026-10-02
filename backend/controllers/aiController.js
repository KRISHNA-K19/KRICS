const User = require('../models/User');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const { calculateSkillGap } = require('../services/skillGapEngine');
const { generateNextBestAction } = require('../services/nextActionService');

exports.getCareerCoachingAdvice = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const user = await User.findById(userId);
    const gapResult = await calculateSkillGap(userId);
    const nextAction = await generateNextBestAction(userId);

    const highGaps = gapResult.gapAnalysis.filter(g => g.gapPriority === 'HIGH').map(g => g.skillName);
    const strongSkills = gapResult.gapAnalysis.filter(g => g.currentScore >= 70).map(g => g.skillName);

    const coachingAdvice = {
      greeting: `Hello ${user.fullName || 'Student'}, here is your AI Career Intelligence Breakdown for ${user.careerGoal}.`,
      summary: `Your current profile is ${gapResult.alignmentScore}% aligned with ${user.careerGoal}. You have strong demonstrated evidence in ${strongSkills.join(', ') || 'foundation programming'}.`,
      criticalGaps: highGaps,
      primaryRecommendation: nextAction.primaryNextAction,
      suggestedWeeklyFocus: highGaps.length > 0 ? `Focus 60% of your upskilling time on ${highGaps[0]} and build 1 practical project.` : 'Focus on building portfolio evidence and applying for targeted internships.',
      generatedAt: new Date()
    };

    res.status(200).json({ success: true, data: coachingAdvice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateResumeSummary = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const user = await User.findById(userId);
    const skills = await Skill.find({ user: userId });
    const topSkills = skills.slice(0, 5).map(s => s.name).join(', ');

    const summaryText = `Results-driven ${user.careerGoal} aspirant with demonstrated proficiency in ${topSkills || 'software engineering'}. Experienced in designing scalable technical projects, analyzing complex data structures, and applying modern software development methodologies to solve real-world problems.`;

    res.status(200).json({ success: true, data: { summary: summaryText } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateInterviewPrep = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const user = await User.findById(userId);
    const skills = await Skill.find({ user: userId });
    const skillNames = skills.map(s => s.name);

    const questions = [
      {
        skill: skillNames[0] || 'Python',
        question: `Explain how list comprehensions and generators handle memory differently in ${skillNames[0] || 'Python'}.`,
        difficulty: 'Medium'
      },
      {
        skill: skillNames[1] || 'SQL',
        question: `How do INNER JOIN and LEFT JOIN differ, and when would you use an index to optimize a query?`,
        difficulty: 'Medium'
      },
      {
        skill: user.careerGoal,
        question: `Walk me through your architectural decisions in building your primary engineering project for a ${user.careerGoal} role.`,
        difficulty: 'Hard'
      }
    ];

    res.status(200).json({ success: true, data: { targetRole: user.careerGoal, questions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.handleContextualChat = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const user = await User.findById(userId);
    const { message, currentRoute, selectedNode } = req.body;
    const prompt = (message || '').trim().toLowerCase();

    const gapResult = await calculateSkillGap(userId);
    const nextAction = await generateNextBestAction(userId);
    const skills = await Skill.find({ user: userId });
    const projects = await Project.find({ user: userId });

    const highGaps = gapResult.gapAnalysis.filter(g => g.gapPriority === 'HIGH').map(g => g.skillName);
    const strongSkills = gapResult.gapAnalysis.filter(g => g.currentScore >= 70 || g.hasProjectEvidence).map(g => g.skillName);
    const targetRole = user.careerGoal || 'Data Scientist';
    const alignment = gapResult.alignmentScore;

    let responseText = '';

    if (selectedNode && selectedNode.label) {
      responseText = `📌 **Context Node Breakdown: [${selectedNode.label}] (${selectedNode.category || selectedNode.type})**\n\n` +
        `This ${selectedNode.type} node connects directly to your identity as a **${targetRole}**. ` +
        (selectedNode.detail ? `Details: ${selectedNode.detail}. ` : '') +
        `Strengthening this node increases your weighted career alignment score (currently **${alignment}%**).`;
    } else if (prompt.includes('what should i do next')) {
      const primary = nextAction.primaryNextAction;
      responseText = `⚡ **Next Best Action Guidance for ${targetRole}**:\n\n` +
        `1. **${primary ? primary.title : 'Bridge Critical Skill Gap'}**: ${primary ? primary.why : 'Focus on your top missing skills.'}\n` +
        `2. **Recommended Project**: Build an artifact using ${highGaps[0] || 'Python & SQL'} to create demonstrated evidence.\n` +
        `3. **Current Alignment**: You are currently **${alignment}%** aligned with ${targetRole}.`;
    } else if (prompt.includes('explain my skill gap') || prompt.includes('skill gap')) {
      if (highGaps.length > 0) {
        responseText = `🔍 **Skill Gap Analysis for ${targetRole}**:\n\n` +
          `Your critical skill gaps are: **${highGaps.join(', ')}**.\n\n` +
          `• **Required Proficiency**: Minimum Advanced level for ${targetRole} industry benchmarks.\n` +
          `• **Evidence Status**: Currently missing project/experience backing. Adding 1 project with these technologies will convert them to Demonstrated Evidence and boost alignment by up to +12%.`;
      } else {
        responseText = `🎉 **Skill Gap Analysis**: You have completed the core technical requirements for **${targetRole}**! Focus now on deploying projects and applying for opportunities.`;
      }
    } else if (prompt.includes('why this career') || prompt.includes('why career')) {
      responseText = `🎯 **Career Alignment Rationale for ${targetRole}**:\n\n` +
        `Your profile demonstrates strong alignment (**${alignment}%**) based on your verified foundation in **${strongSkills.join(', ') || 'technical engineering'}**.\n\n` +
        `This role matches your current skillset and provides high market growth potential.`;
    } else if (prompt.includes('strongest evidence') || prompt.includes('evidence')) {
      responseText = `🛡️ **Your Strongest Evidence Synapses**:\n\n` +
        `• **Verified Skills**: ${strongSkills.join(', ') || 'Python, SQL'}\n` +
        `• **Deployed Projects**: ${projects.map(p => p.name || p.title).join(', ') || 'No projects deployed yet.'}\n\n` +
        `Demonstrated skills carry 2x weight in the KRICS career alignment algorithm compared to claimed skills.`;
    } else if (prompt.includes('compare career paths') || prompt.includes('compare')) {
      responseText = `📊 **Career Path Comparison Matrix**:\n\n` +
        `1. **Data Scientist** (Current Goal): 78% Match — Requires Machine Learning, Statistics & SQL.\n` +
        `2. **Machine Learning Engineer**: 72% Match — Requires PyTorch, MLOps & System Architecture.\n` +
        `3. **Data Engineer**: 84% Match — High match based on Python, SQL & Database schema skills.`;
    } else if (prompt.includes('simulate') || prompt.includes('what if')) {
      responseText = `🔮 **What-If Simulation Guide**:\n\n` +
        `Use the "What-If" simulator on your Overview screen to test how acquiring skills like *Deep Learning* or *Docker* immediately shifts your career alignment score!`;
    } else {
      responseText = `🤖 **KRICS AI Mentor Intelligence Response**:\n\n` +
        `Hello ${user.preferredName || user.fullName || 'Architect'}! Based on your active workspace view (**${currentRoute || 'Overview'}**) and your target horizon (**${targetRole}**):\n\n` +
        `• **Career Alignment**: ${alignment}%\n` +
        `• **Top Strong Skills**: ${strongSkills.slice(0, 3).join(', ') || 'Python, SQL'}\n` +
        `• **Key Gaps**: ${highGaps.join(', ') || 'None'}\n\n` +
        `Question Analysis: "${message}"\n` +
        `Advice: Keep building demonstrated project evidence in your top gap areas to accelerate your career progression timeline.`;
    }

    res.status(200).json({
      success: true,
      data: {
        coachingAdvice: responseText,
        targetRole,
        alignment,
        currentRoute
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
