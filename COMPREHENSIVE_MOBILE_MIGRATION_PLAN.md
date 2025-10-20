# Comprehensive Mobile Migration Plan

This document provides a thorough, step-by-step specification for migrating the Runna web application to a native mobile app, incorporating key native features using Capacitor.

**Out of Scope:** Geolocation features are not included in this plan as per your request.

## Phase 1: Backend Authentication Overhaul (Cookie to JWT)

**Objective:** Transition from a stateful, cookie-based authentication system to a stateless JWT system. This is the most critical prerequisite for a reliable mobile app.

### 1.1. Update Backend API for JWT Issuance

*   **Status:** ✅ Completed
*   **File:** `backend/server.js`
*   **Dependency to Add:** `jsonwebtoken` (✅ Completed)
    *   **Action:** Run `npm install jsonwebtoken` in the `backend` directory.
*   **Proposed Changes:**
    1.  **Add JWT Secret:** Add a `JWT_SECRET` to your `.env` file. This should be a long, random, and private string. (✅ Completed)
    2.  **Modify Google Callback:** In `server.js`, update the `/auth/google/callback` route to disable sessions for the API, create a JWT upon successful login, and redirect to a new frontend callback route with the token. (✅ Completed)
    *   **Example Implementation:**
        ```javascript
        // At the top of server.js
        const jwt = require('jsonwebtoken');

        // Modify the /auth/google/callback route
        app.get('/auth/google/callback',
          passport.authenticate('google', { failureRedirect: '/', session: false }),
          (req, res) => {
            const user = req.user;
            const jwtPayload = { id: user.id, email: user.email, displayName: user.displayName, avatar: user.avatar };
            const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '30d' });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
          }
        );
        ```
*   **Verification:**
    1.  After restarting the backend, log in using the Google flow.
    2.  Confirm the browser redirects to `http://localhost:8080/auth/callback?token=...` and a token is present.
    3.  Use a JWT debugger to inspect the token and verify its contents.

### 1.2. Implement JWT Middleware for API Protection

*   **Status:** ✅ Completed

*   **File:** `backend/server.js`
*   **Proposed Changes:**
    1.  Create a middleware function to verify the JWT from the `Authorization` header.
    2.  Apply this middleware to all routes requiring user authentication.
    *   **Example Implementation:**
        ```javascript
        const protectWithJwt = (req, res, next) => {
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Not authenticated: No token provided' });
          }
          const token = authHeader.split(' ')[1];
          try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
          } catch (error) {
            return res.status(401).json({ error: 'Not authenticated: Invalid token' });
          }
        };

        // Apply to routes, e.g.:
        app.post('/api/generate-plan', aiLimiter, protectWithJwt, async (req, res) => { /* ... */ });
        app.get('/api/workouts/:userId', protectWithJwt, (req, res) => { /* ... */ });
        app.delete('/api/reset-user-data', protectWithJwt, (req, res) => { /* ... */ });
        ```
*   **Verification:**
    1.  Use `curl` or Postman to hit a protected endpoint without the `Authorization` header; expect a 401 error.
    2.  Repeat the request with a valid `Authorization: Bearer <token>` header; expect a 200 success response.

## Phase 2: Frontend Capacitor Integration

### 2.1. Initial Capacitor Setup

*   **Status:** ✅ Completed
*   **Directory:** `plan-my-run/`
*   **Dependencies to Add:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` (✅ Completed)
*   **Actions:**
    1.  Run `npm install @capacitor/core @capacitor/cli` (✅ Completed)
    2.  Run `npx cap init Runna com.runna.app` to create `capacitor.config.ts`. (✅ Completed)
    3.  Modify `capacitor.config.ts` to point to the `dist` directory. (✅ Completed)
    4.  Run `npm install @capacitor/ios @capacitor/android` (✅ Completed)
    5.  Run `npx cap add ios` (⚠️ Failed, requires Xcode)
    6.  Run `npx cap add android` (✅ Completed)

### 2.2. Frontend Authentication & API Client Update

*   **Status:** ✅ Completed
*   **Files:** `plan-my-run/src/App.tsx`, `plan-my-run/src/contexts/AuthContext.tsx`, `plan-my-run/src/integrations/api/client.ts`
*   **Dependencies to Add:** `@capacitor/preferences` (✅ Completed)
    *   **Action:** Run `npm install @capacitor/preferences`
*   **Proposed Changes:**
    1.  **Create `AuthCallback.tsx` Page:** This page will handle the token from the redirect, store it, and then navigate to the main app. (✅ Completed)
    2.  **Add Route:** Add the `/auth/callback` route in `App.tsx`. (✅ Completed)
    3.  **Update `AuthContext.tsx`:** (✅ Completed)
        *   Replace `validateSession` with a new function `loadUserFromToken` that reads from `@capacitor/preferences` (with `localStorage` as a web fallback).
        *   The `signOut` function must now also clear this stored token.
    4.  **Update `apiClient.ts`:** (✅ Completed)
        *   The `request` method must be modified to get the token from storage and inject the `Authorization` header into every API call.
        *   **Crucially, the `API_BASE_URL` must be changed to your absolute backend production URL** (e.g., `https://api.mynextpr.com`). It cannot be a relative path.
