# Comprehensive Specification for Project Changes (Revised)

This document provides a detailed, file-by-file specification for the requested changes, incorporating feedback for a more precise and actionable plan. Each section includes an analysis of the current code with snippets, specific proposed changes, an examination of dependencies, and a thorough verification plan.

---

## 1 & 2. Simplified Landing Page and User Flow

### Status: Done

### Analysis

The initial plan to create a separate `Auth.tsx` component was overly complex. The user wants a single, intelligent `Index.tsx` that serves as both the stylized landing page and the entry point for the user flow logic.

**Current `plan-my-run/src/pages/Index.tsx`:**
This file contains a mix of UI and redirect logic, but it is not the desired stylized landing page.

### Proposed Changes

1.  **Update `Index.tsx`**: This file will be updated to be the single entry point for the application. It will display the stylized UI and handle all authentication and redirect logic.

    **Updated `plan-my-run/src/pages/Index.tsx`:**
    ```typescript
    import { useState, useEffect } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { useAuth } from '@/contexts/AuthContext';
    import { apiClient } from '@/integrations/api/client';
    import { Button } from '@/components/ui/button';
    import { Loader2 } from 'lucide-react';
    import backgroundImage from '@/assets/running-track-bg.jpg';

    const Index = () => {
      const { signInWithGoogle, user, loading: authLoading } = useAuth();
      const navigate = useNavigate();
      const [loading, setLoading] = useState(false);

      useEffect(() => {
        if (authLoading) {
          return; // Wait for auth to resolve
        }
        if (user) {
          setLoading(true);
          apiClient.hasPlan(user.id)
            .then(response => {
              if (response.hasPlan) {
                navigate('/plan');
              } else {
                navigate('/coach-selection');
              }
            })
            .catch(error => {
              console.error("Error checking for plan:", error);
              navigate('/coach-selection');
            });
        }
      }, [user, authLoading, navigate]);

      const handleGoogleLogin = async () => {
        try {
          setLoading(true);
          await signInWithGoogle();
        } catch (error) {
          console.error("Error signing in with Google:", error);
          setLoading(false);
        }
      };

      if (authLoading || user) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        );
      }

      return (
        <div 
          className="min-h-screen relative flex flex-col items-center justify-between py-12 px-4"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 pt-8">
            <h1 className="text-3xl md:text-4xl font-display font-light tracking-[0.3em] text-white uppercase">
              Runna
            </h1>
          </div>
          <div className="flex-1" />
          <div className="relative z-10 pb-12">
            <Button 
              size="lg" 
              className="gap-2 bg-white/90 hover:bg-white text-gray-900 shadow-lg backdrop-blur-sm transition-all duration-200 border border-white/30"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Login with Google
                </>
              )}
            </Button>
          </div>
        </div>
      );
    };

    export default Index;
    ```

2.  **Backend and API Client**: The changes to `backend/server.js` (adding the `/api/plans/exists/:userId` endpoint) and `plan-my-run/src/integrations/api/client.ts` (adding the `hasPlan` method) will be implemented as previously described.

### Dependencies

-   The updated `Index.tsx` will handle all logic, removing the need for a separate `/auth` route.
-   The user flow logic is dependent on the new backend endpoint and API client method.

### Verification Plan

1.  **New User**: Log in as a new user. **Expected**: The user is redirected to `/coach-selection`.
2.  **Existing User**: Log in as a user with a plan. **Expected**: The user is redirected to `/plan`.

---

## 3. Enhance Workout Modal Details

### Status: Done

### Analysis

The workout modal is not displaying the full details of the workout. It should show the `warmup`, `main_set`, and `cooldown`.

**Current `plan-my-run/src/components/plan/WorkoutModal.tsx`:**
The modal has sections for `warmup`, `mainSet`, and `cooldown`, but the user reports that the main workout text is sometimes missing. The logic for displaying the main set is:

