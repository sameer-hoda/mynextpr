# Comprehensive Specification for Runna Project Changes

This document provides a detailed, file-by-file specification for the requested changes, merging the analysis from previous documents. Each section includes an analysis of the current code, specific proposed changes with code snippets, dependencies, and a verification plan.

---

## 1. User Flow and Onboarding Logic

### 1.1. Objective

Implement a more intelligent user flow. A user with an existing plan should be directed to the `/plan` page upon visiting the app, while a new user should be guided through the onboarding process.

### 1.2. Current Implementation Analysis

Currently, the application directs all users to the authentication page first, without checking if they are returning users with an existing plan.

- **`plan-my-run/src/pages/Index.tsx`**: This is the entry point for the root URL (`/`). It currently redirects all users to `/auth`.

- **`plan-my-run/src/pages/Auth.tsx`**: This component contains the UI for the login page.

### 1.3. Proposed Changes

I will merge the UI from `Auth.tsx` into `Index.tsx`, making the root of the application the direct entry and login point. This simplifies the user flow by removing the initial redirect.

**1. `plan-my-run/src/pages/Index.tsx`**

- **Change**: This component will be transformed into a "smart" landing page. It will use the `useAuth` hook to check the user's status. If the user is not logged in, it will render the login UI. If the user is logged in, it will check for an existing plan and redirect them to the appropriate page (`/plan` or `/coach-selection`).

**2. `plan-my-run/src/integrations/api/client.ts`**

- **Change**: Add a new method `hasPlan(userId: string)` to check for a plan's existence.

**3. `backend/server.js`**

- **Change**: Add a new, efficient endpoint `GET /api/plans/exists/:userId` to check for a plan without fetching the whole plan.

**4. `plan-my-run/src/App.tsx`**

- **Change**: The route for `/auth` will be removed, as `Index.tsx` now handles this functionality.

### 1.4. Dependencies

- No new external dependencies are required.

### 1.5. Verification Plan

1.  [x] **New User Flow**:
    1.  Clear browser cache and local storage.
    2.  Navigate to `/`.
    3.  **Expected**: See the login page UI (Welcome message and Google button).
    4.  Log in.
    5.  **Expected**: Be redirected to `/coach-selection`.
2.  [x] **Existing User Flow**:
    1.  Log in as a user who already has a generated plan.
    2.  Navigate to `/`.
    3.  **Expected**: See a loading spinner, then be redirected directly to `/plan`.
3.  [x] **API Endpoint Check**:
    1.  Manually query the new backend endpoint `/api/plans/exists/:userId` for a user with a plan.
    2.  **Expected**: Receive `{ "hasPlan": true }`.
    3.  Query for a user without a plan.
    4.  **Expected**: Receive `{ "hasPlan": false }`.

---

## 2. AI Plan Generation and Fallback

### 2.1. Objective

Ensure the AI plan generation is the primary flow, remove the confusing "mock plan" fallback on the frontend, and improve logging for failures.

### 2.2. Current Implementation Analysis

- **`plan-my-run/src/pages/Loading.tsx`**: If the call to `apiClient.generatePlanWithAI(userData)` fails, the `catch` block generates a hardcoded mock plan and saves it to the database. This is problematic because it pollutes the database with mock data and prevents the user from retrying without a full data reset.

  ```typescript
  // plan-my-run/src/pages/Loading.tsx (inside useEffect)
  } catch (aiError) {
    console.error("Error with AI plan generation:", aiError);
    
    // Fallback to mock data generation if AI fails
    toast({
      title: "AI Service Unavailable",
      description: "Using default plan. Please try again later.",
      variant: "default",
    });
    
    // ... code to create and save a mock plan ...
  }
  ```

- **`backend/services/aiService.js`**: The service already has good file-based logging for prompts, responses, and errors in the `temp_data` directory.

### 2.3. Proposed Changes

**1. `plan-my-run/src/pages/Loading.tsx`**

- **Change**: Remove the frontend mock plan generation. On AI failure, inform the user and redirect them to a place where they can try again.

- **Proposed Code (replace the `catch` block):**
  ```typescript
  } catch (aiError) {
    console.error("Error with AI plan generation:", aiError);
    
    // Inform the user and redirect
    toast({
      variant: "destructive",
      title: "Plan Generation Failed",
      description: "There was an error creating your plan. Please try again.",
      duration: 5000,
    });

    // Log the failure for debugging
    // (This could be a call to a logging service in the future)
    console.error("AI_PLAN_GENERATION_FAILED for user:", user?.id, "with profile:", userProfile);

    // Redirect back to the onboarding page to allow the user to retry
    navigate("/onboarding");
  }
  ```

**2. `backend/services/aiService.js`**

- **Change**: Enhance the error logging to be more structured (JSON format) for easier analysis.

