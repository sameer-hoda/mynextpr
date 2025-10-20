# Comprehensive End-to-End Changes Document: Runna Project Migration

## Project Overview
The Runna project is a running plan generator that currently stores data in a local SQLite database and uses Supabase functions for AI-based plan generation. The goal is to:
1. Ensure all data is stored in a local SQLite database
2. Change AI generation to use the Gemini API with the gemini-2.5-flash model

## Current State Analysis

### Database Implementation
- **Backend**: Uses SQLite database (runna.db) with sqlite3 Node.js package
- **Tables**: profiles, plans, workouts
- **Frontend**: Communicates with backend via REST API endpoints
- **Current Status**: Already using local SQLite database

### AI Generation Implementation
- **Current Location**: Supabase function at `/supabase/functions/generate-plan/index.ts`
- **Current Model**: google/gemini-2.5-flash via Lovable AI gateway
- **Frontend Flow**: Loading.tsx generates mock data instead of calling AI API
- **Current Status**: AI model is already the target gemini-2.5-flash, but frontend doesn't call it

## Required Changes Overview

### Change 1: Enable AI Plan Generation in Frontend
**Current Issue**: Loading.tsx creates mock workouts instead of calling AI API
**Required Files to Modify**: 
- `/plan-my-run/src/pages/Loading.tsx`
- `/plan-my-run/src/integrations/api/client.ts`

### Change 2: Integrate AI Generation with Local SQLite Database
**Current Issue**: Supabase function saves to Supabase DB, but frontend needs to save to local SQLite
**Required Files to Modify**:
- `/backend/server.js` (may need new API endpoint)
- `/plan-my-run/supabase/functions/generate-plan/index.ts` (modify to return plan data instead of storing to Supabase)
- `/plan-my-run/src/pages/Loading.tsx` (handle response and save to local SQLite via backend)

## Missing Elements Analysis

The original implementation has the following gaps that need to be addressed:

### 1. Input Validation and Sanitization
- User inputs for plan generation need validation before AI processing
- Coach persona selection needs validation against supported values

### 2. Database Schema Compatibility
- AI-generated plans might have different data structure than current schema
- Need to ensure compatibility between generated output and SQLite schema

### 3. Data Migration Strategy
- Handle existing mock data if present
- Migrate from any previous mock structure to AI-generated structure

### 4. Enhanced Error Handling
- Specific HTTP error codes for AI failures
- Retry logic for API calls
- Graceful fallbacks when AI service is unavailable

### 5. Security Considerations
- API key security and rotation
- Rate limiting to prevent abuse
- Input sanitization to prevent prompt injection

### 6. Configuration Management
- Environment-specific settings (development, staging, production)
- API key management across environments
- Feature flags for AI functionality

### 7. Testing Strategy
- Unit tests for AI integration
- Integration tests for API endpoints
- End-to-end tests for complete user flow
- Error scenario testing

### 8. Performance Monitoring
- API usage tracking and cost management
- Response time monitoring
- Error rate tracking
- User experience metrics

### 9. Fallback Mechanisms
- More detailed fallback to mock data
- Offline capability considerations
- Service degradation strategies

### 10. CORS and Security
- Backend API security for AI endpoints
- Proper authentication/authorization for AI calls

### 11. Edit Plan Feature
- The EditPlanModal component exists but is not used
- This could be extended to allow AI-based plan modifications
- Would need an additional AI endpoint for plan edits

### 12. API Cost Management
- Cost control for Gemini API usage
- Usage quotas and limits
- Budget monitoring

### 13. Cache Strategy
- Potential caching of common plan types to reduce API usage
- Plan caching strategies

### 14. Logging and Observability
- Detailed logging for AI interactions
- Debugging and monitoring capabilities
- Usage analytics

### 15. User Experience During AI Processing
- Loading states and progress indicators
- Timeout handling and user feedback
- Estimated completion time communication

## Additional Missing Elements Identified Through Complete Review

### 16. Complete Data Reset Endpoint
- **Issue**: Current ResetData.tsx only clears localStorage, not SQLite data
- **Change Needed**: Add `/api/reset-user-data` endpoint in server.js that deletes all user data from SQLite database (profiles, plans, workouts)

