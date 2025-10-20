# Implementation Guide: Critical Mobile Features for mynextpr.com App

## Overview
This guide provides step-by-step instructions for implementing the most critical mobile features identified in the audit. These implementations will bring the mobile app to a production-ready state with native functionality. **IMPORTANT: Before starting any feature implementation, all critical security issues must be addressed first.**

## CRITICAL SECURITY ISSUES THAT MUST BE FIXED FIRST

### CRITICAL FIX 1: OAuth Callback URL Configuration (MUST BE DONE FIRST)

**Issue**: The Google OAuth callback URL in `backend/server.js` is hardcoded to production values, which will break development and staging environments.

**File to Update**: `backend/server.js` (find the Google Strategy section)

**Current problematic code**:
```javascript
callbackURL: "https://mynextpr.com/api/auth/google/callback"
```

**Fixed code**:
```javascript
callbackURL: process.env.GOOGLE_CALLBACK_URL || 
           (process.env.NODE_ENV === 'production' 
             ? "https://mynextpr.com/api/auth/google/callback" 
             : "http://localhost:3001/auth/google/callback")
```

**Environment variables to add to `.env`**:
```
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
```

**Additional environment variables for production**:
```
GOOGLE_CALLBACK_URL=https://mynextpr.com/api/auth/google/callback
```

### CRITICAL FIX 2: Production Security Headers

**File to Update**: `backend/server.js`

**Add these imports at the top**:
```javascript
const helmet = require('helmet');
```

**Add this middleware early in app setup** (before other middleware):
```javascript
app.use(helmet());

// Configure CORS properly
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  optionsSuccessStatus: 200
}));
```

**Environment variables to add**:
```
FRONTEND_URL=http://localhost:8080
```

## Feature 1: Haptic Feedback System

### Step 1: Create the Haptic Feedback Hook
Create file: `src/hooks/useNativeFeedback.ts`

```typescript
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const useNativeFeedback = () => {
  const triggerImpact = (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style });
    }
  };
  
  const triggerNotification = (type: NotificationType = NotificationType.Success) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.notification({ type });
    }
  };
  
  return { triggerImpact, triggerNotification };
};
```

### Step 2: Integrate Haptics in Onboarding
Update file: `src/pages/Onboarding.tsx`

```typescript
// Add this import at the top
import { useNativeFeedback } from "@/hooks/useNativeFeedback";

// In the component:
const { triggerImpact, triggerNotification } = useNativeFeedback();

// In the handleSubmit function:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  triggerImpact(); // Provide haptic feedback when submitting
  
  // ... existing form submission code ...
  
  if (success) {
    triggerNotification(NotificationType.Success); // Success feedback
  } else {
    triggerNotification(NotificationType.Error); // Error feedback
  }
};
```

### Step 3: Integrate Haptics in Workout Modal
Update file: `src/components/plan/WorkoutModal.tsx`

```typescript
// Add this import at the top
import { useNativeFeedback } from "@/hooks/useNativeFeedback";

// In the component:
const { triggerImpact, triggerNotification } = useNativeFeedback();

// In the handleSave function:
const handleSave = async () => {
  triggerImpact(); // Provide haptic feedback when saving
  
  // ... existing save logic ...
  
  if (success) {
    triggerNotification(NotificationType.Success); // Success feedback
  }
};
```

## Feature 2: Local Notification System

### Step 1: Create Notification Service
Create file: `src/services/notificationService.ts`

```typescript
import { LocalNotifications, PermissionState, NotificationChannel, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export class NotificationService {
  static async requestPermission(): Promise<PermissionState> {
    if (Capacitor.isNativePlatform()) {
      const result = await LocalNotifications.requestPermissions();
      return result.display as PermissionState;
    }
    return 'denied';
  }

  static async createNotificationChannel() {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const channel: NotificationChannel = {
          id: 'workout-reminders',
          name: 'Workout Reminders',
          description: 'Notifications for upcoming workouts',
          importance: 4, // High importance
          visibility: 1, // Private
        };
        await LocalNotifications.createChannel(channel);
      } catch (error) {
        console.warn('Could not create notification channel:', error);
      }
    }
  }

  static async scheduleWorkoutNotification(workout: any) {
    if (!Capacitor.isNativePlatform()) return;
    
    // Convert the workout scheduled date to a Date object
    const scheduledDate = new Date(workout.scheduled_date);
    if (isNaN(scheduledDate.getTime())) {
      console.error('Invalid scheduled date for workout:', workout);
      return;
    }
    
    // Schedule 1 hour before workout time
    const notificationTime = new Date(scheduledDate);
    notificationTime.setHours(notificationTime.getHours() - 1);
    
    // Don't schedule notifications for past dates
    if (notificationTime < new Date()) {
      return;
    }
    
    const notification: LocalNotificationSchema = {
      id: parseInt(workout.id?.toString().slice(-6)) || Date.now(), // Ensure numeric ID
      title: `Time for your ${workout.type?.replace('_', ' ') || 'workout'}: ${workout.title || 'Untitled'}`,
      body: workout.description || `Your workout is scheduled for today!`,
      schedule: { at: notificationTime, allowWhileIdle: true },
      channelId: 'workout-reminders',
      extra: {
        workoutId: workout.id,
        type: 'workout-reminder',
      },
      smallIcon: 'res://mipmap/ic_launcher', // Android
      iconColor: '#3B82F6', // Android
    };
    
    try {
      await LocalNotifications.schedule({
        notifications: [notification]
      });
      console.log('Scheduled notification for workout:', workout.id);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  static async scheduleAllWorkoutNotifications(workouts: any[]) {
    if (!Capacitor.isNativePlatform()) return;
    
    // Cancel all existing workout notifications first
    await this.cancelWorkoutNotifications();
    
    // Schedule new notifications
    for (const workout of workouts) {
      await this.scheduleWorkoutNotification(workout);
    }
  }

  static async cancelWorkoutNotifications() {
    if (Capacitor.isNativePlatform()) {
      // Get all pending notifications and cancel those that are workout reminders
      const pending = await LocalNotifications.getPending();
      const workoutNotifications = pending.notifications.filter(
        n => n.extra && n.extra.type === 'workout-reminder'
      );
      
      if (workoutNotifications.length > 0) {
        await LocalNotifications.cancel({
          ids: workoutNotifications.map(n => n.id)
        });
      }
    }
  }
}
```

