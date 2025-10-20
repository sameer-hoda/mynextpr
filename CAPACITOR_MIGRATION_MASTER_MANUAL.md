# Capacitor Migration Master Manual for Runna

This document serves as the definitive master guide for converting the Runna React web application into native mobile apps for iOS and Android using Capacitor. It synthesizes all previous plans, specifications, and audits into a single, actionable manual.

## Table of Contents

1.  [**Phase 0: Critical Backend & Security Prerequisites**](#phase-0-critical-backend--security-prerequisites)
    1.1. [Transition from Cookies to JWT Authentication](#11-transition-from-cookies-to-jwt-authentication)
    1.2. [Implement JWT Verification Middleware](#12-implement-jwt-verification-middleware)
    1.3. [Configure Environment-Specific Variables](#13-configure-environment-specific-variables)
2.  [**Phase 1: Capacitor Project Setup**](#phase-1-capacitor-project-setup)
    2.1. [Install Capacitor Dependencies](#21-install-capacitor-dependencies)
    2.2. [Initialize Capacitor and Add Platforms](#22-initialize-capacitor-and-add-platforms)
3.  [**Phase 2: Frontend Authentication & API Client Updates**](#phase-2-frontend-authentication--api-client-updates)
    3.1. [Handle Token-Based Authentication](#31-handle-token-based-authentication)
    3.2. [Update API Client for JWT](#32-update-api-client-for-jwt)
4.  [**Phase 3: Essential Native Feature Implementation**](#phase-3-essential-native-feature-implementation)
    4.1. [Haptic Feedback](#41-haptic-feedback)
    4.2. [Local Notifications for Workout Reminders](#42-local-notifications-for-workout-reminders)
5.  [**Phase 4: Mobile UI/UX Enhancements**](#phase-4-mobile-uiux-enhancements)
    5.1. [Adapt UI for Mobile "Safe Areas"](#51-adapt-ui-for-mobile-safe-areas)
    5.2. [Handle Android's Native Back Button](#52-handle-androids-native-back-button)
6.  [**Phase 5: App Store Assets & Final Touches**](#phase-5-app-store-assets--final-touches)
    6.1. [Generate App Icons and Splash Screens](#61-generate-app-icons-and-splash-screens)
7.  [**Deployment & Build Workflow**](#deployment--build-workflow)

---

## Phase 0: Critical Backend & Security Prerequisites

**Objective:** Overhaul the backend from a stateful, cookie-based system to a stateless JWT system suitable for mobile applications. This is the most critical step.

### 1.1. Transition from Cookies to JWT Authentication

*   **Status: ✅ Completed**
*   **File:** `backend/server.js`
*   **Dependency:** `jsonwebtoken` (Run `npm install jsonwebtoken` in `backend`)
*   **Action:** Modify the `/auth/google/callback` route. Instead of creating a server session, it must generate a JWT and redirect to a new frontend callback route (`/auth/callback`) with the token in the URL parameters.

    ```javascript
    // backend/server.js
    const jwt = require('jsonwebtoken');

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

### 1.2. Implement JWT Verification Middleware

*   **Status: ✅ Completed**
*   **File:** `backend/server.js`
*   **Action:** Create a middleware function to protect API routes. This function will verify the JWT sent in the `Authorization: Bearer <token>` header. Apply this middleware to all routes that require user authentication.

    ```javascript
    // backend/server.js
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

    // Example of applying middleware to a route
    app.post('/api/generate-plan', aiLimiter, protectWithJwt, async (req, res) => { /* ... */ });
    ```

### 1.3. Configure Environment-Specific Variables

*   **Status: ✅ Completed**
*   **File:** `backend/.env`
*   **Action:** Add a `JWT_SECRET` with a long, random string. Also, ensure your `FRONTEND_URL` and `GOOGLE_CALLBACK_URL` are managed via environment variables to support development and production environments.

    ```env
    # backend/.env
    JWT_SECRET="your-very-long-random-secret-string-here"
    FRONTEND_URL="http://localhost:8080"
    GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"
    ```

---

## Phase 1: Capacitor Project Setup

**Objective:** Integrate the Capacitor toolchain into the frontend project.

*   **Directory:** `plan-my-run/`

### 2.1. Install Capacitor Dependencies

*   **Status: ✅ Completed**

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
```

### 2.2. Initialize Capacitor and Add Platforms

*   **Status: ✅ Completed**

1.  **Initialize:**
    ```bash
    npx cap init "Runna" "com.runna.app"
    ```
2.  **Configure:** Edit the generated `capacitor.config.ts` to point to your web build directory.
    ```typescript
    // capacitor.config.ts
    import { CapacitorConfig } from '@capacitor/core';

    const config: CapacitorConfig = {
      appId: 'com.runna.app',
      appName: 'Runna',
      webDir: 'dist', // Correct build output directory
      server: {
        androidScheme: 'https'
      }
    };

    export default config;
    ```
3.  **Add Platforms:**
    ```bash
    npx cap add android
    npx cap add ios
    ```

---

## Phase 2: Frontend Authentication & API Client Updates

**Objective:** Adapt the frontend to handle the new JWT-based authentication flow.

### 3.1. Handle Token-Based Authentication

*   **Status: ✅ Completed**
*   **Files:** `plan-my-run/src/App.tsx`, `plan-my-run/src/contexts/AuthContext.tsx`
*   **Dependency:** `@capacitor/preferences` (Run `npm install @capacitor/preferences`)
*   **Actions:**
    1.  **Create an Auth Callback Page:** Create a new page component at `/auth/callback`. This page's sole purpose is to grab the token from the URL, save it to secure storage, and redirect the user.
    2.  **Update `AuthContext`:** Modify the context to load the user's state from the token stored in `@capacitor/preferences` (with a `localStorage` fallback for web). The `signOut` function must also clear this token.

### 3.2. Update API Client for JWT

*   **Status: ✅ Completed**
*   **File:** `plan-my-run/src/integrations/api/client.ts`
*   **Action:** Modify the core `request` method in your API client. Before sending any request, it must retrieve the stored JWT and add it to the `Authorization` header.
*   **CRITICAL:** The `API_BASE_URL` must be an absolute URL pointing to your deployed backend (e.g., `https://api.mynextpr.com`), not a relative path. This should be managed via environment variables (`.env.local`, `.env.production`).

---

## Phase 3: Essential Native Feature Implementation

**Objective:** Enhance the app with core native mobile functionalities.

### 4.1. Haptic Feedback

*   **Status: ✅ Completed**
*   **Dependency:** `@capacitor/haptics` (Run `npm install @capacitor/haptics`)
*   **Action:** Create a reusable hook `useNativeFeedback.ts` to abstract haptics calls. Use this hook to trigger feedback on key user interactions like form submissions or completing a workout.

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

### 4.2. Local Notifications for Workout Reminders

*   **Status: ✅ Completed**
*   **Dependency:** `@capacitor/local-notifications` (Run `npm install @capacitor/local-notifications`)
*   **Action:** Create a `notificationService.ts` to manage permissions and scheduling. When a user generates a plan, iterate through the workouts and schedule a local notification for each upcoming run.

    ```typescript
    // src/services/notificationService.ts
    import { LocalNotifications } from '@capacitor/local-notifications';

    // When a plan is generated
    const scheduleNotifications = async (workouts) => {
      // First, clear any old pending notifications
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ ids: pending.notifications.map(n => n.id) });
      }

      // Schedule new notifications
      const notifications = workouts.map(w => ({
        id: w.id,
        title: `Workout Reminder: ${w.title}`,
        body: "Time for your scheduled run!",
        schedule: { at: new Date(w.scheduledDate) }, // Adjust time as needed
      }));

      await LocalNotifications.schedule({ notifications });
    };
    ```

---

## Phase 4: Mobile UI/UX Enhancements

**Objective:** Polish the app to look and feel native on mobile devices.

### 5.1. Adapt UI for Mobile "Safe Areas"

*   **Status: ✅ Completed**
*   **File:** `plan-my-run/index.html`, `plan-my-run/src/index.css`
*   **Action:** To prevent the UI from being obscured by notches or home bars:
    1.  In `index.html`, add `viewport-fit=cover` to the `<meta name="viewport">` tag.
    2.  In your global stylesheet (`index.css`), use CSS environment variables to add padding to your main layout container.

        ```css
        body {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }
        ```

### 5.2. Handle Android's Native Back Button

*   **Status: ✅ Completed**
*   **Dependency:** `@capacitor/app` (Run `npm install @capacitor/app`)
*   **File:** `plan-my-run/src/App.tsx`
*   **Action:** Use the `App` plugin to listen for the `backButton` event. Connect this event to your `react-router-dom` navigation logic to provide an intuitive back navigation experience for Android users.

---

## Phase 5: App Store Assets & Final Touches

### 6.1. Generate App Icons and Splash Screens

*   **Status: ✅ Completed**
*   **Dependency:** `@capacitor/assets` (Run `npm install @capacitor/assets --save-dev`)
*   **Action:**
    1.  Create source images: `assets/icon.png` (1024x1024) and `assets/splash.png` (2732x2732).
    2.  Run the asset generation command:
        ```bash
        npx @capacitor/assets generate
        ```
    This will automatically create all the required icon and splash screen sizes for both iOS and Android.

---

## Deployment & Build Workflow

Your standard development workflow will now be:

1.  **Develop:** Make changes to your React application in the `plan-my-run/src` directory.
2.  **Build:** Run `npm run build` to create a fresh production build of your web app.
3.  **Sync:** Run `npx cap sync` to copy the new web build into your native iOS and Android projects.
4.  **Run:** Open the native projects in their respective IDEs to deploy to devices or simulators:
    *   `npx cap open ios`
    *   `npx cap open android`
