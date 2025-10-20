# Google Login Integration Documentation

## Overview
This document details the implementation of Google OAuth login functionality in the Runna application. The integration uses Supabase's built-in OAuth provider with Google, enhanced with custom profile handling and a React Context for authentication state management.

## Architecture

### 1. Authentication Flow
- Users can sign in using the "Continue with Google" button on the `/auth` page
- Google OAuth flow is initiated with additional parameters for offline access
- User data is captured during authentication and stored in the profiles table
- User is redirected to `/coach-selection` after successful authentication

### 2. Technology Stack
- **Frontend**: React with TypeScript
- **Authentication**: Supabase Auth with Google OAuth provider
- **State Management**: Custom React Context (`AuthContext`)
- **UI Components**: shadcn/ui components

## Files

### 1. AuthContext (`src/contexts/AuthContext.tsx`)
- Manages authentication state across the entire application
- Provides methods for sign in, sign out, and profile management
- Handles Supabase auth state changes and session management

### 2. Authentication Pages
- **`Auth.tsx`** (`src/pages/Auth.tsx`): Login page with Google OAuth button
- **`Journal.tsx`** (`src/pages/Journal.tsx`): User journal page with logout functionality
- **`Plan.tsx`** (`src/pages/Plan.tsx`): Workout plan page with logout functionality
- **Other authenticated pages**: `CoachSelection`, `Onboarding`, `Loading`, `ResetData`

## Implementation Details

### 1. Google OAuth Configuration
```typescript
const handleGoogleLogin = async () => {
  try {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/coach-selection`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });
    if (error) throw error;
  } catch (error: any) {
    // Handle error
  }
};
```

### 2. Profile Data Handling
- On successful Google authentication, user profile data is extracted from the user metadata:
  - `full_name` or `name` from Google profile
  - If not available, falls back to email prefix or generic 'User'
  - Profile is saved/updated in the `profiles` table with `display_name`

### 3. Protected Routes
All authenticated pages check for user session before rendering:
```typescript
const { user, loading: authLoading } = useAuth();

useEffect(() => {
  if (!user && !authLoading) {
    navigate("/auth");
  }
}, [user, authLoading, navigate]);
```

### 4. Logout Functionality
- Global logout function available through `AuthContext`
- Clears both Supabase session and local state
- Redirects user to home page after logout

## Environment Variables
The application requires the following Google OAuth credentials to be configured in your Supabase dashboard:
- Google OAuth Client ID
- Google OAuth Client Secret
- Authorized redirect URIs for your domain

## Security Considerations
- Profiles table has Row Level Security (RLS) enabled
- Users can only access their own profile data
- Automatic session persistence and refresh
- Secure token storage using localStorage (configurable)

## Error Handling
- Network errors during authentication are caught and displayed
- Invalid session redirects users to login page
- User-friendly toast notifications for success/error states

## User Experience
- Loading states during authentication processes
- Consistent logout capability across all authenticated pages
- Proper redirection after login/logout actions
- Clear error messaging for failed authentication attempts

## Testing
To test the Google login functionality:
1. Navigate to `/auth`
2. Click "Continue with Google"
3. Complete Google authentication flow
4. Verify profile creation and navigation to `/coach-selection`
5. Test logout from any authenticated page

## Troubleshooting
- If Google login doesn't work, verify that OAuth credentials are properly configured in Supabase dashboard
- Check that redirect URLs are correctly configured in Google Cloud Console
- Ensure the `profiles` table exists and RLS policies are properly set up

## Migration Notes
- The `profiles` table includes necessary schema for storing user display names
- RLS policies are in place to ensure data privacy
- The `update_updated_at_column` trigger keeps profile timestamps current