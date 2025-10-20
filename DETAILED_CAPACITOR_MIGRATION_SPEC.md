# Detailed Capacitor Migration Specification

This document provides a detailed, step-by-step specification for migrating the Runna web application to a native mobile app for iOS and Android using Capacitor.

## Phase 1: Backend Authentication Overhaul (Cookie to JWT)

**Objective:** Transition from a stateful, cookie-based authentication system to a stateless JWT (JSON Web Token) system. This is the most critical prerequisite for a reliable mobile app.

### 1.1. Update Backend API for JWT Issuance

*   **File:** `backend/server.js`
*   **Dependency to Add:** `jsonwebtoken`
    *   **Action:** Run `npm install jsonwebtoken` in the `backend` directory.

*   **Current Code Reference:**
    The current Google OAuth callback in `backend/server.js` completes the passport flow and then redirects, relying on `express-session` to manage the user state.
    ```javascript
    app.get('/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/' }),
      (req, res) => {
        // Successful authentication, redirect to the live frontend URL
        const frontendUrl = process.env.FRONTEND_URL || 'https://mynextpr.com';
        res.redirect(`${frontendUrl}/coach-selection`);
      }
    );
    ```

*   **Proposed Changes:**
    1.  **Modify Google Strategy:** In the `passport.use(new GoogleStrategy(...))` callback, instead of just returning the user profile, prepare the user data for token creation.
    2.  **Generate JWT:** In the `/auth/google/callback` route, after passport successfully authenticates the user, generate a JWT.
    3.  **Redirect with Token:** Redirect the user back to the frontend, but this time with the token in the URL. We will need a dedicated callback page on the frontend to handle this.

    *   **Example Implementation:**
        ```javascript
        // At the top of server.js
        const jwt = require('jsonwebtoken');

        // ... inside startApp() ...

        // Modify the /auth/google/callback route
        app.get('/auth/google/callback',
          passport.authenticate('google', { failureRedirect: '/', session: false }), // Disable sessions for this route
          (req, res) => {
            // User object is attached to req.user by passport
            const user = req.user;
            
            // Create JWT
            const jwtPayload = { id: user.id, email: user.email, displayName: user.displayName };
            const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '30d' });

            // Redirect to a new frontend route that handles the token
            const frontendUrl = process.env.FRONTEND_URL || 'https://mynextpr.com';
            res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
          }
        );
        ```
    4.  **Add a JWT Secret:** Add a `JWT_SECRET` to your `.env` file. This is a long, random string used to sign the tokens.

*   **Verification Steps:**
    1.  After implementing the changes, manually navigate to `/auth/google` in your browser.
    2.  After logging in with Google, verify that the browser is redirected to a URL like `http://localhost:8080/auth/callback?token=...` with a long token string.
    3.  Copy the token and use an online JWT debugger to verify its contents include the correct user ID, email, and name.

### 1.2. Implement JWT Middleware for API Protection

*   **File:** `backend/server.js`
*   **Current Code Reference:** API routes are currently public or protected only by the `express-session` middleware.
*   **Proposed Changes:**
    1.  Create a new middleware function that extracts the JWT from the `Authorization: Bearer <token>` header, verifies it using `jsonwebtoken`, and attaches the decoded user payload to the `req` object.
    2.  Apply this middleware to all API routes that require authentication (e.g., `/api/generate-plan`, `/api/workouts`, `/api/plans`, etc.).

    *   **Example Implementation:**
        ```javascript
        // Add this middleware function in server.js
        const protectWithJwt = (req, res, next) => {
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Not authenticated: No token provided' });
          }
          const token = authHeader.split(' ')[1];
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Add user payload to the request
            next();
          } catch (error) {
            return res.status(401).json({ error: 'Not authenticated: Invalid token' });
          }
        };

        // Apply the middleware to routes
        app.post('/api/generate-plan', aiLimiter, protectWithJwt, async (req, res) => { ... });
        app.get('/api/workouts/:userId', protectWithJwt, (req, res) => { ... });
        // etc. for all protected routes
        ```

