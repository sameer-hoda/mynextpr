# Capacitor Integration Guide for Runna

This document provides a detailed analysis and recommended architecture for converting your React web application into native mobile apps for iOS and Android using Capacitor.

## 1. Overview of the Capacitor Approach

Capacitor is a modern, open-source tool that allows you to take your existing web application and deploy it as a native mobile application. It works by wrapping your web app in a "WebView" (a native component that renders web content) and providing a bridge to access native device features.

For the Runna project, this is the most efficient path to the app stores because it allows you to **reuse nearly 100% of your existing React frontend code** from the `plan-my-run` project.

## 2. Key Capacitor Features for Runna

By adopting Capacitor, you can enhance your app with native mobile features that are difficult or impossible to implement on the web.

*   **Push Notifications:** Use the [`@capacitor/push-notifications`](https://capacitorjs.com/docs/apis/push-notifications) plugin to send workout reminders, motivational messages, and updates directly to your users, significantly increasing engagement.
*   **Geolocation:** While web geolocation exists, the native [`@capacitor/geolocation`](https://capacitorjs.com/docs/apis/geolocation) plugin provides more reliable and battery-efficient background location tracking, which could be a future feature for tracking runs in real-time.
*   **Haptics:** Use the [`@capacitor/haptics`](https://capacitorjs.com/docs/apis/haptics) plugin to provide satisfying physical feedback when users complete a workout, press buttons, or hit milestones.
*   **App Icon and Splash Screen:** The [`@capacitor/splash-screen`](https://capacitorjs.com/docs/apis/splash-screen) plugin allows you to configure a professional launch experience with a custom icon and splash screen, making your app feel truly native from the moment it's opened.
*   **Secure, Persistent Storage:** Store sensitive data like authentication tokens using the [`@capacitor/preferences`](https://capacitorjs.com/docs/apis/preferences) plugin, which leverages native, secure storage (Keychain on iOS, SharedPreferences on Android).
*   **Device Information:** The [`@capacitor/device`](https://capacitorjs.com/docs/apis/device) plugin gives you access to device-specific information, which can be useful for analytics and tailoring the user experience.

## 3. Key Project Changes Required

To ensure a smooth transition to mobile, several key areas of your project will need adjustments.

#### 3.1. API and Authentication (Most Important)

*   **Problem:** Your `apiClient` uses relative paths (e.g., `/api/auth/me`) and your `server.js` uses cookie/session-based authentication (`express-session`). This model is not reliable for mobile apps, as the app (running on `capacitor://localhost`) and the API are on different domains, and WebViews (especially on iOS) have strict cookie policies.
*   **Solution: Switch to Token-Based Authentication (JWT).**
    1.  **Backend:** Modify your `/auth/google/callback` endpoint in `server.js` to generate a JSON Web Token (JWT) upon successful login instead of creating a server-side session.
    2.  **Frontend:** When the app launches, instead of redirecting to the frontend, the native app will capture this JWT.
    3.  **Storage:** Store the JWT securely on the device using Capacitor's `Preferences` plugin.
    4.  **API Client:** Update your `apiClient` in the React app to read the token from storage and send it in the `Authorization: Bearer <token>` header with every request. Your backend will then validate this token to authenticate the user.

#### 3.2. UI/UX for Mobile

*   **Handling "Safe Areas":** iPhones with notches and other devices have "safe areas" at the top and bottom of the screen. Your UI needs to account for these to avoid being hidden.
    *   **Solution:** Add `viewport-fit=cover` to the `<meta name="viewport">` tag in your `plan-my-run/index.html`. Then, use CSS environment variables in your Tailwind CSS configuration to add padding to your main layout components.
        ```css
        /* Example in your index.css */
        body {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
        ```
*   **Native Back Button (Android):** Android users expect the physical back button to work for navigation.
    *   **Solution:** Use the Capacitor [`App` plugin](https://capacitorjs.com/docs/apis/app) to listen for the `backButton` event and integrate it with `react-router-dom` to navigate backward.

#### 3.3. Configuration

*   **Environment Variables:** Your `apiClient` relies on `import.meta.env.VITE_API_URL`. When building for mobile, this will be empty.
    *   **Solution:** You must hardcode your deployed backend URL (e.g., `https://mynextpr.com/api`) in the `apiClient` or use Capacitor's configuration system to manage different environments.
*   **Capacitor Config:** You will create a `capacitor.config.ts` file to define your app's name, ID, and the location of your web build output (`dist`).

## 4. Recommended Architecture for Minimal Changes

To get to the app stores as quickly as possible, the goal is to change your existing web code as little as possible.

1.  **Keep a Single UI Codebase:** Continue building and styling your UI in the `plan-my-run` React project. Do not create a separate mobile-specific UI.
2.  **Use a "Wrapper" Architecture:** Treat the native Capacitor layer as just a shell. Your entire UI will be the React app running in a WebView. This means you don't need to write any native iOS or Android UI code to get started.
3.  **Abstract Native Calls:** Create a new service or hook (e.g., `useNative.ts`) to contain all Capacitor plugin calls. This keeps your components clean and makes it easy to provide fallback behavior for the web.
    *   *Example `useNative.ts`*:
        ```typescript
        import { Capacitor } from '@capacitor/core';
        import { Haptics } from '@capacitor/haptics';

        export const useNative = () => {
          const playHapticFeedback = () => {
            if (Capacitor.isNativePlatform()) {
              Haptics.impact();
            }
          };

          const getPlatform = () => {
            return Capacitor.getPlatform();
          };

          return { playHapticFeedback, getPlatform };
        };
        ```
4.  **Build & Sync Workflow:** Your development process will be:
    a.  Make changes to your React app in `plan-my-run/src`.
    b.  Run `npm run build` to create an updated web bundle.
    c.  Run `npx cap sync` to copy the new web bundle into your native iOS and Android projects.
    d.  Run `npx cap open ios` or `npx cap open android` to launch the native IDE and deploy to a device/simulator.