### 17. Data Schema Validation and Mapping
- **Issue**: No validation that AI-generated data matches SQLite schema
- **Change Needed**: 
  - Ensure AI responses have compatible field names and types with SQLite schema
  - Validate workout data has required fields: warmup, main_set, cooldown
  - Validate that data types match column definitions in SQLite

### 18. Component Data Compatibility
- **Issue**: Frontend components expect specific data structure
- **Change Needed**: 
  - Verify AI-generated workout data is compatible with WorkoutModal component
  - Ensure Plan page data transformation works with AI-generated data
  - Confirm all UI components can handle new data structure

### 19. Enhanced Error Handling for Data Structure Issues
- **Issue**: No specific error handling for schema mismatches between AI output and SQLite schema
- **Change Needed**: Add validation and error handling for incompatible data structures before database insertion

### 20. Authentication for New Endpoints
- **Issue**: New AI generation endpoint needs proper authentication
- **Change Needed**: Ensure `/api/generate-plan` endpoint validates user session properly

### 21. Improved Loading States and UX
- **Issue**: Current Loading.tsx has basic loading state
- **Change Needed**: Implement better progress indicators and user feedback during AI generation process

## Detailed Implementation Guide

### Phase 0: Setup and Preparation
1. **Install Required Dependencies**
   - Backend: Google Generative AI package, rate limiting middleware
   - Optional: logging library (winston or pino)
   
   ```bash
   cd backend
   npm install @google/generative-ai express-rate-limit
   ```

2. **Verify Environment Configuration**
   - Confirm GEMINI_API_KEY is set in backend environment
   - Ensure it's not exposed to frontend
   - Set up any new environment variables for rate limiting

### Phase 1: Backend Foundation Setup
3. **Add Input Validation Utilities**
   - Create validation functions for user input data
   - Create sanitization functions to prevent prompt injection
   - Place in a new `/backend/utils/validation.js` file

4. **Add Rate Limiting and Security**
   - Implement rate limiting middleware in server.js
   - Add input sanitization utilities
   - Set up logging configuration

5. **Prepare Database Schema Compatibility**
   - Review existing SQLite schema for compatibility with AI-generated data
   - Add proper validation functions to ensure AI output matches schema
   - Update table creation queries if required

### Phase 2: Enhanced Backend Services
6. **Create Data Validation Service**
   - Create `/backend/services/dataValidation.js`
   - Implement functions to validate AI response structure against SQLite schema
   - Include validation for workout fields: warmup, main_set, cooldown
   - Add validation for plan fields compatibility

7. **Create Reset Data Endpoint**
   - Add `/api/reset-user-data` endpoint in server.js
   - Delete all user data from profiles, plans, and workouts tables
   - Ensure proper authentication validation

### Phase 3: AI Generation Implementation
8. **Remove Supabase Function Dependency**
   - Update the Supabase function to return plan data without storing to Supabase
   - OR Remove the Supabase function entirely
   - Update any references to this function

9. **Create AI Generation Service**
   - Create `/backend/services/aiService.js` 
   - Implement Gemini API integration with gemini-2.5-flash
   - Include proper error handling and timeouts
   - Add input sanitization before sending to AI
   - Add response validation and schema compatibility checks

10. **Create Plan Generation Endpoint**
    - Add `/api/generate-plan` route in `server.js`
    - Validate input data using utility functions
    - Call AI service to generate plan
    - Validate AI response structure against SQLite schema using data validation service
    - Save plan and workouts to SQLite database
    - Return generated plan to frontend
    - Implement proper authentication checks

### Phase 4: Frontend Integration
11. **Update API Client**
    - Add `generatePlanWithAI(userData)` method to `/plan-my-run/src/integrations/api/client.ts`
    - Add `resetUserData()` method for the new reset endpoint
    - Include proper error handling and timeout configurations
    - Add request/response logging for debugging

12. **Update Loading Page**
    - Replace mock data generation in `/plan-my-run/src/pages/Loading.tsx`
    - Call the new AI generation endpoint instead of creating mock data
    - Implement proper loading states and timeout handling
    - Add fallback mechanism to generate mock data if AI fails
    - Add better progress indicators and user feedback
    - Maintain existing UI/UX flow and navigation

### Phase 5: Component Compatibility and Testing
13. **Component Data Structure Verification**
    - Verify AI-generated data is compatible with WorkoutModal component
    - Test Plan page data transformation with AI-generated data
    - Ensure all UI components properly handle new data structure
    - Update any component props that may need adjustment