*   **Verification Steps:**
    1.  Using a tool like Postman or `curl`, attempt to access a protected endpoint (e.g., `/api/workouts/some-user-id`) without an `Authorization` header. Verify it returns a 401 Unauthorized error.
    2.  Make the same request, but include the `Authorization: Bearer <your_jwt>` header. Verify you receive a successful 200 OK response.

## Phase 2: Frontend & Capacitor Setup

### 2.1. Handle Token-Based Authentication in Frontend

*   **Files:** `plan-my-run/src/App.tsx`, `plan-my-run/src/contexts/AuthContext.tsx`
*   **Dependencies to Add:** `@capacitor/app`, `@capacitor/preferences`
    *   **Action:** Run `npm install @capacitor/app @capacitor/preferences` in the `plan-my-run` directory.

*   **Current Code Reference:** `AuthContext.tsx` uses `validateSession()` which relies on a backend session.
*   **Proposed Changes:**
    1.  **Create Auth Callback Page:** Create a new page component `plan-my-run/src/pages/AuthCallback.tsx`. Its purpose is to read the token from the URL, store it, and redirect.
        ```typescript
        // AuthCallback.tsx
        import { useEffect } from 'react';
        import { useLocation, useNavigate } from 'react-router-dom';
        import { Preferences } from '@capacitor/preferences';

        const AuthCallback = () => {
          const location = useLocation();
          const navigate = useNavigate();

          useEffect(() => {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');

            if (token) {
              const storeToken = async () => {
                await Preferences.set({ key: 'authToken', value: token });
                // Or for web: localStorage.setItem('authToken', token);
                window.location.href = '/coach-selection'; // Force a full reload to re-initialize the app with the new auth state
              };
              storeToken();
            } else {
              navigate('/'); // No token, go home
            }
          }, [location, navigate]);

          return <div>Loading...</div>;
        };
        export default AuthCallback;
        ```
    2.  **Add Route:** Add `<Route path="/auth/callback" element={<AuthCallback />} />` to `App.tsx`.
    3.  **Modify `AuthContext.tsx`:**
        *   Change `validateSession` to `loadUserFromToken`. This new function will try to load the token from `Preferences` (or `localStorage` for web), decode it, and set the user state.
        *   Call `loadUserFromToken` in the main `useEffect` of the provider.
        *   The `signOut` function must now also clear the token from storage.
    4.  **Modify `apiClient.ts`:**
        *   Update the `request` method to retrieve the token from storage and add the `Authorization` header to every API call.

*   **Verification Steps:**
    1.  After logging in, confirm the token is present in `localStorage` (on web).
    2.  Refresh the page and confirm you remain logged in.
    3.  Confirm that navigating to protected pages works and that API calls in the network tab contain the `Authorization` header.
    4.  Test the logout functionality to ensure the token is cleared and you are logged out.

### 2.2. Adapt UI for Mobile Devices

*   **Files:** `plan-my-run/index.html`, `plan-my-run/src/index.css`
*   **Current Code Reference:** Standard web viewport and CSS.
*   **Proposed Changes:**
    1.  **Update `index.html`:** Add `viewport-fit=cover` to the viewport meta tag.
        ```html
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        ```
    2.  **Update `index.css`:** Use CSS `env()` variables to prevent UI elements from being hidden by the notch or home bar. Apply this to your main app container.
        ```css
        @layer base {
          body {
            @apply bg-background text-foreground font-body;
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
          }
        }
        ```
*   **Verification Steps:**
    1.  After packaging the app with Capacitor, run it on an iOS simulator (e.g., iPhone 14) and an Android emulator.
    2.  Verify that the content is not hidden behind the status bar or home indicator. Check both portrait and landscape modes.

This detailed specification provides a clear path forward. Once these changes are made, your application will be architecturally ready for a smooth and robust mobile experience with Capacitor.
