// backend/test_ai_service.js
require('dotenv').config();
const AIService = require('./services/aiService');

async function testAIGeneration() {
  console.log('--- Starting AI Generation Test ---');

  let aiService;
  try {
    aiService = new AIService();
    console.log('AI Service initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize AI Service:', error.message);
    return;
  }

  const userData = {
    goal_distance: '10K',
    goal_time: '55:30',
    fitness_level: 'Intermediate',
    age: '35',
    sex: 'unspecified',
    coach_persona: 'daniels',
    user_id: 'test_user_123'
  };

  console.log('--- Calling generatePlan with static data ---');
  console.log('User data:', userData);

  const interval = setInterval(() => {
    console.log('Still waiting for AI response...');
  }, 5000);

  try {
    console.log('Calling aiService.generatePlan...');
    const plan = await aiService.generatePlan(userData);
    clearInterval(interval);
    console.log('--- AI Plan Generated Successfully ---');
    console.log(JSON.stringify(plan, null, 2));
  } catch (error) {
    clearInterval(interval);
    console.error('--- AI Plan Generation Failed ---');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('--- AI Generation Test Finished ---');
}

testAIGeneration();
