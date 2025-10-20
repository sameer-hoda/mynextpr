// backend/services/aiService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { validateWorkoutFields } = require('./dataValidation');
const fs = require('fs');
const path = require('path');

class AIService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("ERROR: GEMINI_API_KEY is not set in environment variables.");
      throw new Error("GEMINI_API_KEY is required for AI service");
    }
    
    this.generativeAI = new GoogleGenerativeAI(apiKey);
    const modelName = "gemini-2.5-flash";
    this.model = this.generativeAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 65536,
      }
    });
    console.log(`AI Service initialized with model: ${modelName}`);
    console.log('Google AI API endpoint: https://generativelanguage.googleapis.com');
  }

  /**
   * Generates a personalized running plan using AI
   * @param {Object} userData - User profile data
   * @returns {Object} Generated plan with workouts
   */
  async generatePlan(userData) {
    try {
      // Validate user input
      const validation = this.validateAIInput(userData);
      if (!validation.isValid) {
        throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
      }

      // Create the prompt for the AI
      const prompt = this.buildPrompt(userData);
      
      console.log("Sending AI request with prompt:", prompt.substring(0, 100) + "...");
      
      // Save the prompt to a file for debugging
      const promptFileName = `prompt_${Date.now()}_${userData.user_id || 'unknown'}.txt`;
      const promptFilePath = path.join(__dirname, '../temp_data', promptFileName);
      fs.writeFileSync(promptFilePath, prompt);
      console.log(`Prompt saved to: ${promptFilePath}`);
      
      // Call the AI model
      const result = await this.model.generateContent(prompt);
      
      const response = await result.response;
      console.log("AI response object:", response);
      const text = response.text();
      
      // Save the response to a file for debugging
      const responseFileName = `response_${Date.now()}_${userData.user_id || 'unknown'}.txt`;
      const responseFilePath = path.join(__dirname, '../temp_data', responseFileName);
      fs.writeFileSync(responseFilePath, text);
      console.log(`AI response saved to: ${responseFilePath}`);
      
      console.log("AI response received, parsing...");
      
      // Extract JSON from the response
      const planData = this.parseAIResponse(text);
      
      // Validate the AI response structure
      const validatedPlan = this.validateAIResponse(planData, userData);
      
      return validatedPlan;
    } catch (error) {
      console.error("Error in AI service:", error);
      
      // Also save the error to a file for debugging
      const errorFileName = `error_${Date.now()}_${userData.user_id || 'unknown'}.txt`;
      const errorFilePath = path.join(__dirname, '../temp_data', errorFileName);
      fs.writeFileSync(errorFilePath, `Error: ${error.message}\nStack: ${error.stack}\nPrompt: ${this.buildPrompt(userData)}`);
      console.log(`Error details saved to: ${errorFilePath}`);
      
      // Return a fallback plan if AI fails
      if (error.message.includes('timeout') || error.message.includes('API') || error.message.includes('400')) {
        console.warn("AI service failed, returning fallback plan");
        return this.generateFallbackPlan(userData);
      }
      
      throw error;
    }
  }

  /**
   * Validates the AI input data
   * @param {Object} userData - User data to validate
   * @returns {Object} Validation result
   */
  validateAIInput(userData) {
    const errors = [];

    if (!userData.goal_distance) {
      errors.push("goal_distance is required");
    }

    if (!userData.fitness_level) {
      errors.push("fitness_level is required");
    }

    if (!userData.age) {
      errors.push("age is required");
    }

    if (!userData.sex) {
      errors.push("sex is required");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Builds a prompt for the AI model
   * @param {Object} userData - User profile data
   * @returns {string} Formatted prompt
   */
  buildPrompt(userData) {
    const {
      goal_distance: goalDistance,
      goal_time: goalTime,
      fitness_level: fitnessLevel,
      age,
      sex,
      coach_persona: coachPersona = 'Balanced'
    } = userData;

    // Generate a 2-week plan with 6 workouts per week
    const trainingWeeks = 2;
    const numWorkouts = trainingWeeks * 6; // 12 workouts total

    return `
You are a professional running coach. Create a personalized ${goalDistance} training plan for a ${fitnessLevel} runner who is ${age} years old and identifies as ${sex}.
The user is looking for a plan guided by a ${coachPersona} approach.
${goalTime ? `The goal time is ${goalTime}.` : 'No specific goal time was given, focus on building fitness and endurance.'}

The plan should start from tomorrow\'s date. The plan should include ${numWorkouts} varied workouts over the course of the training period. Each workout should include the following fields:
- day: (numeric day in the training sequence)
- title: (descriptive title of the workout)
- type: (one of: easy_run, intervals, tempo_run, long_run, strength, cross_train, rest)
- description: (detailed description of the workout)
- warmup: (specific warmup routine)
- main_set: (detailed main workout set)
- cooldown: (specific cooldown routine)
- duration_minutes: (estimated duration in minutes)
- distance_km: (estimated distance in kilometers)
- scheduled_date: (the scheduled date of the workout in YYYY-MM-DD format, starting from tomorrow)

Return the plan as a JSON array of workout objects, each with the fields mentioned. Include an overall plan overview as well. Format the response as a JSON object with two properties:
1. "plan_overview": A brief description of the overall approach and philosophy
2. "workouts": An array of workout objects with the specified fields

Ensure that the JSON is properly formatted and can be parsed by JSON.parse().
Make sure each workout has all required fields and that the content is appropriate for the runner\'s fitness level.
For rest days, set type to "rest", and set duration_minutes and distance_km to null.
For each workout, be specific about paces (e.g., "easy conversational pace", "at 10K race pace", etc.) and distances for different segments.
`;
  }

  /**
   * Parses the AI response to extract JSON data
   * @param {string} responseText - Raw response from AI
   * @returns {Object} Parsed plan data
   */
  parseAIResponse(responseText) {
    try {
      // Try to find JSON within the response
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const jsonStr = responseText.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonStr);
      }
      
      // If direct JSON parsing fails, look for a more complex pattern
      // This handles cases where the AI might include additional text
      const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/i);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      throw new Error("Could not extract valid JSON from AI response");
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", responseText);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }
  }

  /**
   * Validates the AI response against required schema
   * @param {Object} planData - Raw plan data from AI
   * @param {Object} userData - Original user data for context
   * @returns {Object} Validated plan data
   */
  validateAIResponse(planData, userData) {
    if (!planData) {
      throw new Error("AI returned no data");
    }

    if (!Array.isArray(planData.workouts) && typeof planData.workouts !== 'object') {
      throw new Error("AI response must include a 'workouts' array or object");
    }

    // Normalize workouts to an array if needed
    let workouts = Array.isArray(planData.workouts) ? planData.workouts : [];
    if (!Array.isArray(planData.workouts) && typeof planData.workouts === 'object') {
      // If it's an object with numbered keys, convert to array
      if (Object.keys(planData.workouts).every(key => !isNaN(key))) {
        workouts = Object.values(planData.workouts);
      } else {
        // If it's just a single object, wrap in array
        workouts = [planData.workouts];
      }
    }

    // Validate each workout
    const validatedWorkouts = [];
    for (const [index, workout] of workouts.entries()) {
      if (!workout) {
        console.warn(`Skipping workout at index ${index} because it's null or undefined`);
        continue;
      }

      // Ensure the workout has required user_id
      const validatedWorkout = {
        ...workout,
        user_id: userData.user_id
      };

      const validation = validateWorkoutFields(validatedWorkout);
      if (!validation.isValid) {
        console.warn(`Workout at index ${index} failed validation:`, validation.errors);
        // Skip invalid workouts but continue processing others
        continue;
      }

      validatedWorkouts.push(validatedWorkout);
    }

    if (validatedWorkouts.length === 0) {
      throw new Error("No valid workouts were generated by AI");
    }

    // Create the final validated plan
    const validatedPlan = {
      plan_overview: planData.plan_overview || `Your personalized ${userData.goal_distance} training plan`,
      workouts: validatedWorkouts
    };

    return validatedPlan;
  }

  /**
   * Generates a fallback plan in case AI fails
   * @param {Object} userData - User data
   * @returns {Object} Fallback plan data
   */
  generateFallbackPlan(userData) {
    console.log("Generating fallback plan for:", userData);
    
    // Create a simple fallback plan with basic workouts
    const baseWorkouts = [
      {
        day: 1,
        title: "Easy Recovery Run",
        type: "easy_run",
        description: "Gentle pace to recover from weekend long run. Focus on form and breathing.",
        warmup: "5 min easy jog",
        main_set: "20 min easy pace",
        cooldown: "5 min easy jog",
        duration_minutes: 30,
        distance_km: 5,
        user_id: userData.user_id,
        completed: false,
        rating: null,
        user_notes: null,
        scheduled_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0]
      },
      {
        day: 2,
        title: "Speed Intervals",
        type: "intervals",
        description: "8x400m at 5K pace with 90s recovery. Warm up 10 min, cool down 10 min.",
        warmup: "10 min easy jog",
        main_set: "8x400m at 5K pace with 90s recovery",
        cooldown: "10 min easy jog",
        duration_minutes: 45,
        distance_km: 8,
        user_id: userData.user_id,
        completed: false,
        rating: null,
        user_notes: null,
        scheduled_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
      },
      {
        day: 3,
        title: "Tempo Run",
        type: "tempo_run",
        description: "20 minutes at comfortably hard pace. Should feel like 7-8/10 effort.",
        warmup: "10 min easy jog",
        main_set: "20 min tempo pace",
        cooldown: "10 min easy jog",
        duration_minutes: 40,
        distance_km: 7,
        user_id: userData.user_id,
        completed: false,
        rating: null,
        user_notes: null,
        scheduled_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
      },
      {
        day: 4,
        title: "Easy Morning Run",
        type: "easy_run",
        description: "Conversational pace. If you can't hold a conversation, slow down!",
        warmup: "5 min easy jog",
        main_set: "25 min easy conversational pace",
        cooldown: "5 min easy jog",
        duration_minutes: 35,
        distance_km: 6,
        user_id: userData.user_id,
        completed: false,
        rating: null,
        user_notes: null,
        scheduled_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
      },
      {
        day: 5,
        title: "Hill Repeats",
        type: "strength",
        description: "6x2min uphill at hard effort. Walk/jog down for recovery.",
        warmup: "10 min easy jog",
        main_set: "6x2min hill repeats with walk recovery",
        cooldown: "10 min easy jog",
        duration_minutes: 50,
        distance_km: 8,
        user_id: userData.user_id,
        completed: false,
        rating: null,
        user_notes: null,
        scheduled_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
      },
      {
        day: 6,
        title: "Rest Day",
        type: "rest",
        description: "Active recovery. Light stretching or yoga recommended.",
        warmup: null,
        main_set: "Rest and recovery",
        cooldown: null,
        duration_minutes: null,
        distance_km: null,
        user_id: userData.user_id,
        completed: false,
        rating: null,
        user_notes: null,
        scheduled_date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0]
      },
      {
        day: 7,
        title: "Long Run",
        type: "long_run",
        description: "Build your endurance. Keep it conversational for the first hour.",
        warmup: "10 min easy jog",
        main_set: "50 min long run at easy pace",
        cooldown: "10 min easy jog",
        duration_minutes: 70,
        distance_km: 12,
        user_id: userData.user_id,
        completed: false,
        rating: null,
        user_notes: null,
        scheduled_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      }
    ];

    return {
      plan_overview: `Your personalized ${userData.goal_distance} training plan (fallback)`,
      workouts: baseWorkouts.map(workout => ({ ...workout }))
    };
  }
}

module.exports = AIService;