- **Proposed Code (update the `catch` block in `generatePlan`):**
  ```javascript
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
  ```
  *Note: I will remove the fallback plan generation from the AI service to ensure failures are propagated to the user.*

### 2.4. Dependencies

- No new external dependencies are required.

### 2.5. Verification Plan

1.  [x] **Success Case**:
    1.  As a new user, complete the onboarding flow.
    2.  **Expected**: The `Loading` page appears, and you are redirected to the `/plan` page with a new, AI-generated plan.
    3.  Verify that prompt and response files are created in `backend/temp_data`.
2.  [x] **Failure Case**:
    1.  In `backend/services/aiService.js`, temporarily modify `generatePlan` to `throw new Error("Forced AI failure for testing");`.
    2.  Restart the backend server.
    3.  As a new user, complete the onboarding flow.
    4.  **Expected**: The `Loading` page appears, then a toast message "Plan Generation Failed" is displayed, and you are redirected back to `/onboarding`.
    5.  Verify that a new `error_...*.json` file is created in `backend/temp_data` with structured error details.

---

## 3. Workout Detail Popup Content

### 3.1. Objective

Ensure the main workout details are always visible in the workout modal, even if the AI response structure varies slightly.

### 3.2. Current Implementation Analysis

- **`plan-my-run/src/components/plan/WorkoutModal.tsx`**: This component renders the workout details. It has separate sections for `warmup`, `main_set`, and `cooldown`.

  ```typescript
  // plan-my-run/src/components/plan/WorkoutModal.tsx
  {workout.main_set && (
    <div>
      <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
        <Flame className="w-3.5 h-3.5 text-primary" />
        Main Set
      </p>
      <div className="text-gray-400 text-xs space-y-0.5">
        {workout.main_set.split('
').map((line, i) => (
          <p key={i} className="leading-relaxed">{line}</p>
        ))}
      </div>
    </div>
  )}
  ```
- The user reports that the main workout text is missing. This implies that `workout.main_set` is sometimes empty or null. The AI-generated `description` field often contains the full details as a fallback.

### 3.3. Proposed Changes

**1. `plan-my-run/src/components/plan/WorkoutModal.tsx`**

- **Change**: Make the rendering logic more robust. If `main_set` is not available, render the `description` field as the primary workout detail.

- **Proposed Code (replace the `main_set` block):**
  ```typescript
  {/* Main Workout Details */}
  {(workout.main_set || workout.description) && (
    <div>
      <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
        <Flame className="w-3.h-3.5 text-primary" />
        {workout.main_set ? 'Main Set' : 'Workout Details'}
      </p>
      <div className="text-gray-400 text-xs space-y-0.5">
        {(workout.main_set || workout.description).split('
').map((line, i) => (
          <p key={i} className="leading-relaxed">{line}</p>
        ))}
      </div>
    </div>
  )}
  ```
  This change prioritizes `main_set` but gracefully falls back to `description`, ensuring something is always displayed.

### 3.4. Dependencies

- No new external dependencies are required.

### 3.5. Verification Plan

1.  [x] Generate a new plan.
2.  [x] Click on several different workout cards on the `/plan` page to open the modal.
3.  [x] **Expected**: For every workout, the main workout instructions should be visible under either a "Main Set" or "Workout Details" heading.
4.  [x] (Optional) If a workout still appears empty, inspect the corresponding `response_...*.txt` file in `backend/temp_data` to confirm that both `main_set` and `description` are missing from the AI output for that workout.

---

## 4. Daily Workout Email Service

### 4.1. Objective

Create a new service to email users their workout for the next day, with scheduling, tracking, and a manual trigger for testing.

### 4.2. Design and Architecture

- **Email Provider**: SendGrid will be used for its reliability, deliverability, and analytics (open/click tracking).
- **Scheduler**: `node-cron` will be used to schedule the daily job on the backend.
- **Email Content**: Emails will be HTML-formatted with a clear, user-friendly design.
- **Tracking**: Enable open and click tracking within the SendGrid account settings. The "View in App" link will be a tracked link.

### 4.3. Proposed Changes

**1. `backend/package.json`**

- **Change**: Add new dependencies.

- **Action**: Run `npm install @sendgrid/mail node-cron`.

**2. `backend/.env`**

- **Change**: Add SendGrid API key and sender email.

- **Proposed additions:**
  ```
  SENDGRID_API_KEY="YOUR_SENDGRID_API_KEY"
  SENDGRID_FROM_EMAIL="coach@runna.app"
  ```

**3. `backend/services/emailService.js` (New File)**

- **Change**: Create a new service for sending emails.