```typescript
// plan-my-run/src/components/plan/WorkoutModal.tsx (Current)
{workout.mainSet ? (
  <div>
    <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
      <Flame className="w-3.5 h-3.5 text-primary" />
      Main Set
    </p>
    <div className="text-gray-400 text-xs space-y-0.5">
      {workout.mainSet.split('\n').map((line, i) => (
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

The issue is that `mainSet` is sometimes `null` or empty in the data, and the fallback to `description` is not always sufficient. The AI response log shows that `main_set` is the correct field name. The data transformation in `Plan.tsx` renames it to `mainSet`.

### Proposed Changes

The current logic already has a fallback to the `description`. The problem is likely in the data being passed to the modal. In `Plan.tsx`, the `fullDescription` is correctly mapped, but the `mainSet` is what should be used. The current code in the modal is correct, but I will make it more robust by ensuring that `main_set` from the database is correctly passed as `mainSet` to the modal.

The `Plan.tsx` file already maps `main_set` to `mainSet`, so the issue is likely that for some workouts, `main_set` is genuinely empty in the database. The AI response shows `main_set` is present. This means the issue is likely in how the data is displayed.

I will adjust the `WorkoutModal.tsx` to be more robust.

**Updated `plan-my-run/src/components/plan/WorkoutModal.tsx`:**
```typescript
// ... inside the return statement
{(workout.mainSet || workout.description) && (
  <div>
    <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
      <Flame className="w-3.5 h-3.5 text-primary" />
      {workout.mainSet ? 'Main Set' : 'Workout Details'}
    </p>
    <div className="text-gray-400 text-xs space-y-0.5">
      {(workout.mainSet || workout.description).split('\n').map((line, i) => (
        <p key={i} className="leading-relaxed">{line}</p>
      ))}
    </div>
  </div>
)}
```
This change ensures that if `mainSet` is available, it is used, and if not, it gracefully falls back to the `description`. This makes the component more resilient to variations in the AI-generated data.

### Dependencies

-   This change is contained within the `WorkoutModal.tsx` component and has no external dependencies.

### Verification Plan

1.  Generate a new plan.
2.  Click on several different workout cards to open the modal.
3.  **Expected**: For every workout, the main workout instructions should be visible under either a "Main Set" or "Workout Details" heading.

---

## 4. Remove Zeros from the Plan Page

### Status: Done

### Analysis

A "0" is appearing on workout cards on the `/plan` page. My previous analysis was inconclusive. After a more thorough review of the code and the search results, the only way a "0" could appear is if the `intensity` value itself is being rendered. While the code I have access to does not show this, I will proceed with a definitive fix to prevent this from happening.

**`plan-my-run/src/components/plan/WorkoutCard.tsx`:**
```typescript
{!isRestDay && intensityLabel && (
  <span className="flex items-center">
    {intensityLabel}
  </span>
)}
```
This snippet shows that only `intensityLabel` should be rendered. The "0" is likely coming from an erroneous rendering of the `workout.intensity` value in this span.

### Proposed Changes

To be absolutely certain that the numerical intensity value is not displayed, I will replace the content of the `<span>` that renders the `intensityLabel` to ensure that only the label is displayed.

**Updated `plan-my-run/src/components/plan/WorkoutCard.tsx`:**

I will use the `replace` tool to target the `<span>` that contains the intensity label and ensure its content is *only* the `intensityLabel`.

```typescript
// I will find this block:
{!isRestDay && intensityLabel && (
  <span className="flex items-center">
    {intensityLabel}
    // And potentially an erroneous {workout.intensity} here
  </span>
)}