*   **Verification:**
    1.  Log in via the web. Check `localStorage` for the `authToken`.
    2.  Ensure API calls in the browser's Network tab contain the `Authorization` header.
    3.  Log out and verify the token is cleared.

### 2.3. Native Feature Implementation

#### A. Haptic Feedback

*   **Objective:** Add tactile feedback for key user interactions.
*   **Dependency to Add:** `@capacitor/haptics`
    *   **Action:** Run `npm install @capacitor/haptics`
*   **Proposed Changes:**
    1.  **Create a `useNativeFeedback` Hook:** Abstract the haptics logic into a reusable hook.
        ```typescript
        // src/hooks/useNativeFeedback.ts
        import { Capacitor } from '@capacitor/core';
        import { Haptics, ImpactStyle } from '@capacitor/haptics';

        export const useNativeFeedback = () => {
          const triggerImpact = (style: ImpactStyle = ImpactStyle.Medium) => {
            if (Capacitor.isNativePlatform()) {
              Haptics.impact({ style });
            }
          };
          return { triggerImpact };
        };
        ```
    2.  **Integrate into Components:** Use the hook in key components.
        *   **File:** `plan-my-run/src/pages/Onboarding.tsx`: Call `triggerImpact()` inside `handleSubmit`.
        *   **File:** `plan-my-run/src/components/plan/WorkoutModal.tsx`: Call `triggerImpact()` inside `handleSave` when a workout is marked complete.
*   **Verification:**
    1.  Run the app on a physical mobile device.
    2.  Complete the onboarding form and generate a plan. Verify the device vibrates upon submission.
    3.  Open a workout, mark it as complete, and save. Verify the device vibrates.

#### B. Push Notifications for Workout Reminders

*   **Objective:** Ask users for permission and send them local notifications to remind them of upcoming workouts.
*   **Dependencies to Add:** `@capacitor/push-notifications`, `@capacitor/local-notifications`
    *   **Action:** Run `npm install @capacitor/push-notifications @capacitor/local-notifications`
*   **Proposed Changes (Frontend):**
    1.  **Add Permission Request:** On the `Plan.tsx` page, add a button or prompt for users to enable notifications.
        ```typescript
        // In Plan.tsx
        import { LocalNotifications } from '@capacitor/local-notifications';

        const requestNotificationPermission = async () => {
          await LocalNotifications.requestPermissions();
        };
        ```
    2.  **Schedule Notifications:** When a plan is first generated or fetched, schedule a local notification for each upcoming workout.
        ```typescript
        // In Plan.tsx, after fetching workouts
        const scheduleNotifications = async (workouts) => {
          await LocalNotifications.cancel({ ids: (await LocalNotifications.getPending()).notifications.map(n => n.id) }); // Clear old notifications
          
          const notifications = workouts
            .filter(w => !w.completed && w.scheduledDate > new Date())
            .map(w => ({
              id: w.id, // Use workout ID
              title: `Time for your run: ${w.title}`,
              body: w.description,
              schedule: { at: new Date(w.scheduledDate.getTime() - 8 * 60 * 60 * 1000) }, // e.g., 8 AM on the day of
              smallIcon: 'res://icon', // Assumes you have a notification icon in native resources
            }));

          await LocalNotifications.schedule({ notifications });
        };
        ```
*   **Proposed Changes (Backend):**
    *   The `backend/server.js` already has a `node-cron` job to send *email* reminders. This can be adapted or extended in the future to send *push* notifications via a service like Firebase Cloud Messaging (FCM) for more advanced use cases, but local notifications are a great starting point.
*   **Verification:**
    1.  On a physical device, grant notification permissions.
    2.  Generate a new plan.
    3.  Turn the device's clock forward to just before a scheduled workout.
    4.  Verify that a local notification appears on the device.

### 2.4. Final Touches (UI & Config)

*   **Android Back Button:** In `App.tsx`, use the `@capacitor/app` plugin to handle the back button, integrating it with `react-router-dom`.
*   **Safe Areas:** In `index.html`, add `viewport-fit=cover`. In `index.css`, add `padding` using `env(safe-area-inset-*)` to the `body` or main layout container.
*   **App Icons & Splash Screen:** Run `npx @capacitor/assets generate` to automatically create app icons and splash screens from a single source image. This requires placing `icon.png` and `splash.png` files in an `assets` folder.

This comprehensive plan provides a clear roadmap. I am ready to start implementing Phase 1 when you are.
