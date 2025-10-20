// backend/utils/validation.js

/**
 * Validates user input data for plan generation
 * @param {Object} userData - The user profile data
 * @returns {Object} Result with isValid boolean and error message if invalid
 */
function validateUserData(userData) {
  const errors = [];
  
  // Validate required fields - using snake_case field names that match frontend
  if (!userData.goal_distance) {
    errors.push("goal_distance is required");
  }
  
  if (!userData.goal_time && !userData.goal_distance) {
    errors.push("Either goal_time or goal_distance is required");
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
  
  // Validate coach persona (if provided)
  if (userData.coach_persona) {
    const isValid = validateCoachPersona(userData.coach_persona);
    if (!isValid.isValid) {
      errors.push(isValid.error);
    }
  }
  
  // Validate fitness level - support both original and transformed values
  const validFitnessLevels = ['Beginner', 'Intermediate', 'Advanced', 'Beginner (5K)', 'Intermediate (5K)', 'Advanced (5K)', 'Beginner (10K)', 'Intermediate (10K)', 'Advanced (10K)', 'Beginner (Half Marathon)', 'Intermediate (Half Marathon)', 'Advanced (Half Marathon)', 'Beginner (Marathon)', 'Intermediate (Marathon)', 'Advanced (Marathon)'];
  // Also support lowercase versions that might come from the form
  const validFitnessLevelsLower = validFitnessLevels.map(level => level.toLowerCase());
  const validFitnessLevelsInput = ['beginner', 'intermediate', 'advanced']; // form input values
  
  if (userData.fitness_level && 
      !validFitnessLevels.includes(userData.fitness_level) && 
      !validFitnessLevelsLower.includes(userData.fitness_level.toLowerCase()) &&
      !validFitnessLevelsInput.includes(userData.fitness_level.toLowerCase())) {
    errors.push(`fitness_level must be one of: ${validFitnessLevels.join(', ')}`);
  }
  
  // Validate sex - updated to include 'unspecified' as acceptable
  const validSexes = ['Male', 'Female', 'Other', 'Prefer not to say', 'unspecified'];
  if (userData.sex && !validSexes.includes(userData.sex)) {
    errors.push(`sex must be one of: ${validSexes.join(', ')}`);
  }
  
  // Validate goal distance
  const validGoalDistances = ['5K', '10K', 'Half Marathon', 'Marathon'];
  if (userData.goal_distance && !validGoalDistances.includes(userData.goal_distance)) {
    errors.push(`goal_distance must be one of: ${validGoalDistances.join(', ')}`);
  }
  
  // Validate age (should be a number between 13 and 100)
  if (userData.age) {
    const age = parseInt(userData.age);
    if (isNaN(age) || age < 13 || age > 100) {
      errors.push("age must be a number between 13 and 100");
    }
  }
  
  // Validate goal time (if provided, should be in format HH:MM:SS or MM:SS)
  if (userData.goal_time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$|^([0-9]|[1-5][0-9]):[0-5][0-9]$/;
    if (!timeRegex.test(userData.goal_time)) {
      errors.push("goal_time must be in format HH:MM:SS or MM:SS");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Sanitizes user input to prevent prompt injection
 * @param {string} prompt - The user input to sanitize
 * @returns {string} Sanitized prompt
 */
function sanitizePrompt(prompt) {
  if (typeof prompt !== 'string') {
    return '';
  }
  
  // Remove potentially malicious characters/sequences
  let sanitized = prompt
    // Remove newlines that could break prompt structure
    .replace(/[\r\n]+/g, ' ')
    // Remove potential prompt injection attempts
    .replace(/<\|.*?\|>/g, '')
    .replace(/\{\{.*?\}\}/g, '')
    .replace(/\[.*?\]/g, '')
    // Remove backticks that might affect code blocks
    .replace(/`/g, '')
    // Remove angle brackets that might be used for injection
    .replace(/<.*?>/g, '')
    // Trim whitespace
    .trim();
  
  // Limit length to prevent abuse
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }
  
  return sanitized;
}

/**
 * Validates coach persona against supported personas
 * @param {string} coachPersona - The coach persona to validate
 * @returns {Object} Result with isValid boolean and error message if invalid
 */
function validateCoachPersona(coachPersona) {
  const validPersonas = [
    'Balanced', 'Motivational', 'Scientific', 'Strict', 'Laid-back', 
    'Experienced', 'Personalized', 'Supportive', 'Data-driven', 'Goal-focused'
  ];
  
  if (!coachPersona) {
    return {
      isValid: false,
      error: "coach_persona is required"
    };
  }
  
  if (!validPersonas.includes(coachPersona)) {
    // Check if it's one of the coach selection IDs
    const validCoachSelections = ['daniels', 'maffetone', 'run-less'];
    if (validCoachSelections.includes(coachPersona)) {
      // Map the coach selection to an acceptable persona
      return {
        isValid: true,
        error: null
      };
    }
    
    return {
      isValid: false,
      error: `coach_persona must be one of: ${validPersonas.join(', ')}`
    };
  }
  
  return {
    isValid: true,
    error: null
  };
}

module.exports = {
  validateUserData,
  sanitizePrompt,
  validateCoachPersona
};