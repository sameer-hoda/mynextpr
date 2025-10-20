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
    const modelName = "gemini-2.5-flash-lite";
    this.model = this.generativeAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16000,
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
      
      const errorLog = {
        timestamp: new Date().toISOString(),
        userId: userData.user_id || 'unknown',
        errorMessage: error.message,
        errorStack: error.stack,
        prompt: this.buildPrompt(userData)
      };
  
      const errorFileName = `error_${Date.now()}_${userData.user_id || 'unknown'}.json`;
      const errorFilePath = path.join(__dirname, '../temp_data', errorFileName);
      fs.writeFileSync(errorFilePath, JSON.stringify(errorLog, null, 2));
      console.log(`Error details saved to: ${errorFilePath}`);
      
      throw error; // Re-throw the error to be handled by the server.js endpoint
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

    return `You are an expert running coach generating a personalized, day-by-day training plan for a runner for 2 weeks. Adhere strictly to all principles and rules provided.

    **1. User Data:**
    - Age: ${age}
    - Sex: ${sex}
    - Fitness Level: ${fitnessLevel}
    - Goal Distance: ${goalDistance}
    - Goal Time: ${goalTime || 'Not specified'}

    **2. Core Philosophy:**
    Your plan MUST be based on the following running philosophy: "${coachPersona}"

    **3. Pace Zone Definitions:**
    Use the following pace zones to define the intensity of each run. You can use the user's goal time to estimate their 5k pace if needed.
    \`\`\`json
    {
      "pace_zones": {
        "zone_1_recovery": {
          "description": "Very easy, conversational",
          "pace_calculation": "5K_pace + 90-120 seconds",
          "rpe": "2-3/10"
        },
        "zone_2_aerobic": {
          "description": "Easy, build aerobic base",
          "pace_calculation": "5K_pace + 60-90 seconds",
          "rpe": "4-5/10"
        },
        "zone_3_tempo": {
          "description": "Comfortably hard, tempo pace",
          "pace_calculation": "5K_pace + 15-30 seconds",
          "rpe": "6-7/10"
        },
        "zone_4_threshold": {
          "description": "Hard, lactate threshold",
          "pace_calculation": "5K_pace + 0-15 seconds",
          "rpe": "7-8/10"
        },
        "zone_5_vo2max": {
          "description": "Very hard, VO2 max pace",
          "pace_calculation": "5K_pace - 5-10 seconds",
          "rpe": "9-10/10"
        }
      }
    }
    \`\`\`

    **4. Output Format & Structure:**
    Provide the output as a single JSON object. This object must have two properties:
    1. "plan_overview": A brief (2-3 sentences) description of the overall training approach.
    2. "workouts": An array of exactly ${numWorkouts} workout objects.

    Each workout object in the "workouts" array MUST have the following structure. Do not add any extra fields.
    \`\`\`json
    {
      "day": "<number>",
      "title": "<string>",
      "type": "<string: one of 'easy_run', 'intervals', 'tempo_run', 'long_run', 'strength', 'cross_train', 'rest'>",
      "description": "<string: A concise 1-2 sentence description of the workout's purpose.>",
      "warmup": "<string>",
      "main_set": "<string>",
      "cooldown": "<string>",
      "duration_minutes": "<number>",
      "distance_km": "<number or null for non-running days>"
    }
    \`\`\`

    **5. Instructions & Rules:**
    - All distances and paces must be specified in kilometers (km) and minutes per kilometer (min/km). Do not use miles.
    - The plan must cover ${numWorkouts} days over 2 weeks.
    - For rest days, set "type" to "rest", and "duration_minutes" and "distance_km" to null.
    - Be specific about paces in the workout details (e.g., "at Zone 3 tempo pace").
    - Ensure the final output is a single, valid JSON object that can be parsed directly.
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

      // Scrub the date from the AI response, if it exists, to ensure we use our own
      delete validatedWorkout.scheduled_date;

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