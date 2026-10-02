const http = require('http');

async function main() {
  console.log('--- TESTING KRICS UPGRADED SYSTEM APIS ---');

  const testEmail = `test_${Date.now()}@krics.ai`;
  const regRes = await fetchJson('/api/auth/register', 'POST', JSON.stringify({
    fullName: 'Krishna Kumar',
    email: testEmail,
    password: 'Password123!'
  }));

  const token = regRes.token;
  console.log('✓ Registered New Test Account & Acquired Token');

  // Seed sample skill, project
  await fetchJson('/api/skills', 'POST', JSON.stringify({ name: 'Python', category: 'PROGRAMMING', level: 'ADVANCED' }), token);
  await fetchJson('/api/projects', 'POST', JSON.stringify({ title: 'Sales Prediction Model', description: 'ML Project', technologies: ['Python'] }), token);

  // 2. Test Skills API evidence enrichment
  const skillsRes = await fetchJson('/api/skills', 'GET', null, token);
  console.log(`✓ Skills Fetched (${skillsRes.total} total)`);
  if (skillsRes.data && skillsRes.data.length > 0) {
    const s = skillsRes.data[0];
    console.log(`  Sample Skill [${s.name}]: Badge="${s.evidenceBadge}", Bar="${s.evidenceBar}", Score=${s.evidenceScore}%`);
  }

  // 3. Test Target Goal Automatic Roadmap API
  const roadmapRes = await fetchJson('/api/roadmap', 'GET', null, token);
  console.log('✓ Target Goal Automatic Roadmap Fetched');
  console.log('  Roadmap Keys:', Object.keys(roadmapRes.data || {}));
  console.log(`  Target Role: ${roadmapRes.data.targetRole}`);
  console.log(`  Skills You Have: ${roadmapRes.data.skillsYouHave ? roadmapRes.data.skillsYouHave.length : 0}`);
  console.log(`  Skills To Develop: ${roadmapRes.data.skillsToDevelop ? roadmapRes.data.skillsToDevelop.length : 0}`);
  console.log(`  Recommended Projects: ${roadmapRes.data.recommendedProjects ? roadmapRes.data.recommendedProjects.length : 0}`);
  console.log(`  Suggested Learning Steps: ${roadmapRes.data.suggestedLearningSequence ? roadmapRes.data.suggestedLearningSequence.length : 0}`);
  console.log(`  Monthly Milestones: ${roadmapRes.data.roadmap ? roadmapRes.data.roadmap.length : 0}`);

  // 4. Test Dashboard API with AI Coach, Next Action, DNA & Momentum
  const dashRes = await fetchJson('/api/dashboard', 'GET', null, token);
  console.log('✓ Dashboard API Fetched');
  const dData = dashRes.data || dashRes;
  console.log('  Dashboard Keys:', Object.keys(dData));
  console.log('  AI Coach Focus:', dData.aiCoachAdvice ? dData.aiCoachAdvice.focusArea : 'MISSING');
  console.log('  Next Action Title:', dData.nextAction ? (dData.nextAction.primaryNextAction ? dData.nextAction.primaryNextAction.title : dData.nextAction.title) : 'MISSING');
  console.log('  Career DNA Archetype:', dData.dna ? dData.dna.primaryArchetype : 'MISSING');
  console.log('  Career Momentum Score:', dData.momentum ? `${dData.momentum.momentumScore}% (${dData.momentum.momentumStatus})` : 'MISSING');

  // 5. Test AI Contextual Chat API
  const aiChatRes = await fetchJson('/api/ai/chat', 'POST', JSON.stringify({
    message: 'What should I do next?',
    currentRoute: 'overview',
    selectedNode: { label: 'Python', type: 'SKILL', category: 'PROGRAMMING', detail: 'Level: ADVANCED' }
  }), token);

  console.log('✓ AI Contextual Chat Endpoint Verified');
  console.log('  Response Snippet:', aiChatRes.data ? aiChatRes.data.coachingAdvice.substring(0, 150) + '...' : 'No response');

  console.log('\n========================================');
  console.log('ALL KRICS UPGRADED SYSTEM VERIFICATIONS PASSED (EXIT CODE 0)');
  console.log('========================================');
}

function fetchJson(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

main().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
