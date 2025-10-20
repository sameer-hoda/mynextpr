# Proposed Changes for Runna Project

This document outlines the analysis and proposed changes for the Runna project based on the user's requests. Each section details the current state, the proposed solution, and a testing plan.

## 1. User Flow and Onboarding

### 1.1. Analysis of Current Flow

- **Authentication**: The app uses a backend with Passport.js for Google OAuth. The frontend `AuthContext.tsx` manages the user's authentication state.
- **Onboarding**: After authentication, the user is redirected to `/coach-selection` and then to `/onboarding` to input their running goals.
- **Plan Generation**: The `Loading.tsx` page is responsible for triggering the plan generation. It checks if a user has existing workouts. If so, it redirects to `/plan`. If not, it calls the `/api/generate-plan` endpoint.
- **Initial Landing**: The current logic in `App.tsx` and `Index.tsx` directs all new users to the `/auth` page. There is no logic to differentiate between a new user and a user with an existing plan upon visiting the root URL.

### 1.2. Proposed Changes

The goal is to create a more intelligent user flow:
- A new user (or a logged-in user without a plan) should be guided through the onboarding process.
- A user who is logged in and has a plan should be taken directly to their plan.

**File Changes:**

1.  **`plan-my-run/src/pages/Index.tsx`**:
    *   Modify this component to act as a router based on the user's auth and plan status.
    *   Use the `useAuth` hook to check for `user` and `loading`.
    *   If `loading` is true, show a loading spinner.
    *   If `user` is null, redirect to `/auth`.
    *   If `user` is present, call a new API endpoint `apiClient.hasPlan(user.id)` to check if a plan exists.
    *   Based on the result, redirect to `/plan` or `/coach-selection`.

2.  **`plan-my-run/src/integrations/api/client.ts`**:
    *   Add a new method `hasPlan(userId: string)` that makes a `GET` request to a new `/api/plans/exists/:userId` endpoint.

3.  **`backend/server.js`**:
    *   Add a new endpoint `GET /api/plans/exists/:userId`.
    *   This endpoint will query the `plans` table and return `{ hasPlan: true }` or `{ hasPlan: false }`.

### 1.3. Testing Plan

- **New User**:
    1.  Clear all application data (local storage, cookies).
    2.  Navigate to the root URL (`/`).
    3.  Verify it redirects to `/auth`.
    4.  Log in.
    5.  Verify it redirects to `/coach-selection`.
- **Existing User with Plan**:
    1.  Log in and generate a plan.
    2.  Log out.
    3.  Log back in.
    4.  Navigate to the root URL (`/`).
    5.  Verify it redirects directly to `/plan`.

---

## 2. AI Plan Generation Flow

### 2.1. Analysis of Current Flow

- **`Loading.tsx`**: This component contains the logic for plan generation.
- **Mock Data**: The documentation mentions mock data, and the code in `Loading.tsx` has a `catch` block that generates a mock plan if the AI call fails.
- **`/reset-data`**: The `ResetData.tsx` component calls the `/api/reset-user-data` endpoint, which clears the user's data from the database, allowing for plan regeneration.
- **Problem**: The user states that a mock plan is generated first, and they must use `/reset-data` to get a real AI plan. Looking at `Loading.tsx`, it first checks for *any* existing workouts. If `existingWorkouts.length > 0`, it redirects to `/plan`. The issue is likely that the "mock plan" is being saved to the database, which then prevents the AI generation from being triggered on subsequent attempts without a reset. The "mock plan" is the fallback in case of an AI error.

### 2.2. Proposed Changes

The goal is to ensure the AI plan is generated on the first attempt and to improve the user experience around failures.

**File Changes:**

1.  **`backend/services/aiService.js`**:
    *   The current implementation already saves prompts, responses, and errors to the `temp_data` directory. This is good for logging. I will enhance this.
    *   I will add a more structured logging format (JSON) to capture user ID, timestamp, and the error message for easier parsing.

2.  **`plan-my-run/src/pages/Loading.tsx`**:
    *   The primary logic seems correct: it attempts to call `apiClient.generatePlanWithAI`. The issue is likely that the fallback "mock plan" is being generated and saved on the first run, possibly due to an error in the AI generation process that is being silently handled.
    *   I will modify the `catch` block for the `generatePlanWithAI` call. Instead of generating and saving a mock plan, it will:
        1.  Display a toast notification from `useToast` informing the user that "AI plan generation failed. Please try again later."
        2.  Redirect the user back to the `/onboarding` page.
    *   Remove the mock plan generation logic from this file. The backend already has a fallback if the AI service is completely down, which is a better approach.

3.  **`backend/server.js`**:
    *   In the `/api/generate-plan` endpoint, enhance the error logging. When an error occurs, log the error along with the `userId` and the request body to a dedicated log file. This will help in debugging why plan generation might be failing.

### 2.3. Testing Plan

- **Successful Generation**:
    1.  Go through the onboarding process.
    2.  Verify that the `Loading` page appears and then redirects to the `Plan` page with a new set of workouts.
    3.  Check the `backend/temp_data` directory to ensure prompt and response files were created.
- **Failed Generation**:
    1.  Temporarily modify `backend/services/aiService.js` to always throw an error.
    2.  Go through the onboarding process.
    3.  Verify that a toast message appears indicating the failure.
    4.  Verify that the user is redirected back to `/onboarding`.
    5.  Check the `backend/temp_data` directory for a new error log file.

---

## 3. Workout Detail Popup

### 3.1. Analysis of Current State

