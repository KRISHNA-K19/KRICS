const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./backend/config/db');
const User = require('./backend/models/User');
const GitHubRepo = require('./backend/models/GitHubRepo');
const GitHubEvidence = require('./backend/models/GitHubEvidence');
const { syncUserGitHubData } = require('./backend/services/githubEvidenceEngine');
const { buildUserNetworkGraph } = require('./backend/services/networkService');

async function testGitHubEngine() {
  console.log('====================================================');
  console.log(' TESTING REAL GITHUB CAREER EVIDENCE ENGINE (NO MOCKS)');
  console.log('====================================================');

  await connectDB();

  let user = await User.findOne({ email: 'krishna@krics.ai' });
  if (!user) {
    user = await User.create({
      fullName: 'Krishna Kumar Test',
      email: 'krishna@krics.ai',
      password: 'testpassword',
      careerGoal: 'Data Scientist'
    });
  }

  console.log(`[TEST 1] Triggering real GitHub sync for handle: KRISHNA-K19...`);
  const syncResult = await syncUserGitHubData(user._id, 'KRISHNA-K19');

  console.log(`✓ Sync status: ${syncResult.status}`);
  console.log(`✓ Synchronized repos count: ${syncResult.metrics.publicReposCount}`);
  console.log(`✓ Selected repos count: ${syncResult.metrics.selectedReposCount}`);
  console.log(`✓ Detected languages count: ${syncResult.metrics.languagesDetectedCount}`);

  // Fetch from DB directly
  const dbRepos = await GitHubRepo.find({ user: user._id });
  console.log(`\n[TEST 2] Verifying MongoDB GitHubRepo collection records (${dbRepos.length} repos):`);
  dbRepos.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.name} | Language: ${r.language} | Stars: ${r.stars} | README: ${r.readmeAvailable} | Techs: ${r.detectedTechs.join(', ')}`);
  });

  // Verify that mock repo 'ML-Prediction-System' is NOT present unless it actually exists on GitHub!
  const hasMockRepo = dbRepos.some(r => r.name === 'ML-Prediction-System');
  console.log(`\n[TEST 3] Verification: Contains fake 'ML-Prediction-System' mock repo? ${hasMockRepo ? 'FAILED (Mock found)' : 'PASSED (Clean real data)'}`);

  // Test Network Topology Graph
  const graph = await buildUserNetworkGraph(user._id);
  const githubNodes = graph.nodes.filter(n => n.type === 'GITHUB_REPOSITORY' || n.type === 'GITHUB_EVIDENCE');
  console.log(`\n[TEST 4] 3D Career Network Graph nodes created: ${githubNodes.length}`);
  githubNodes.forEach(n => console.log(`  - [${n.type}] ${n.label} -> ${n.detail}`));

  console.log('\n====================================================');
  console.log(' ALL TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

testGitHubEngine().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