14. **Enhanced Error Handling**
    - Add retry logic with exponential backoff
    - Implement comprehensive error boundary handling
    - Add user-friendly error messages
    - Create fallback mock data generation with better error handling

### Phase 6: Feature Enhancement
15. **Implement Edit Plan Feature (Optional)**
    - Create new backend endpoint `/api/modify-plan` for plan modifications
    - Update the existing EditPlanModal component to use the AI modification endpoint
    - Implement edit credits/limits to control API usage

### Phase 7: Testing and Validation
16. **Create Unit Tests**
    - Unit tests for AI generation service
    - Unit tests for input validation functions
    - Unit tests for data validation service
    - Unit tests for database operations

17. **Create Integration Tests**
    - Integration tests for AI endpoint
    - Integration tests for data flow from AI to database
    - Integration tests for error scenarios
    - Integration tests for schema compatibility

18. **Create End-to-End Tests**
    - Complete user journey tests
    - Error scenario end-to-end tests
    - Component compatibility tests
    - Performance testing under load

### Phase 8: Monitoring and Production Preparation
19. **Implement Logging and Monitoring**
    - Add detailed logging for AI API calls and responses
    - Set up API usage monitoring
    - Track error rates and performance metrics
    - Add health check endpoints

20. **Cost Management and Optimization**
    - Implement usage quotas and cost monitoring
    - Add caching for common plan types if applicable
    - Set up alerts for cost thresholds

21. **Final Testing and Deployment**
    - Complete comprehensive testing across all scenarios
    - Update documentation
    - Prepare deployment scripts
    - Verify all existing functionality remains intact

## Detailed File-by-File Changes

### 1. `/backend/utils/validation.js` (NEW)
**Purpose**: Create utility functions for input validation and sanitization
**Changes**:
- Add validateUserData() function to validate input fields
- Add sanitizePrompt() function to prevent prompt injection
- Add validateCoachPersona() function to check against supported values

### 2. `/backend/services/dataValidation.js` (NEW)
**Purpose**: Validate AI-generated data against SQLite schema
**Changes**:
- Add validateWorkoutSchema() function to check workout data compatibility
- Add validatePlanSchema() function to check plan data compatibility
- Add validateWorkoutFields() function to ensure required AI fields exist

### 3. `/backend/services/aiService.js` (NEW)
**Purpose**: Handle all AI interactions and processing
**Changes**:
- Implement Gemini API integration with gemini-2.5-flash model
- Add error handling for API failures and timeouts
- Include input sanitization before sending to AI
- Add response validation and schema compatibility checks
- Include proper authentication verification

### 4. `/backend/server.js`
**Current Behavior**: Provides REST API endpoints for data CRUD operations
**Required Changes**:
- Add rate limiting middleware
- Add input validation and sanitization utilities
- Add new API endpoint `/api/reset-user-data` to delete all user data
- Add new API endpoint `/api/generate-plan` that handles AI plan generation
- This endpoint should:
  - Validate user session/authentication
  - Accept user profile data (goalDistance, goalTime, fitnessLevel, age, sex, coachPersona)
  - Validate input data format and range using utilities
  - Sanitize inputs to prevent prompt injection
  - Call the AI service (using gemini-2.5-flash model) with appropriate prompts
  - Validate AI response structure against SQLite schema using data validation service
  - Handle AI API errors and timeouts gracefully
  - Save the generated plan and workouts to local SQLite database
  - Return the generated plan data to the frontend
  - Implement rate limiting to control API usage costs
  - Add proper logging for monitoring and debugging

### 5. `/plan-my-run/src/integrations/api/client.ts`
**Current Behavior**: Provides methods for CRUD operations on profiles, plans, and workouts
**Required Changes**:
- Add new method `generatePlanWithAI(userData)` to call the AI generation endpoint
- Add new method `resetUserData()` to call the reset endpoint
- The methods should accept user profile data and return generated plan
- Implement proper error handling and timeout mechanisms
- Add request/response logging for debugging

