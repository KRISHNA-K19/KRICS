const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');
const skillController = require('../controllers/skillController');
const projectController = require('../controllers/projectController');
const experienceController = require('../controllers/experienceController');
const certificationController = require('../controllers/certificationController');
const educationController = require('../controllers/educationController');
const learningController = require('../controllers/learningController');
const careerController = require('../controllers/careerController');
const skillGapController = require('../controllers/skillGapController');
const networkController = require('../controllers/networkController');
const opportunityController = require('../controllers/opportunityController');
const resumeController = require('../controllers/resumeController');
const analyticsController = require('../controllers/analyticsController');
const notificationController = require('../controllers/notificationController');
const searchController = require('../controllers/searchController');
const intelligenceController = require('../controllers/intelligenceController');
const dashboardController = require('../controllers/dashboardController');
const onboardingController = require('../controllers/onboardingController');
const aiController = require('../controllers/aiController');
const githubController = require('../controllers/githubController');
const roadmapController = require('../controllers/roadmapController');
const questController = require('../controllers/questController');
const shareController = require('../controllers/shareController');

// 1. Auth Endpoints
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', protect, authController.getMe);

// 2. Onboarding
router.post('/onboarding/submit', protect, onboardingController.submitOnboarding);

// 3. Profile
router.get('/profile', protect, profileController.getProfile);
router.put('/profile', protect, profileController.updateProfile);

// 4. Skills
router.get('/skills', protect, skillController.getSkills);
router.post('/skills', protect, skillController.addSkill);
router.put('/skills/:id', protect, skillController.updateSkill);
router.delete('/skills/:id', protect, skillController.deleteSkill);

// 5. Projects & GitHub Auto-Import
router.get('/projects', protect, projectController.getProjects);
router.post('/projects', protect, projectController.addProject);
router.put('/projects/:id', protect, projectController.updateProject);
router.delete('/projects/:id', protect, projectController.deleteProject);
router.post('/github/import', protect, githubController.importGitHubRepositories);

// 6. Experience
router.get('/experience', protect, experienceController.getExperiences);
router.post('/experience', protect, experienceController.addExperience);
router.put('/experience/:id', protect, experienceController.updateExperience);
router.delete('/experience/:id', protect, experienceController.deleteExperience);

// 7. Certifications
router.get('/certifications', protect, certificationController.getCertifications);
router.post('/certifications', protect, certificationController.addCertification);
router.put('/certifications/:id', protect, certificationController.updateCertification);
router.delete('/certifications/:id', protect, certificationController.deleteCertification);

// 8. Education
router.get('/education', protect, educationController.getEducation);
router.post('/education', protect, educationController.addEducation);
router.put('/education/:id', protect, educationController.updateEducation);
router.delete('/education/:id', protect, educationController.deleteEducation);

// 9. Learning
router.get('/learning', protect, learningController.getLearning);
router.post('/learning', protect, learningController.addLearning);
router.put('/learning/:id', protect, learningController.updateLearning);
router.delete('/learning/:id', protect, learningController.deleteLearning);

// 10. Career Paths, Target Goal & Roadmap
router.get('/career-paths', protect, careerController.getCareerPaths);
router.put('/career-goal', protect, careerController.setCareerGoal);
router.get('/roadmap', protect, roadmapController.getCareerRoadmap);

// 11. Skill Gap Engine
router.get('/skill-gap', protect, skillGapController.getSkillGap);

// 12. My KRICS Topology Graph
router.get('/network', protect, networkController.getNetworkGraph);

// 13. Opportunities Matching & 1-Click Apply
router.get('/opportunities', protect, opportunityController.getOpportunities);
router.post('/opportunities/apply', protect, opportunityController.applyToOpportunity);

// 14. Quests & Level Progression
router.get('/quests', protect, questController.getQuests);
router.post('/quests/verify', protect, questController.verifyMission);
router.post('/quests/claim', protect, questController.claimMission);
router.get('/quests/xp-journey', protect, questController.getXpJourney);

// 15. Shareable Public Identity & QR Code
router.get('/share/generate-link', protect, shareController.generateShareLink);
router.get('/share/public-profile/:token', shareController.getPublicProfile);

// 16. Resume Builder Data
router.get('/resume', protect, resumeController.getResumeData);

// 17. Analytics & Event Telemetry
router.get('/analytics', protect, analyticsController.getAnalytics);

// 18. Notifications
router.get('/notifications', protect, notificationController.getNotifications);
router.put('/notifications/read', protect, notificationController.markRead);

// 19. AI & Intelligence Engines
router.get('/search', protect, searchController.globalSearch);
router.get('/intelligence', protect, intelligenceController.getIntelligence);
router.get('/career-alignment', protect, intelligenceController.getCareerAlignment);
router.get('/career-dna', protect, intelligenceController.getCareerDna);
router.get('/career-momentum', protect, intelligenceController.getCareerMomentum);
router.get('/next-action', protect, intelligenceController.getNextAction);
router.post('/what-if', protect, intelligenceController.runWhatIfSimulation);

// AI Career Coach
router.get('/ai/coach', protect, aiController.getCareerCoachingAdvice);
router.post('/ai/chat', protect, aiController.handleContextualChat);
router.get('/ai/resume-summary', protect, aiController.generateResumeSummary);
router.get('/ai/interview-prep', protect, aiController.generateInterviewPrep);

// Dashboard
router.get('/dashboard', protect, dashboardController.getDashboardData);

module.exports = router;