- **`plan-my-run/src/components/plan/WorkoutModal.tsx`**: This component is responsible for displaying the workout details.
- **Data Display**: The modal displays `warmup`, `main_set`, and `cooldown`. It also has a fallback to show `description` if these fields are not present.
- **Problem**: The user reports that the main workout text is not visible. The `main_set` is the field that should contain this. The issue could be either:
    1.  The `main_set` data is not being correctly passed to the `WorkoutModal`.
    2.  The AI is not generating content for the `main_set` field.
    3.  There is a rendering issue in the component.

Upon reviewing `WorkoutModal.tsx`, the rendering logic for `main_set` seems correct. In `Plan.tsx`, when a `WorkoutCard` is clicked, the `selectedWorkout` state is set with the workout data. This data is then passed to `WorkoutModal`. The data transformation in `Plan.tsx` correctly maps `main_set` to `mainSet`.

The most likely cause is that the AI is not returning a `main_set` value, or it's returning it in an unexpected format. The prompt in `aiService.js` explicitly asks for `main_set`. I will check the response logs in `temp_data` to confirm.

### 3.2. Proposed Changes

The fix involves ensuring the data is correctly displayed.

**File Changes:**

1.  **`plan-my-run/src/components/plan/WorkoutModal.tsx`**:
    *   The current code renders `main_set`. I will add a fallback to render the `description` field if `main_set` is empty or null, as the description often contains the full workout details.
    *   I will modify the `Main Set` section to be more robust:
        ```tsx
        {workout.main_set ? (
          <div>
            <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
              Main Set
            </p>
            <div className="text-gray-400 text-xs space-y-0.5">
              {workout.main_set.split('\n').map((line, i) => (
                <p key={i} className="leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        ) : workout.description ? (
          <div>
            <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
              Workout Details
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">{workout.description}</p>
          </div>
        ) : null}
        ```
    *   I noticed the `main_set` is split by `\n`. This is likely to handle newlines from the AI response. This seems correct.

### 3.3. Testing Plan

1.  Generate a new plan.
2.  Click on a workout card on the `Plan` page.
3.  In the modal, verify that the "Main Set" or "Workout Details" section is visible and contains the workout instructions.
4.  If the issue persists, inspect the contents of `backend/temp_data/response_*.txt` to see what the AI is actually returning for `main_set`.

---

## 4. Daily Workout Email Service

### 4.1. Analysis and Design

This is a new feature. It requires a backend service to send emails and a scheduler to trigger them.

**Email Design**:
- **Subject**: Your Runna Workout for Tomorrow: {Workout Title}
- **From**: Runna Coach <coach@runna.app>
- **Body**:
    - Header with Runna logo.
    - "Hi {User Name},"
    - "Here is your workout for tomorrow, {Date}:"
    - **{Workout Title}**
    - **Type**: {Workout Type}
    - **Duration**: {Duration} | **Distance**: {Distance}
    - **Warm-up**: {Warm-up details}
    - **Main Workout**: {Main set details}
    - **Cool-down**: {Cool-down details}
    - A "View in App" button that links to the plan page.
    - Footer with unsubscribe link.

**Service Architecture**:
- **Email Provider**: To avoid spam filters and get metrics, a transactional email service like SendGrid, Mailgun, or Amazon SES is necessary. I'll assume the use of SendGrid for this plan as it has a generous free tier.
- **Scheduler**: A cron job is the standard for scheduled tasks. I'll use a Node.js library like `node-cron`.
- **Manual Trigger**: An API endpoint to trigger the email for a specific user for testing purposes.
- **Metrics**: SendGrid provides open and click tracking automatically if enabled in the account settings.

### 4.2. Proposed Changes

**File Changes:**

1.  **`backend/package.json`**:
    *   Add dependencies: `npm install @sendgrid/mail node-cron`.

2.  **`backend/.env`**:
    *   Add `SENDGRID_API_KEY`.
    *   Add `SENDGRID_FROM_EMAIL`.

3.  **`backend/services/emailService.js` (New File)**:
    *   Create a new service to handle email sending.
    *   It will have a method `sendWorkoutEmail(user, workout)` that constructs the HTML for the email and uses `@sendgrid/mail` to send it.
    *   It will include a placeholder for a template engine if we want to use one later (like EJS or Handlebars).

4.  **`backend/server.js`**:
    *   **Scheduler**:
        *   Import `node-cron`.
        *   Set up a cron job to run every day at 8 PM IST (which is 14:30 UTC). The cron string will be `30 14 * * *`.
        *   The job will:
            1.  Get all users.
            2.  For each user, find the workout scheduled for tomorrow.
            3.  If a workout is found, call `emailService.sendWorkoutEmail`.
    *   **Manual Trigger Endpoint**:
        *   Add a new endpoint `POST /api/email/send-test-workout`.
        *   This endpoint will be authenticated and will send a test email for the logged-in user for tomorrow's workout.

### 4.3. Testing Plan

1.  **Unit Test `emailService.js`**:
    *   Create a test script to call `sendWorkoutEmail` with mock data and verify that it attempts to send an email (can be mocked).
2.  **Integration Test Manual Trigger**:
    *   Start the backend server.
    *   Generate a plan for a test user.
    *   Call the `/api/email/send-test-workout` endpoint.
    *   Check the inbox of the test user's email for the workout email.
    *   Verify the content and formatting of the email.
3.  **Integration Test Scheduler**:
    *   Temporarily change the cron schedule to run every minute (`* * * * *`).
    *   Start the server and wait for the job to run.
    *   Verify that emails are sent for all users with workouts scheduled for tomorrow.
    *   Check the SendGrid dashboard for open/click tracking data.

This comprehensive plan addresses all the user's requests with detailed analysis and actionable steps.