### Step 2: Integrate Notifications in Plan Page
Update file: `src/pages/Plan.tsx`

```typescript
// Add these imports at the top
import { NotificationService } from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";

// In the component:
const { toast } = useToast();

// Add effect to request notification permissions and set up notifications
useEffect(() => {
  const setupNotifications = async () => {
    const permission = await NotificationService.requestPermission();
    
    if (permission === 'granted') {
      await NotificationService.createNotificationChannel();
      
      // Schedule notifications when workouts are loaded
      if (workouts && workouts.length > 0) {
        await NotificationService.scheduleAllWorkoutNotifications(workouts);
      }
    } else if (permission === 'prompt') {
      // Permission not granted, but we can prompt again
      toast({
        title: "Notifications needed",
        description: "Enable notifications to receive workout reminders",
        action: (
          <Button 
            variant="outline" 
            onClick={async () => {
              const newPermission = await NotificationService.requestPermission();
              if (newPermission === 'granted') {
                toast({ title: "Notifications enabled", description: "You'll receive workout reminders" });
              }
            }}
          >
            Enable
          </Button>
        ),
      });
    }
  };

  setupNotifications();
}, [workouts, toast]);

// When new workouts are fetched, reschedule notifications
useEffect(() => {
  if (workouts && workouts.length > 0) {
    NotificationService.scheduleAllWorkoutNotifications(workouts);
  }
}, [workouts]);
```

## Feature 3: Android Back Button Handling

### Step 1: Create Back Handler Hook
Create file: `src/hooks/useAndroidBackHandler.ts`

```typescript
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

export const useAndroidBackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = async () => {
      const currentPath = location.pathname;
      
      if (currentPath === '/plan') {
        // Exit app on main plan screen
        App.exitApp();
      } else if (currentPath === '/onboarding' || currentPath === '/coach-selection') {
        // Prevent going back from onboarding or coach selection
        return;
      } else {
        // Navigate to previous page
        navigate(-1);
      }
    };

    const addBackButtonListener = async () => {
      if (typeof App.addListener !== 'undefined') {
        const backHandler = await App.addListener('backButton', handleBackButton);
        return backHandler;
      }
    };

    let backButtonSubscription: any = null;
    
    if (typeof App.addListener !== 'undefined') {
      addBackButtonListener().then(subscription => {
        backButtonSubscription = subscription;
      });
    }
    
    return () => {
      if (backButtonSubscription && backButtonSubscription.remove) {
        backButtonSubscription.remove();
      }
    };
  }, [navigate, location.pathname]);
};
```

### Step 2: Integrate Back Handler in App Component
Update file: `src/App.tsx`

```typescript
// Add this import at the top
import { useAndroidBackHandler } from "./hooks/useAndroidBackHandler";

// In the App component:
const App = () => {
  useAndroidBackHandler(); // Add this hook to handle back button
  
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* ... existing routes ... */}
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
```

## Feature 4: Safe Area Implementation

### Step 1: Update HTML Meta Tag
Update file: `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>mynextpr.com - AI-Powered Running Coach</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 2: Update CSS for Safe Areas
Update file: `src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  padding: 0;
  padding-top: env(safe-area-inset-top, 0);
  padding-right: env(safe-area-inset-right, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
  padding-left: env(safe-area-inset-left, 0);
  overflow-x: hidden;
  font-family: /* @import */ 'Inter', sans-serif;
  background-color: #ffffff;
}

.safe-area-container {
  padding-top: env(safe-area-inset-top, 20px);
  padding-bottom: env(safe-area-inset-bottom, 20px);
  min-height: 100vh;
  box-sizing: border-box;
}

