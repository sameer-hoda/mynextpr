# Frontend UI/UX and Technical Audit Findings

This document summarizes the key user experience, interface, and technical issues identified during a manual audit of the frontend application flow.

**Note:** The issues identified are fundamental to the application's architecture and are not specific to the "Test User" flow implemented for this audit. They would affect any user, regardless of the authentication method.

## 1. User Experience & Interface (UX/UI) Issues

### Application-Wide Navigation
- **Page Does Not Load at the Top:** When navigating between pages (e.g., from Coach Selection to Onboarding), the scroll position from the previous page is maintained. This often results in the top of the new page being off-screen, forcing the user to manually scroll up to see the content from the beginning. This is a significant usability issue.

### Landing Page (`/`)

-   **Vertical Scrolling Issue:** The main page container has a height greater than the viewport, allowing users to scroll down into a blank white area below the primary content. This creates a broken and unprofessional appearance.
-   **Brand Inconsistency:** The main heading `<h1>` displays "MYNEXTPR", while the browser's `<title>` tag shows "mynextpr.com - Your Next Personal Record". These should be consistent for brand cohesion.
-   **Authentication Flow Blocker:** The primary Google OAuth flow is non-functional in the local development environment due to a security error related to redirect URI misconfiguration. A temporary "Test User" button was implemented to bypass this for the audit.

### Coach Selection Page (`/coach-selection`)

-   **Lack of User Guidance:** On page load, no default coaching style is selected, and the "Continue" button is disabled without any accompanying text instructing the user to make a selection.
-   **Confusing "Not Sure?" Interaction:** The "Not sure? Let me pick for you" button correctly selects a default option but provides no visual feedback (like highlighting the selected card) to confirm the action was successful.
-   **Poor Visual Hierarchy:** The "Step 1 of 2" progress indicator is small and has low contrast, making it easy for users to miss this important contextual information.

### Onboarding Page (`/onboarding`) & Plan Generation Failure

-   **Critical Missing Inputs:** The form is missing fields for **Age** and **Sex**. These are required by the backend to generate a personalized plan. Their absence is the direct cause of the plan generation failure.
-   **Poor Time Selection UX:** The horizontal scrolling list for "Current Time" lacks visual cues (like arrows or a partially visible next item), making it unclear that more options are available off-screen, especially for desktop users.
-   **Ambiguous Terminology:** The labels "Current Time" and "Estimated Goal" are unclear. More descriptive labels like "Your Current Race Time" and "Choose a Goal Time" would improve clarity.
-   **Plan Generation Failure:** Submitting the form results in an "Error generating plan" message. This is a direct result of the missing "Age" and "Sex" fields, causing the backend to reject the request.

## 2. Technical & Code-Level Issues

### Application-Wide

-   **Race Condition on Initial Load:** On application start, components attempt to fetch data (`/api/profiles/undefined`, `/api/workouts/undefined`) before the user's authentication status is confirmed. This results in unnecessary `401 Unauthorized` network errors. Data fetching should be deferred until the user ID is available.
-   **Missing Scroll-to-Top on Navigation:** As a Single-Page Application (SPA), the app does not automatically scroll to the top of the page when navigating between routes. This is the root cause of the user-facing issue where new pages appear partially scrolled down.

### Component-Specific

-   **`Index.tsx` (Landing Page):**
    -   **Redundant State:** The component uses a local `loading` state variable that duplicates the `authLoading` state provided by the `useAuth` hook. This adds unnecessary complexity.

-   **`CoachSelection.tsx` & `Onboarding.tsx`:**
    -   **Hardcoded Data:** Data for coaching philosophies, distance options, and time options are hardcoded directly within the components. This makes the code harder to maintain and update. This data should be extracted into separate constant files.

-   **`Onboarding.tsx`:**
    -   **Inefficient Calculations:** The `calculateGoalTimes` function is re-run on every render. While not currently a performance bottleneck, it's an inefficient pattern that should be memoized with `useMemo`.
    -   **Overly-Simplified State Management:** The form state is managed with multiple `useState` hooks. For a form of this complexity, using `useReducer` or a form library like `react-hook-form` (which is already a dependency) would be more robust and scalable.

-   **`Loading.tsx`:**
    -   **Incorrect Data Transformation:** The component hardcodes `age` and `sex` values when preparing the data for the API request, which is the root cause of the plan generation failure.
    -   **Poor Error Handling UX:** When plan generation fails, the user is redirected back to the onboarding form, but their previous selections are lost, forcing them to re-enter all information. The form state should be preserved.
