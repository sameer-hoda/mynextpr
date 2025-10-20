# Detailed Implementation Guide for Google Login Integration

## Overview
This document provides a comprehensive, step-by-step guide for implementing Google login functionality in the Runna application. The implementation uses Supabase's built-in OAuth provider with Google, enhanced with custom profile handling and a React Context for authentication state management.

## Table of Contents
1. [Current State Analysis](#1-current-state-analysis)
2. [Issues Identified and Fixed](#2-issues-identified-and-fixed)
3. [Implementation Steps](#3-implementation-steps)
4. [Files Modified](#4-files-modified)
5. [Implementation Details](#5-implementation-details)
6. [Testing and Verification](#6-testing-and-verification)
7. [Security Considerations](#7-security-considerations)
8. [Troubleshooting](#8-troubleshooting)

## 1. Current State Analysis

### 1.1 Initial Assessment
- **Google login was already implemented**: Found that Google login functionality was already present in `Auth.tsx` using Supabase OAuth
- **Partial implementation**: The login worked but needed improvements in profile handling and logout functionality
- **Missing context**: No centralized authentication state management across the application

### 1.2 Technologies Used
- **Frontend**: React with TypeScript
- **Authentication**: Supabase Auth with Google OAuth provider
- **State Management**: Custom React Context (`AuthContext`)
- **UI Components**: shadcn/ui components

## 2. Issues Identified and Fixed

### 2.1 Duplicate Variable Declaration
- **File**: `src/pages/Journal.tsx`
- **Issue**: Duplicate declaration of `completedWorkouts` constant and state variable
- **Fix**: Removed the duplicate constant declaration, keeping only the state variable

### 2.2 Inconsistent Authentication Handling
- **Issue**: Each authenticated page was checking session individually using direct Supabase calls
- **Fix**: Implemented centralized AuthContext for consistent authentication management

### 2.3 Limited Profile Information
- **Issue**: Google user profile information was not being properly captured and stored
- **Fix**: Enhanced profile creation to extract display name from Google OAuth metadata

## 3. Implementation Steps

### 3.1 Step 1: Fix Duplicate Variable Declaration
```typescript
// File: src/pages/Journal.tsx
// Removed duplicate constant declaration of completedWorkouts
// Kept only the state variable: const [completedWorkouts, setCompletedWorkouts] = useState<any[]>([]);
```

### 3.2 Step 2: Create Authentication Context
```typescript
// File: src/contexts/AuthContext.tsx
// Created a new context to manage authentication state across the application
```

**Key Features of AuthContext:**
- Manages user session state
- Provides sign in and sign out methods
- Handles profile information
- Listens to Supabase auth state changes
- Includes loading state management

### 3.3 Step 3: Update App.tsx to Include Auth Provider
```typescript
// File: src/App.tsx
// Wrapped the application with AuthProvider to make context available globally
```

### 3.4 Step 4: Enhance Google OAuth in Auth.tsx
```typescript
// File: src/pages/Auth.tsx
// Updated Google login to request proper scopes and handle profile data
```

**Enhancements:**
- Added `access_type: 'offline'` and `prompt: 'consent'` parameters
- Improved profile handling to extract display name from Google metadata
- Enhanced error handling and user feedback

### 3.5 Step 5: Update All Authenticated Pages
Updated the following pages to use AuthContext:

#### 5.1 Journal.tsx
- Added `useAuth` hook import
- Replaced direct Supabase session checks with context
- Updated logout function to use context method

#### 5.2 Plan.tsx
- Added `useAuth` hook import
- Replaced direct Supabase session checks with context
- Updated logout function to use context method

#### 5.3 CoachSelection.tsx
- Added `useAuth` hook import
- Updated authentication check to use context

#### 5.4 Onboarding.tsx
- Added `useAuth` hook import
- Updated authentication check to use context

#### 5.5 Loading.tsx
- Added `useAuth` hook import
- Updated authentication check to use context
- Added auth loading state to dependency array

#### 5.6 ResetData.tsx
- Added `useAuth` hook import
- Updated authentication check to use context

## 4. Files Modified

### 4.1 Files Created
- `src/contexts/AuthContext.tsx` - New authentication context implementation

### 4.2 Files Modified

#### 4.2.1 src/App.tsx
- Added import for `AuthProvider`
- Wrapped application with `AuthProvider`
- Updated JSX structure to include context provider

#### 4.2.2 src/pages/Auth.tsx
- Enhanced Google OAuth flow with additional parameters
- Improved profile creation with Google metadata
- Added display name extraction from user metadata
- Updated both Google login and mock login functions

#### 4.2.3 src/pages/Journal.tsx
- Fixed duplicate variable declaration
- Added `useAuth` hook import
- Replaced Supabase auth checks with context
- Updated logout function to use context

#### 4.2.4 src/pages/Plan.tsx
- Added `useAuth` hook import
- Replaced Supabase auth checks with context
- Updated logout function to use context

#### 4.2.5 src/pages/CoachSelection.tsx
- Added `useAuth` hook import
- Replaced Supabase auth checks with context

#### 4.2.6 src/pages/Onboarding.tsx
- Added `useAuth` hook import
- Replaced Supabase auth checks with context

#### 4.2.7 src/pages/Loading.tsx
- Added `useAuth` hook import
- Replaced Supabase auth checks with context
- Added auth loading state to dependency array

#### 4.2.8 src/pages/ResetData.tsx
- Added `useAuth` hook import
- Added Supabase client import
- Added auth check using context

## 5. Implementation Details

### 5.1 Authentication Flow
1. User clicks "Continue with Google" on the `/auth` page
2. Supabase initiates Google OAuth flow with proper scopes
3. User authenticates with Google and consents to data sharing
4. User is redirected back to the application with authentication tokens
5. Application captures user profile data and creates/updates profile in database
6. User is redirected to `/coach-selection` page

### 5.2 Profile Data Handling
When a user signs in with Google, the system:

1. **Extracts display name** from Google user metadata with fallbacks:
   - First tries `full_name` from user metadata
   - Falls back to `name` if available
   - Uses email prefix if name isn't available
   - Defaults to 'User' if no information is found

2. **Creates or updates the profile** in the database:
   ```typescript
   supabase
     .from('profiles')
     .upsert({ 
       user_id: session.user.id,
       display_name: displayName
     })
   ```

### 5.3 Centralized Authentication Context
The AuthContext provides:

- **Global state management** for authentication across the application
- **Consistent user data** available in all components
- **Loading state** to handle authentication status
- **Unified methods** for sign in, sign out, and profile updates
- **Automatic session management** when Supabase auth state changes

```typescript
interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

### 5.4 Protected Routes
All authenticated pages implement the same pattern:

```typescript
const { user, loading: authLoading } = useAuth();

useEffect(() => {
  if (!user && !authLoading) {
    navigate("/auth");
  }
}, [user, authLoading, navigate]);
```

## 6. Testing and Verification

### 6.1 Testing Checklist

#### Basic Functionality
- [ ] Google login button works and redirects to Google OAuth flow
- [ ] User can authenticate with Google and returns to application
- [ ] User profile is created/updated with appropriate display name
- [ ] User is redirected to `/coach-selection` after login

#### Authentication Protection
- [ ] Non-authenticated users are redirected to `/auth` when accessing protected pages
- [ ] Loading states are properly handled during authentication checks
- [ ] Authenticated users can access all restricted pages

#### Logout Functionality
- [ ] Logout button works on all authenticated pages
- [ ] User session is properly cleared
- [ ] User is redirected to home page after logout
- [ ] User cannot access authenticated pages after logout

#### Profile Handling
- [ ] Display name is properly extracted from Google account
- [ ] Profile is created in database with correct user ID
- [ ] Profile data is available across the application

### 6.2 Testing Scenarios

#### Scenario 1: First-time Google Login
1. Navigate to `/auth`
2. Click "Continue with Google"
3. Authenticate with Google
4. Verify profile is created with display name
5. Verify redirect to `/coach-selection`

#### Scenario 2: Returning Google User
1. Log in with Google (if not already logged in)
2. Log out
3. Log in again with Google
4. Verify profile data is preserved
5. Verify consistent experience

#### Scenario 3: Logout Flow
1. Authenticate with Google
2. Navigate to Plan or Journal page
3. Click logout button
4. Verify redirect to home page
5. Verify inability to access authenticated pages

## 7. Security Considerations

### 7.1 Database Security
- **Row Level Security (RLS)** is enabled on the `profiles` table
- Users can only access their own profile data
- Policies ensure data privacy and prevent unauthorized access

### 7.2 Session Management
- **Secure token storage** using configured Supabase storage
- **Automatic session refresh** to maintain active sessions
- **Proper session cleanup** during logout

### 7.3 OAuth Security
- **Proper redirect URIs** should be configured in Supabase dashboard
- **HTTPS** should be used in production environments
- **OAuth scopes** are appropriately requested for needed data

## 8. Additional Enhancement: Direct Google Login from Landing Page

### 8.1 Updated Landing Page Flow
The implementation was further enhanced to allow users to initiate Google authentication directly from the landing page (`/`) instead of having to navigate to the `/auth` page first.

#### 8.1.1 Changes to Index.tsx:
- Added imports for `useNavigate`, `useAuth`, `useState`, `useEffect`, and `Loader2`
- Implemented automatic redirect to `/coach-selection` if user is already logged in
- Replaced the link to `/auth` with direct Google authentication call
- Added loading state to the Google login button
- Updated button click handler to call `signInWithGoogle()` method from AuthContext

#### 8.1.2 Updated Flow:
1. User lands on the main page (`/`)
2. If already logged in, they are automatically redirected to `/coach-selection`
3. If not logged in, clicking "Login with Google" immediately triggers the Google OAuth flow
4. After successful authentication, user is redirected to `/coach-selection`

#### 8.1.3 Benefits:
- Streamlined user experience with one less step
- Direct access to authentication from the main page
- Consistent with modern app patterns

## 9. Troubleshooting

### 9.1 Common Issues

#### Issue 1: Google OAuth Not Working
**Symptoms:** Clicking "Continue with Google" doesn't initiate OAuth flow
**Solutions:**
- Verify OAuth provider is enabled in Supabase dashboard
- Check that Google OAuth credentials are properly configured
- Ensure redirect URLs are correctly set in both Supabase and Google Cloud Console
- Add `http://localhost:8081/coach-selection` (or your production URL) to the authorized redirect URLs in Supabase

#### Issue 2: Profile Not Created After Login
**Symptoms:** User logs in successfully but profile data is missing
**Solutions:**
- Verify `profiles` table exists with correct schema
- Check RLS policies are properly configured
- Confirm Supabase service role has necessary permissions

#### Issue 3: Authentication State Inconsistency
**Symptoms:** Different pages show different authentication states
**Solutions:**
- Verify AuthContext is properly wrapped around the application
- Check that all pages are using the context consistently
- Confirm useEffect dependencies include auth loading state

#### Issue 4: Redirect URL Errors
**Symptoms:** After Google authentication, getting an error page
**Solutions:**
- Make sure to configure authorized redirect URLs in Supabase dashboard
- Add your domain (e.g., `http://localhost:8081/coach-selection`) to the redirect URLs
- For development: `http://localhost:8081/*`
- For production: your actual domain URLs

### 9.2 Debugging Steps

#### 1. Check Console for Errors
```bash
# Enable verbose logging in browser dev tools
# Look for any authentication-related errors
```

#### 2. Verify Supabase Configuration
```typescript
// Check Supabase client configuration in src/integrations/supabase/client.ts
// Verify environment variables are properly loaded
```

#### 3. Test Authentication Flow Manually
- Navigate directly to `/auth`
- Attempt login with test Google account
- Monitor network requests and responses
- Check browser storage for authentication tokens

#### 4. Test Landing Page Flow
- Visit the main page (`/`)
- Click "Login with Google" button
- Verify OAuth flow initiates correctly
- Check that redirect after login works properly

### 9.3 Required Environment Variables
Ensure the following are properly configured:

#### Frontend (plan-my-run/.env):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

#### Backend Configuration (Supabase Dashboard):
- Google OAuth Client ID
- Google OAuth Client Secret  
- Authorized redirect URIs for your domain (e.g., `http://localhost:8081/*`, `http://localhost:8081/coach-selection`)

## Conclusion

This implementation provides a robust, secure, and maintainable Google login solution for the Runna application. The centralized authentication context ensures consistent behavior across all pages while maintaining proper security practices and user experience standards.

The solution is production-ready with appropriate error handling, security considerations, and comprehensive testing procedures. The enhanced landing page flow provides an even more streamlined user experience by allowing direct authentication from the main page.