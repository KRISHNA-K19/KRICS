const ActivityEvent = require('../models/ActivityEvent');

exports.calculateCareerMomentum = async (userId) => {
  const events = await ActivityEvent.find({ user: userId }).sort({ createdAt: -1 });

  let skillsImproved = 0;
  let projectsCompleted = 0;
  let learningCompleted = 0;
  let experienceAdded = 0;
  let certsEarned = 0;

  events.forEach(ev => {
    if (ev.type === 'SKILL_ADDED' || ev.type === 'SKILL_UPDATED') skillsImproved++;
    if (ev.type === 'PROJECT_ADDED' || ev.type === 'PROJECT_COMPLETED') projectsCompleted++;
    if (ev.type === 'LEARNING_COMPLETED' || ev.type === 'LEARNING_STARTED') learningCompleted++;
    if (ev.type === 'EXPERIENCE_ADDED') experienceAdded++;
    if (ev.type === 'CERTIFICATION_ADDED') certsEarned++;
  });

  const momentumScore = Math.min((skillsImproved * 5) + (projectsCompleted * 15) + (learningCompleted * 10) + (experienceAdded * 20) + (certsEarned * 15), 100);

  let momentumStatus = 'STEADY_PROGRESS';
  if (momentumScore >= 75) momentumStatus = 'HIGH_VELOCITY';
  else if (momentumScore >= 45) momentumStatus = 'ACTIVE_GROWTH';

  return {
    userId,
    momentumScore: Math.max(momentumScore, 35),
    momentumStatus,
    activityBreakdown: {
      skillsImproved,
      projectsCompleted,
      learningCompleted,
      experienceAdded,
      certsEarned
    },
    totalActivitiesLogged: events.length,
    evaluatedAt: new Date()
  };
};
