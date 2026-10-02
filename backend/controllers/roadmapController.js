const User = require('../models/User');
const { calculateSkillGap } = require('../services/skillGapEngine');

exports.getCareerRoadmap = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const user = await User.findById(userId);
    const gapResult = await calculateSkillGap(userId);

    const highGaps = gapResult.gapAnalysis.filter(g => g.gapPriority === 'HIGH').map(g => g.skillName);
    const mediumGaps = gapResult.gapAnalysis.filter(g => g.gapPriority === 'MEDIUM' || g.gapPriority === 'EVIDENCE_REQUIRED').map(g => g.skillName);
    const skillsYouHave = gapResult.gapAnalysis.filter(g => g.currentScore >= 60 || g.hasProjectEvidence).map(g => ({
      name: g.skillName,
      level: g.currentLevel,
      score: g.currentScore,
      evidence: g.hasProjectEvidence ? 'Demonstrated' : 'Claimed'
    }));
    const skillsToDevelop = gapResult.gapAnalysis.filter(g => g.currentScore < (g.targetScore || 70)).map(g => ({
      name: g.skillName,
      requiredLevel: g.requiredLevel,
      priority: g.gapPriority
    }));

    const recommendedProjects = [
      { title: `${user.careerGoal} Pipeline Architecture`, description: `Build a production-grade pipeline incorporating ${highGaps[0] || 'Python & SQL'}.` },
      { title: `Predictive Intelligence Dashboard`, description: `Implement an end-to-end data analytics dashboard with real-time model evaluation.` },
      { title: `Automated MLOps Service`, description: `Deploy containerized REST API endpoints for automated model inference and telemetry.` }
    ];

    const suggestedLearningSequence = [
      { step: 1, title: `Master Core Foundations`, desc: `Focus on ${skillsToDevelop.map(s=>s.name).slice(0, 2).join(' & ') || 'Advanced Python & SQL'}.` },
      { step: 2, title: `Build Verified Engineering Artifact`, desc: `Deploy 1 full-stack project supporting your target role: ${user.careerGoal}.` },
      { step: 3, title: `Earn Credential & Conduct Mock Interviews`, desc: `Validate skills with 1 industry certification and complete AI Mentor interview prep.` },
      { step: 4, title: `1-Click Opportunity Matching`, desc: `Apply directly to matching internship and job postings via KRICS system.` }
    ];

    const roadmap = [
      {
        month: 'Month 1',
        title: 'Core Foundation & High Gap Resolution',
        focusSkills: highGaps.length > 0 ? highGaps.slice(0, 2) : ['Advanced Python', 'SQL Architecture'],
        targetMilestone: `Complete 1 course track and resolve top skill gap in ${highGaps[0] || 'Machine Learning'}.`,
        status: 'CURRENT_FOCUS'
      },
      {
        month: 'Month 2',
        title: 'Engineering Project Evidence',
        focusSkills: ['PyTorch', 'Data Processing', 'API Integration'],
        targetMilestone: `Build 1 full-stack project supporting your ${user.careerGoal} target role and upload to KRICS.`,
        status: 'UPCOMING'
      },
      {
        month: 'Month 3',
        title: 'Industry Credential & Verification',
        focusSkills: mediumGaps.length > 0 ? mediumGaps : ['Cloud Computing', 'MLOps'],
        targetMilestone: 'Earn 1 professional certification and conduct simulated interview prep.',
        status: 'UPCOMING'
      },
      {
        month: 'Month 4',
        title: 'Opportunity Matching & Applications',
        focusSkills: ['Resume Optimization', 'Technical Interviews'],
        targetMilestone: `Apply to top ${user.careerGoal} internship and full-time job matches on KRICS Opportunities.`,
        status: 'UPCOMING'
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        targetRole: user.careerGoal,
        alignmentScore: gapResult.alignmentScore,
        skillsYouHave,
        skillsToDevelop,
        recommendedProjects,
        suggestedLearningSequence,
        roadmap
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
