// backend/services/dataValidation.js

/**
 * Validates workout data against SQLite schema
 * @param {Object} workout - The workout data to validate
 * @returns {Object} Result with isValid boolean and errors array
 */
function validateWorkoutSchema(workout) {
  const errors = [];
  
  // Required fields for workouts
  if (!workout.user_id) {
    errors.push("user_id is required");
  }
  
  if (!workout.day && workout.day !== 0) {
    errors.push("day is required");
  }
  
  if (!workout.title) {
    errors.push("title is required");
  }
  
  if (!workout.type) {
    errors.push("type is required");
  }
  
  if (!workout.description) {
    errors.push("description is required");
  }
  
  // Validate data types for optional fields
  if (workout.completed !== undefined && typeof workout.completed !== 'boolean' && workout.completed !== 0 && workout.completed !== 1) {
    errors.push("completed must be boolean (true/false) or 0/1");
  }
  
  if (workout.duration_minutes !== undefined && workout.duration_minutes !== null && typeof workout.duration_minutes !== 'number') {
    errors.push("duration_minutes must be a number");
  }
  
  if (workout.distance_km !== undefined && workout.distance_km !== null && typeof workout.distance_km !== 'number') {
    errors.push("distance_km must be a number");
  }
  
  if (workout.rating !== undefined && workout.rating !== null && (typeof workout.rating !== 'number' || workout.rating < 1 || workout.rating > 5)) {
    errors.push("rating must be a number between 1 and 5");
  }
  
  // Validate data types for warmup/main_set/cooldown fields
  if (workout.warmup !== undefined && workout.warmup !== null && typeof workout.warmup !== 'string') {
    errors.push("warmup must be a string");
  }
  
  if (workout.main_set !== undefined && workout.main_set !== null && typeof workout.main_set !== 'string') {
    errors.push("main_set must be a string");
  }
  
  if (workout.cooldown !== undefined && workout.cooldown !== null && typeof workout.cooldown !== 'string') {
    errors.push("cooldown must be a string");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates plan data against SQLite schema
 * @param {Object} plan - The plan data to validate
 * @returns {Object} Result with isValid boolean and errors array
 */
function validatePlanSchema(plan) {
  const errors = [];
  
  // Required fields for plans
  if (!plan.user_id) {
    errors.push("user_id is required");
  }
  
  if (!plan.coach_persona) {
    errors.push("coach_persona is required");
  }
  
  if (!plan.age) {
    errors.push("age is required");
  }
  
  if (!plan.sex) {
    errors.push("sex is required");
  }
  
  if (!plan.fitness_level) {
    errors.push("fitness_level is required");
  }
  
  if (!plan.goal_distance) {
    errors.push("goal_distance is required");
  }
  
  // Validate data types for optional fields
  if (plan.goal_time !== undefined && plan.goal_time !== null && typeof plan.goal_time !== 'string') {
    errors.push("goal_time must be a string");
  }
  
  if (plan.plan_overview !== undefined && plan.plan_overview !== null && typeof plan.plan_overview !== 'string') {
    errors.push("plan_overview must be a string");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that AI-generated workout data includes all required fields
 * @param {Object} workout - The AI-generated workout data to validate
 * @returns {Object} Result with isValid boolean and errors array
 */
function validateWorkoutFields(workout) {
  const errors = [];
  
  // Check for required fields that should be populated by AI
  if (!workout.title || typeof workout.title !== 'string' || workout.title.trim().length === 0) {
    errors.push("title is required and must be a non-empty string");
  }
  
  if (!workout.type || typeof workout.type !== 'string' || workout.type.trim().length === 0) {
    errors.push("type is required and must be a non-empty string");
  }
  
  if (!workout.description || typeof workout.description !== 'string' || workout.description.trim().length === 0) {
    errors.push("description is required and must be a non-empty string");
  }
  
  // Check for warmup/main_set/cooldown fields which are important for the UI
  if (workout.warmup === undefined || workout.warmup === null) {
    // It's acceptable for these to be null if not applicable, but they should exist
    workout.warmup = null;
  } else if (typeof workout.warmup !== 'string') {
    errors.push("warmup must be a string or null");
  }
  
  if (workout.main_set === undefined || workout.main_set === null) {
    workout.main_set = null;
  } else if (typeof workout.main_set !== 'string') {
    errors.push("main_set must be a string or null");
  }
  
  if (workout.cooldown === undefined || workout.cooldown === null) {
    workout.cooldown = null;
  } else if (typeof workout.cooldown !== 'string') {
    errors.push("cooldown must be a string or null");
  }
  
  // Validate that day is a number
  if (workout.day === undefined || workout.day === null) {
    errors.push("day is required");
  } else if (typeof workout.day !== 'number') {
    errors.push("day must be a number");
  }
  
  // Validate user_id exists and is a string
  if (!workout.user_id || typeof workout.user_id !== 'string') {
    errors.push("user_id is required and must be a string");
  }
  
  // Validate duration and distance if provided
  if (workout.duration_minutes !== undefined && workout.duration_minutes !== null && typeof workout.duration_minutes !== 'number') {
    errors.push("duration_minutes must be a number");
  }
  
  if (workout.distance_km !== undefined && workout.distance_km !== null && typeof workout.distance_km !== 'number') {
    errors.push("distance_km must be a number");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateWorkoutSchema,
  validatePlanSchema,
  validateWorkoutFields
};