### 6. `/plan-my-run/src/pages/Loading.tsx`
**Current Behavior**: Generates mock workout data and saves to local SQLite via backend API
**Required Changes**:
- Replace mock data generation with API call to AI generation endpoint
- Handle AI response and save the generated plan to local SQLite database
- Add error handling for AI generation failures
- Implement proper loading states and timeout handling
- Add fallback mechanism to mock data if AI fails
- Add better progress indicators and user feedback during AI processing
- Maintain existing UI/UX flow and navigation

### 7. `/plan-my-run/src/pages/ResetData.tsx`
**Current Behavior**: Only clears localStorage data
**Required Changes**:
- Call backend API endpoint to reset SQLite data instead of just localStorage
- Reset both local storage and backend SQLite user data
- Improve user feedback during reset process

### 8. `/plan-my-run/src/components/plan/EditPlanModal.tsx`
**Current Behavior**: Exists but is not used anywhere in the application
**Required Changes**:
- Connect to backend `/api/modify-plan` endpoint
- Allow users to request plan modifications via AI
- Implement edit credit/limit system to control API usage
- Add proper validation and error handling

### 9. Environment Variables
**Current**: Both root and backend .env files contain GEMINI_API_KEY
**Required Changes**: 
- Ensure backend-only API key access (don't expose in frontend)
- Add any new variables for rate limiting, usage tracking, etc.

## Implementation Strategy

### Phase 1: Backend Foundation (Tasks 1-5)
- Set up dependencies and environment
- Create validation/sanitization utilities  
- Implement security measures (rate limiting)
- Prepare database schema compatibility

### Phase 2: Enhanced Services (Tasks 6-7)
- Create data validation services
- Create reset data endpoint

### Phase 3: AI Integration (Tasks 8-10)
- Create AI service layer
- Implement AI generation endpoint
- Test backend functionality independently

### Phase 4: Frontend Integration (Tasks 11-12)
- Update API client with new endpoint
- Modify loading page to use AI instead of mock data

### Phase 5: Component Compatibility (Tasks 13-14)
- Verify component compatibility with AI data
- Add comprehensive error handling

### Phase 6: Enhancement (Task 15)
- Implement edit plan feature (optional)

### Phase 7: Quality Assurance (Tasks 16-18)
- Create and run comprehensive test suites
- Validate functionality across all scenarios

### Phase 8: Productionization (Tasks 19-21)
- Set up monitoring and cost controls
- Complete final testing and deployment

## Dependencies and Technologies

### Current Dependencies
- Frontend: React, TypeScript, Vite, Supabase JS client
- Backend: Node.js, Express, SQLite3, Passport for auth
- AI: Google Gemini 2.5 Flash model (currently via Lovable gateway)

### Required Dependencies
- Google Generative AI package for Node.js
- Rate limiting middleware (express-rate-limit)
- Logging library (optional: winston or pino)
- Keep existing SQLite, Express, and React dependencies

## Risk Assessment

### High Risk Items
1. Changing from mock data to actual AI calls could introduce latency issues
2. AI generation failures could break user flow
3. Moving from Supabase functions to backend might lose existing functionality
4. Potential increase in operational costs from AI API usage
5. Security vulnerabilities from prompt injection
6. Data structure mismatches between AI output and SQLite schema
7. Incomplete user data reset functionality

### Mitigation Strategies
1. Implement proper loading states, timeout handling, and progress indicators
2. Keep fallback mock data generation as backup
3. Thorough testing of the new backend AI integration
4. Implement rate limiting and usage monitoring
5. Input sanitization and validation to prevent prompt injection
6. Comprehensive data validation between AI responses and database schema
7. Test all UI components with AI-generated data
8. Comprehensive error handling and graceful degradation

## Success Criteria

### Functional Requirements
1. All user data (profiles, plans, workouts) stored in local SQLite database
2. Running plan generation powered by Gemini 2.5 Flash model
3. Frontend successfully receives AI-generated plans and stores to local database
4. All existing functionality remains intact
5. Edit plan functionality (if implemented) works with AI
6. Complete data reset removes all user data from SQLite database
7. All UI components properly display AI-generated plan data

### Non-Functional Requirements
1. Response times for plan generation remain acceptable (under 30 seconds)
2. Error handling for API failures is robust
3. Data integrity is maintained during the transition
4. API costs are controlled and monitored
5. Security measures prevent abuse and injection attacks
6. All data structures are validated before database insertion
7. Complete user experience with proper loading states and feedback