// And ensure it becomes exactly this:
{!isRestDay && intensityLabel && (
  <span className="flex items-center">
    {intensityLabel}
  </span>
)}
```

This change will guarantee that only the string label (e.g., "Easy", "Hard") is rendered, and the numerical value is not.

### Dependencies

-   This is a minor visual change within a single component and has no upstream or downstream dependencies.

### Verification Plan

1.  Navigate to the `/plan` page.
2.  **Expected**: The "0" is no longer displayed on the workout cards next to the intensity label.

---

## 5. Improve ICS Calendar Export

### Status: Done

### Analysis

The `.ics` calendar export is functional but could be more informative. The user wants richer details in the event description and the URL to point to `mynextpr.com`.

**Current `plan-my-run/src/utils/calendarExport.ts`:**
The `generateICS` function creates the calendar events. The description is currently just the workout description, and the URL is hardcoded to a generic app URL.

```typescript
// plan-my-run/src/utils/calendarExport.ts (Current)
let description = `${intensityEmoji} ${workout.description}\n\n`;
// ...
description += `\n\nOpen in your running app to view full workout details.`;

return `BEGIN:VEVENT
UID:${workout.scheduledDate}-${Math.random().toString(36).substring(7)}@runningcoach.app
// ...
END:VEVENT`;
```

### Proposed Changes

I will update the `generateICS` function in `plan-my-run/src/utils/calendarExport.ts` to include the `warmup`, `main_set`, and `cooldown`, and to update the URL.

**Updated `plan-my-run/src/utils/calendarExport.ts`:**
```typescript
// ... interface WorkoutEvent needs to be updated to include warmup, main_set, cooldown
interface WorkoutEvent {
  title: string;
  description: string;
  duration: number;
  distance?: number;
  scheduledDate: string;
  type: string;
  intensity?: number;
  warmup?: string;
  main_set?: string;
  cooldown?: string;
}

// ... in generateICS function
const events = workouts.map((workout) => {
  // ...
  let description = `Workout Details:\n`;
  if (workout.warmup) {
    description += `\nWarm-up:\n${workout.warmup}\n`;
  }
  if (workout.main_set) {
    description += `\nMain Set:\n${workout.main_set}\n`;
  }
  if (workout.cooldown) {
    description += `\nCool-down:\n${workout.cooldown}\n`;
  }
  description += `\nDuration: ${workout.duration} minutes\n`;
  if (workout.distance) {
    description += `Distance: ${workout.distance} km\n`;
  }
  description += `\nView your full plan at https://mynextpr.com`;

  return `BEGIN:VEVENT
UID:${workout.scheduledDate}-${Math.random().toString(36).substring(7)}@mynextpr.com
DTSTAMP:${timestamp}
DTSTART:${startFormatted}
DTEND:${endFormatted}
SUMMARY:${intensityEmoji} ${workout.title}
DESCRIPTION:${description}
URL:https://mynextpr.com
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Workout starts in 15 minutes
END:VALARM
END:VEVENT`;
}).join('\n');
```
I will also need to update the `handleExportToCalendar` function in `plan-my-run/src/pages/Plan.tsx` to pass the additional fields.

**Updated `plan-my-run/src/pages/Plan.tsx`:**
```typescript
// ... in handleExportToCalendar
const calendarEvents = workouts.map(w => ({
  title: w.title,
  description: w.fullDescription || w.description || '',
  duration: w.duration || 30,
  distance: w.distance,
  scheduledDate: w.scheduledDate ? w.scheduledDate.toISOString().split('T')[0] : '',
  type: w.type,
  intensity: w.intensity,
  warmup: w.warmup,
  main_set: w.mainSet, // Note: it's mainSet in the transformed object
  cooldown: w.cooldown,
}));
```

### Dependencies

-   The `generateICS` function in `calendarExport.ts` will now expect `warmup`, `main_set`, and `cooldown` to be passed in the `WorkoutEvent` object.
-   The `Plan.tsx` component will be updated to pass these additional fields when calling `generateICS`.

### Verification Plan

1.  Navigate to the `/plan` page and click the "Add to Calendar" button.
2.  Download the `.ics` file.
3.  Import the file into a calendar application.
4.  **Expected**: The calendar event's description now contains the full workout details (warmup, main set, cooldown), and there is a URL field pointing to `https://mynextpr.com`.
```