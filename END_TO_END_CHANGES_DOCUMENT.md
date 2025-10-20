# End-to-End Changes Document: Runna Project Migration

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
- Maintain existing UI/UX flow and navigation

### 2. `/plan-my-run/src/integrations/api/client.ts`
**Current Behavior**: Provides methods for CRUD operations on profiles, plans, and workouts
**Required Changes**:
- Add new method `generatePlanWithAI(userData)` to call the AI generation endpoint
- The method should accept user profile data and return generated plan

### 3. `/backend/server.js`
**Current Behavior**: Provides REST API endpoints for data CRUD operations
**Required Changes**:
- Add new API endpoint `/api/generate-plan` that handles AI plan generation
- This endpoint should:
  - Accept user profile data (goalDistance, goalTime, fitnessLevel, age, sex, coachPersona)
  - Call the Gemini API (using gemini-2.5-flash model) with appropriate prompts
  - Save the generated plan and workouts to local SQLite database
  - Return the generated plan data to the frontend

### 4. `/plan-my-run/supabase/functions/generate-plan/index.ts`
**Current Behavior**: Uses Lovable AI gateway to call Gemini API and saves directly to Supabase database
**Required Changes**:
- Option A: Modify to return AI-generated plan data without saving to Supabase, for the backend to handle storage to SQLite
- Option B: Remove this Supabase function entirely and implement AI generation directly in the backend server.js
- **Recommendation**: Option B - Move AI logic to backend server.js and remove dependency on Supabase functions

### 5. Environment Variables
**Current**: Both root and backend .env files contain GEMINI_API_KEY
**Required Changes**: 
- Ensure both backend and frontend can access the Gemini API key
- Update VITE environment variables in frontend if needed

## Implementation Strategy

### Phase 1: Backend AI Integration
1. Implement Gemini API integration directly in `/backend/server.js`
2. Add `/api/generate-plan` endpoint
3. Add proper error handling and rate limiting
4. Test API endpoint independently

### Phase 2: Frontend Integration
1. Update `/plan-my-run/src/integrations/api/client.ts` to include AI generation method
2. Modify `/plan-my-run/src/pages/Loading.tsx` to call AI endpoint instead of generating mock data
3. Ensure proper data flow from AI response to SQLite storage
4. Test full flow from frontend to backend to database

### Phase 3: Testing and Validation
1. Verify all data continues to be stored in local SQLite database
2. Verify AI generation uses gemini-2.5-flash model
3. Test complete user flow from onboarding to plan generation
4. Verify data persistence and retrieval work correctly

## Dependencies and Technologies

### Current Dependencies
- Frontend: React, TypeScript, Vite, Supabase JS client
- Backend: Node.js, Express, SQLite3, Passport for auth
- AI: Google Gemini 2.5 Flash model (currently via Lovable gateway)

### Required Dependencies
- Google Generative AI package for Node.js (or direct fetch calls to Gemini API)
- Keep existing SQLite, Express, and React dependencies

## Risk Assessment

### High Risk Items
1. Changing from mock data to actual AI calls could introduce latency issues
2. AI generation failures could break user flow
3. Moving from Supabase functions to backend might lose existing functionality

### Mitigation Strategies
1. Implement proper loading states and timeout handling
2. Keep fallback mock data generation as backup
3. Thorough testing of the new backend AI integration

## Success Criteria

### Functional Requirements
1. All user data (profiles, plans, workouts) stored in local SQLite database
2. Running plan generation powered by Gemini 2.5 Flash model
3. Frontend successfully receives AI-generated plans and stores to local database
4. All existing functionality remains intact

### Non-Functional Requirements
1. Response times for plan generation remain acceptable (under 10 seconds)
2. Error handling for API failures is robust
3. Data integrity is maintained during the transition