.safe-area-top {
  padding-top: env(safe-area-inset-top, 20px);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 20px);
}

/* Adjust for iOS status bar in web app */
@media screen and (orientation: portrait) {
  .mobile-app {
    padding-top: calc(env(safe-area-inset-top, 20px) + 10px);
  }
}

@media screen and (orientation: landscape) {
  .mobile-app {
    padding-left: calc(env(safe-area-inset-left, 0px) + 10px);
    padding-right: calc(env(safe-area-inset-right, 0px) + 10px);
  }
}
```

### Step 3: Create Safe Area Wrapper Component
Create file: `src/components/layout/SafeAreaView.tsx`

```typescript
import React from 'react';
import { cn } from "@/lib/utils";

interface SafeAreaViewProps {
  children: React.ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

const SafeAreaView: React.FC<SafeAreaViewProps> = ({ 
  children, 
  className = '',
  top = true, 
  bottom = true, 
  left = true, 
  right = true 
}) => {
  const safeAreaClass = cn(
    "w-full h-full",
    top && "pt-[env(safe-area-inset-top)]",
    bottom && "pb-[env(safe-area-inset-bottom)]",
    left && "pl-[env(safe-area-inset-left)]",
    right && "pr-[env(safe-area-inset-right)]",
    className
  );

  return <div className={safeAreaClass}>{children}</div>;
};

export default SafeAreaView;
```

## Feature 5: Production Environment Configuration

### Step 1: Update Production Environment Variables
Create new file: `.env.production` in frontend:

```
VITE_BACKEND_URL=https://api.mynextpr.com
VITE_FRONTEND_URL=https://mynextpr.com
VITE_GOOGLE_CALLBACK_URL=https://mynextpr.com/api/auth/google/callback
```

### Step 2: Update Development Environment Variables
Update file: `.env` in frontend:

```
VITE_BACKEND_URL=http://localhost:3001
VITE_FRONTEND_URL=http://localhost:8080
VITE_GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
```

### Step 3: Update Backend Configuration
Update file: `backend/.env`:

```
# Development
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:8080

# Production (when deployed)
# GOOGLE_CALLBACK_URL=https://mynextpr.com/api/auth/google/callback
# FRONTEND_URL=https://mynextpr.com
```

## Implementation Order and Dependencies

### Phase 0: Critical Security Fixes (DO FIRST - BEFORE ANYTHING ELSE)
1. Fix OAuth callback URL configuration in backend
2. Add security headers (Helmet.js) to backend
3. Update environment variable configuration

### Phase 1: Native Features (Can be done in parallel)
1. Haptic feedback system (lowest risk)
2. Safe area implementation
3. Android back button handling

### Phase 2: Notification System
1. Local notification service implementation
2. Integration with plan page
3. Testing across devices

### Phase 3: Production Configuration
1. Environment variable updates
2. Security hardening
3. Final testing and deployment preparation

## Testing Checklist

Before deploying each feature, ensure the following:

### Critical Security Fixes:
- [ ] OAuth flow works in development environment
- [ ] OAuth flow works in production environment
- [ ] Security headers are properly applied
- [ ] CORS is configured correctly for each environment

### Haptic Feedback:
- [ ] Works on iOS physical device
- [ ] Works on Android physical device
- [ ] Fallback works in web browser
- [ ] Different haptic types work appropriately

### Local Notifications:
- [ ] Permission request appears and functions correctly
- [ ] Notifications are delivered at correct times
- [ ] Notifications can be scheduled and cancelled
- [ ] Works on both iOS and Android devices
- [ ] Notification channels are created on Android

### Back Button Handling:
- [ ] App exits on main screen on Android
- [ ] Proper navigation on other screens
- [ ] Doesn't interfere with iOS navigation
- [ ] Works with React Router properly

### Safe Areas:
- [ ] Proper spacing on iPhone with notch
- [ ] Proper spacing on Android with cutouts
- [ ] Landscape mode works correctly
- [ ] No visual glitches on any device size

## Troubleshooting Common Issues

### OAuth Callback URL Issues:
- If OAuth fails after implementing environment variables:
  1. Verify `GOOGLE_CALLBACK_URL` is set correctly in your .env file
  2. Check Google Cloud Console for registered redirect URLs
  3. Ensure the callback URL matches exactly what's registered

### Notification Permission Issues:
- If notifications don't work on iOS/Android:
  1. Check that permissions are properly requested
  2. Verify notification channel is created (Android specific)
  3. Check that the scheduled times are in the future

### Safe Area Issues:
- If layout looks incorrect on devices with notches:
  1. Verify the viewport meta tag includes `viewport-fit=cover`
  2. Check that CSS uses `env()` functions correctly
  3. Test on various device sizes and orientations

## Next Steps

1. **IMMEDIATELY**: Implement critical security fixes (Phase 0)
2. Implement the haptic feedback system first (lowest risk)
3. Add safe area support 
4. Implement Android back button handling
5. Deploy notification system with proper testing
6. Update environment configurations
7. Test thoroughly on physical devices
8. Prepare for app store submission