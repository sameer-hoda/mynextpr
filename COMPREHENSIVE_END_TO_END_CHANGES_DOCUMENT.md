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

## Detailed File-by-File Changes

### 1. `/plan-my-run/src/pages/Loading.tsx`
**Current Behavior**: Generates mock workout data and saves to local SQLite via backend API
**Required Changes**:
- Replace mock data generation with API call to AI generation endpoint
- Handle AI response and save the generated plan to local SQLite database
- Add error handling for AI generation failures
- Implement proper loading states and timeout handling
- Maintain existing UI/UX flow and navigation
- Add fallback mechanism to mock data if AI fails

### 2. `/plan-my-run/src/integrations/api/client.ts`
**Current Behavior**: Provides methods for CRUD operations on profiles, plans, and workouts
**Required Changes**:
- Add new method `generatePlanWithAI(userData)` to call the AI generation endpoint
- The method should accept user profile data and return generated plan
- Implement proper error handling and timeout mechanisms
- Add request/response logging for debugging

### 3. `/backend/server.js`
**Current Behavior**: Provides REST API endpoints for data CRUD operations
**Required Changes**:
- Add new API endpoint `/api/generate-plan` that handles AI plan generation
- This endpoint should:
  - Accept user profile data (goalDistance, goalTime, fitnessLevel, age, sex, coachPersona)
  - Validate input data format and range
  - Call the Gemini API (using gemini-2.5-flash model) with appropriate prompts
  - Handle AI API errors and timeouts gracefully
  - Save the generated plan and workouts to local SQLite database
  - Return the generated plan data to the frontend
  - Implement rate limiting to control API usage costs
  - Add proper logging for monitoring and debugging

### 4. `/plan-my-run/supabase/functions/generate-plan/index.ts`
**Current Behavior**: Uses Lovable AI gateway to call Gemini API and saves directly to Supabase database
**Required Changes**:
- Option A: Modify to return AI-generated plan data without saving to Supabase, for the backend to handle storage to SQLite
- Option B: Remove this Supabase function entirely and implement AI generation directly in the backend server.js
- **Recommendation**: Option B - Move AI logic to backend server.js and remove dependency on Supabase functions

### 5. Environment Variables
**Current**: Both root and backend .env files contain GEMINI_API_KEY
**Required Changes**: 
- Ensure both backend and frontend can access the necessary configuration
- Consider backend-only API key access (don't expose in frontend)

## Additional Implementation Considerations

### 1. Data Schema Compatibility
- Verify that AI-generated plan structure matches SQLite schema requirements
- Update database schema if needed to accommodate new fields from AI responses
- Handle potential discrepancies between AI output and expected database fields

### 2. Input Validation and Sanitization
- Add validation for user inputs (goalDistance, goalTime, fitnessLevel, age, sex, coachPersona)
- Sanitize inputs to prevent prompt injection attacks
- Validate coachPersona against supported values

### 3. Error Handling and Fallbacks
- Implement retry logic for AI API calls
- Add timeout handling (recommend 30-second limits)
- Provide fallback to mock data generation when AI is unavailable
- Include specific error messages for different failure scenarios

### 4. Security and Performance
- Implement rate limiting to control Gemini API costs
- Secure API key access (backend-only)
- Add input sanitization to prevent malicious prompts
- Consider caching common plan types to reduce API usage

### 5. Testing Strategy
- Unit tests for AI generation endpoint
- Integration tests for data flow from AI to database
- End-to-end tests for complete user journey
- Error scenario testing (API failures, timeouts, etc.)

### 6. Monitoring and Observability
- Add logging for AI API calls and responses
- Monitor API usage and costs
- Track error rates and performance metrics
- Add health checks for AI integration

### 7. Edit Plan Feature Enhancement
- Consider implementing the unused `/plan-my-run/src/components/plan/EditPlanModal.tsx`
- Create new AI endpoint for plan modifications
- Add edit credits/limits to prevent excessive API usage

## Implementation Strategy

### Phase 1: Backend AI Integration
1. Implement Gemini API integration directly in `/backend/server.js`
2. Add input validation and sanitization
3. Add `/api/generate-plan` endpoint
4. Implement rate limiting and error handling
5. Add proper logging and monitoring
6. Test API endpoint independently

### Phase 2: Frontend Integration
1. Update `/plan-my-run/src/integrations/api/client.ts` to include AI generation method
2. Modify `/plan-my-run/src/pages/Loading.tsx` to call AI endpoint instead of generating mock data
3. Implement proper loading states and error handling
4. Ensure proper data flow from AI response to SQLite storage
5. Test full flow from frontend to backend to database

### Phase 3: Additional Features and Testing
1. Consider implementing EditPlanModal for plan modifications
2. Conduct comprehensive testing (unit, integration, end-to-end)
3. Performance testing and optimization
4. Security and validation testing

### Phase 4: Production Preparation
1. Implement environment-specific configurations
2. Set up monitoring and alerting for API usage
3. Add cost control measures
4. Prepare deployment documentation

## Dependencies and Technologies

### Current Dependencies
- Frontend: React, TypeScript, Vite, Supabase JS client
- Backend: Node.js, Express, SQLite3, Passport for auth
- AI: Google Gemini 2.5 Flash model (currently via Lovable gateway)

### Required Dependencies
- Google Generative AI package for Node.js (or direct fetch calls to Gemini API)
- Rate limiting middleware (e.g., express-rate-limit)
- Logging library (e.g., winston or pino)
- Keep existing SQLite, Express, and React dependencies

## Risk Assessment

### High Risk Items
1. Changing from mock data to actual AI calls could introduce latency issues
2. AI generation failures could break user flow
3. Moving from Supabase functions to backend might lose existing functionality
4. Potential increase in operational costs from AI API usage
5. Security vulnerabilities from prompt injection

### Mitigation Strategies
1. Implement proper loading states, timeout handling, and progress indicators
2. Keep fallback mock data generation as backup
3. Thorough testing of the new backend AI integration
4. Implement rate limiting and usage monitoring
5. Input sanitization and validation to prevent prompt injection
6. Comprehensive error handling and graceful degradation

## Success Criteria

### Functional Requirements
1. All user data (profiles, plans, workouts) stored in local SQLite database
2. Running plan generation powered by Gemini 2.5 Flash model
3. Frontend successfully receives AI-generated plans and stores to local database
4. All existing functionality remains intact
5. Edit plan functionality (if implemented) works with AI

### Non-Functional Requirements
1. Response times for plan generation remain acceptable (under 30 seconds)
2. Error handling for API failures is robust
3. Data integrity is maintained during the transition
4. API costs are controlled and monitored
5. Security measures prevent abuse and injection attacks