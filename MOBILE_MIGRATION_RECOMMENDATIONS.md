# Comprehensive Recommendations for Runna Mobile Migration

## Executive Summary
The Runna application has made significant progress in its mobile migration with JWT authentication already implemented. However, critical native features and security enhancements are missing. This document provides a prioritized roadmap to complete the mobile migration successfully.

## Critical Mobile Features to Implement

### 1. Haptic Feedback System
**Priority: High**

#### Implementation:
```typescript
// src/hooks/useNativeFeedback.ts
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

#### Integration Points:
- Onboarding form submission
- Workout completion
- Plan generation
- Button presses for critical actions

### 2. Local Notification System
**Priority: High**

#### Implementation:
```typescript
// src/services/notificationService.ts
import { LocalNotifications, NotificationChannel } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export class NotificationService {
  static async requestPermission() {
    if (Capacitor.isNativePlatform()) {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    }
    return false;
  }

  static async createNotificationChannel() {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'workout-reminders',
          name: 'Workout Reminders',
          description: 'Notifications for upcoming workouts',
          importance: 4, // High importance
          visibility: 1, // Private
        });
      } catch (error) {
        console.warn('Could not create notification channel:', error);
      }
    }
  }

  static async scheduleWorkoutNotification(workout: any) {
    if (!Capacitor.isNativePlatform()) return;
    
    const notificationTime = new Date(workout.scheduled_date);
    // Schedule 1 hour before workout time
    notificationTime.setHours(notificationTime.getHours() - 1);
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: parseInt(workout.id.slice(-6)) || Date.now(), // Ensure numeric ID
          title: `Time for your ${workout.type.replace('_', ' ')}: ${workout.title}`,
          body: `Your ${workout.title} is scheduled for today! ${workout.description}`,
          schedule: { at: notificationTime, allowWhileIdle: true },
          channelId: 'workout-reminders',
          extra: {
            workoutId: workout.id,
            type: 'workout-reminder',
          },
        },
      ],
    });
  }

  static async cancelNotifications() {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancelAll();
    }
  }
}
```

#### Integration Points:
- When user generates a new plan
- When workouts are updated
- When user resets their data

### 3. Android Back Button Handling
**Priority: High**

#### Implementation:
```typescript
// src/hooks/useAndroidBackHandler.ts
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';

export const useAndroidBackHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleBackButton = async () => {
      const currentPath = window.location.pathname;
      
      if (currentPath === '/plan') {
        // Exit app on home screen
        App.exitApp();
      } else if (currentPath === '/onboarding') {
        // Prevent going back from onboarding
        return;
      } else {
        // Navigate to previous page
        navigate(-1);
      }
    };

    const backHandler = App.addListener('backButton', handleBackButton);
    
    return () => {
      backHandler.then(handler => handler.remove()).catch(() => {});
    };
  }, [navigate]);
};
```

#### Integration:
- In main App component
- Ensure it works with React Router

### 4. Safe Area Implementation
**Priority: High**

#### Implementation:
Update index.html:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

Update CSS (index.css):
```css
body {
  padding-top: env(safe-area-inset-top, 0);
  padding-right: env(safe-area-inset-right, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
  padding-left: env(safe-area-inset-left, 0);
}

.safe-area-container {
  padding-top: env(safe-area-inset-top, 20px);
  padding-bottom: env(safe-area-inset-bottom, 20px);
  height: 100vh;
  box-sizing: border-box;
}
```

### 5. Token Refresh Mechanism
**Priority: Medium**

#### Implementation:
```typescript
// src/services/authService.ts
import { Preferences } from '@capacitor/preferences';
import { jwtDecode } from 'jwt-decode';

export class AuthService {
  static async isTokenExpired(token: string): Promise<boolean> {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  static async refreshToken(): Promise<string | null> {
    // Implement refresh token logic here
    // This would require backend support for refresh tokens
    return null;
  }

  static async getValidToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: 'authToken' });
    const token = value || localStorage.getItem('authToken');
    
    if (!token) return null;
    
    const isExpired = await this.isTokenExpired(token);
    if (isExpired) {
      const newToken = await this.refreshToken();
      if (newToken) {
        await Preferences.set({ key: 'authToken', value: newToken });
        localStorage.setItem('authToken', newToken);
        return newToken;
      }
      return null;
    }
    
    return token;
  }
}
```

## Production Configuration Updates

### 1. Environment Variables
Update .env.production in frontend:
```
VITE_BACKEND_URL=https://api.mynextpr.com
VITE_FRONTEND_URL=https://mynextpr.com
```

### 2. Backend URL in OAuth
The Google OAuth callback URL in backend/server.js should be updated to the production URL:
```javascript
callbackURL: "https://mynextpr.com/api/auth/google/callback"
```

### 3. HTTPS and Security Headers
Add security middleware to backend:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

## Offline Support Implementation

### 1. Service Worker for Caching
Create a service worker to cache static assets and allow offline access to the app shell.

### 2. IndexedDB for Offline Data
Implement local data storage for viewing plans offline:
```typescript
// src/services/offlineService.ts
import { openDB, DBSchema } from 'idb';

interface RunnaDB extends DBSchema {
  workouts: {
    key: string;
    value: any;
  };
  plans: {
    key: string;
    value: any;
  };
  profiles: {
    key: string;
    value: any;
  };
}

export const runnaDB = await openDB<RunnaDB>('RunnaDB', 1, {
  upgrade(db) {
    db.createObjectStore('workouts', { keyPath: 'id' });
    db.createObjectStore('plans', { keyPath: 'id' });
    db.createObjectStore('profiles', { keyPath: 'id' });
  },
});
```

## Testing and Quality Assurance

### 1. Mobile-Specific Tests
- Test on multiple device sizes
- Test with different network conditions
- Test offline functionality
- Test push notifications

### 2. Security Testing
- Test token storage security
- Test authentication flows
- Test data encryption
- Test network communication security

## Deployment Strategy

### Phase 1: Core Mobile Features
- Deploy haptic feedback
- Deploy local notifications
- Deploy safe area handling
- Deploy back button handling

### Phase 2: Security Enhancements
- Deploy token refresh mechanism
- Deploy secure storage
- Deploy app integrity checks

### Phase 3: Advanced Features
- Deploy offline support
- Deploy biometric authentication
- Deploy performance monitoring

## Risk Mitigation

### Technical Risks
1. **Push Notification Limitations**: Local notifications are limited compared to push notifications
2. **Device Compatibility**: Different Android versions may have different behaviors
3. **App Store Rejection**: Ensure compliance with app store guidelines

### Mitigation Strategies
1. **Progressive Enhancement**: Ensure all features work in a degraded fashion
2. **Extensive Testing**: Test on multiple devices and platforms
3. **Analytics Integration**: Monitor feature usage and errors
4. **Rollback Plan**: Maintain ability to revert changes quickly