- **Proposed Code:**
  ```javascript
  // backend/services/emailService.js
  const sgMail = require('@sendgrid/mail');

  class EmailService {
    constructor() {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY not set. Email service is disabled.');
        this.enabled = false;
        return;
      }
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.fromEmail = process.env.SENDGRID_FROM_EMAIL;
      this.enabled = true;
    }

    async sendWorkoutEmail(user, workout) {
      if (!this.enabled) return;

      const workoutDate = new Date(workout.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

      const msg = {
        to: user.email, // This assumes the user object has an email property
        from: this.fromEmail,
        subject: `Your Runna Workout for Tomorrow: ${workout.title}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Hi ${user.displayName || 'Runner'},</h2>
            <p>Here is your workout for tomorrow, ${workoutDate}:</p>
            <div style="border: 1px solid #eee; padding: 15px; border-radius: 8px;">
              <h3>${workout.title}</h3>
              <p><strong>Type:</strong> ${workout.type}</p>
              <p><strong>Duration:</strong> ${workout.duration_minutes} min | <strong>Distance:</strong> ${workout.distance_km} km</p>
              <hr>
              <h4>Warm-up</h4>
              <p>${workout.warmup}</p>
              <h4>Main Workout</h4>
              <p>${workout.main_set || workout.description}</p>
              <h4>Cool-down</h4>
              <p>${workout.cooldown}</p>
            </div>
            <a href="http://localhost:8080/plan" style="display: inline-block; margin-top: 20px; padding: 10px 15px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">View in App</a>
          </div>
        `,
      };

      try {
        await sgMail.send(msg);
        console.log(`Workout email sent to ${user.email}`);
      } catch (error) {
        console.error('Error sending email:', error);
        if (error.response) {
          console.error(error.response.body);
        }
      }
    }
  }

  module.exports = new EmailService();
  ```

**4. `backend/server.js`**

- **Change**: Integrate `node-cron` for scheduling and add a manual trigger endpoint.

- **Proposed Code (additions to `server.js`):**
  ```javascript
  // At top of file
  const cron = require('node-cron');
  const emailService = require('./services/emailService');

  // ... inside the db connection callback, after tables are created

  // Schedule daily email job for 8 PM IST (14:30 UTC)
  cron.schedule('30 14 * * *', async () => {
    console.log('Running daily workout email job...');
    if (!emailService.enabled) {
      console.log('Email service is disabled. Skipping job.');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    db.all(`
      SELECT p.display_name, p.email, w.* FROM workouts w
      JOIN profiles p ON w.user_id = p.user_id
      WHERE w.scheduled_date = ?
    `, [tomorrowStr], (err, rows) => {
      if (err) {
        console.error('Error fetching workouts for email job:', err);
        return;
      }
      rows.forEach(row => {
        const user = { displayName: row.display_name, email: row.email };
        emailService.sendWorkoutEmail(user, row);
      });
    });
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Manual trigger endpoint for testing
  app.post('/api/email/send-test-workout', (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!emailService.enabled) {
      return res.status(503).json({ error: 'Email service is not configured.' });
    }

    const user = req.user;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    db.get('SELECT * FROM workouts WHERE user_id = ? AND scheduled_date = ?', [user.id, tomorrowStr], (err, workout) => {
      if (err || !workout) {
        return res.status(404).json({ error: 'No workout found for you for tomorrow.' });
      }
      emailService.sendWorkoutEmail(user, workout);
      res.json({ success: true, message: `Test email sent to ${user.email}` });
    });
  });
  ```
  *Note: This assumes the `profiles` table will have an `email` column. I will need to adjust the Google OAuth strategy in `server.js` to save the user's email to the profile.*

### 4.4. Dependencies

- `@sendgrid/mail`: For sending emails via SendGrid.
- `node-cron`: For scheduling the daily job.

### 4.5. Verification Plan

1.  [x] **Setup**:
    1.  Run `npm install @sendgrid/mail node-cron` in the `backend` directory.
    2.  Add `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` to `.env`.
    3.  Update the Google OAuth callback in `server.js` to store the user's email in the `profiles` table.
2.  [x] **Manual Trigger Test**:
    1.  Log in and generate a plan. Ensure there is a workout for tomorrow.
    2.  Make a `POST` request to `/api/email/send-test-workout`.
    3.  **Expected**: Receive a `200 OK` response.
    4.  Check your email inbox for the workout email. Verify its content and formatting.
3.  [x] **Scheduler Test**:
    1.  In `server.js`, temporarily change the cron schedule to `* * * * *` (every minute) for testing.
    2.  Restart the backend server.
    3.  **Expected**: Within a minute, the console should log "Running daily workout email job...".
    4.  Check your email inbox.
    5.  **Important**: Revert the cron schedule back to `30 14 * * *` after testing.
4.  [x] **Metrics**:
    1.  Log in to your SendGrid account.
    2.  Navigate to the activity feed or statistics.
    3.  **Expected**: See records for the emails sent, and after opening/clicking, see those events registered.
