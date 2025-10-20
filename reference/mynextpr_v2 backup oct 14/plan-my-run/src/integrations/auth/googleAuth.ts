// src/integrations/auth/googleAuth.ts

interface User {
  id: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private currentUser: User | null = null;
  private authStateListeners: Array<(user: User | null) => void> = [];

  private constructor() {
    this.checkStoredSession();
  }

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  checkStoredSession() {
    console.debug("DEBUG: Checking for stored Google OAuth session");
    // For session-based auth, we need to check with the backend
    return this.validateSession();
  }

  private async validateSession() {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/auth/me`, {
        method: 'GET',
        credentials: 'include', // Important: include cookies for session
      });
      
      if (response.ok) {
        const { user } = await response.json();
        this.currentUser = {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          user_metadata: {
            full_name: user.displayName,
            avatar_url: user.avatar
          }
        };
        console.debug("DEBUG: Restored session for user:", this.currentUser.id);
        // Notify all listeners of the state change
        this.notifyAuthStateChange(this.currentUser);
        return this.currentUser;
      } else {
        console.debug("DEBUG: No valid session found");
        this.currentUser = null;
        this.notifyAuthStateChange(null);
        return null;
      }
    } catch (error) {
      console.error("DEBUG: Error validating session:", error);
      this.currentUser = null;
      this.notifyAuthStateChange(null);
      return null;
    }
  }

  private notifyAuthStateChange(user: User | null) {
    console.debug("DEBUG: Notifying auth state change to", this.authStateListeners.length, "listeners");
    this.authStateListeners.forEach(listener => listener(user));
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    console.debug("DEBUG: Adding auth state listener");
    this.authStateListeners.push(callback);
    
    // Call immediately with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
      console.debug("DEBUG: Removed auth state listener");
    };
  }

  async signInWithGoogle() {
    console.debug("DEBUG: Starting real Google sign in");
    try {
      // Open Google OAuth popup by redirecting to backend endpoint
      window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/auth/google`;
      
      // This will redirect the user to Google for authentication
      // After successful authentication, they'll be redirected back to the frontend
      return { data: null, error: null }; // We return null here as the redirect handles the rest
    } catch (error) {
      console.error("DEBUG: Error during Google sign in:", error);
      return { data: null, error };
    }
  }
  
  // Method to handle OAuth completion when user returns from Google
  async handleOAuthCompletion() {
    console.debug("DEBUG: Handling OAuth completion");
    // Try to validate the session with the backend
    const user = await this.validateSession();
    return user;
  }

  async signInWithPassword(email: string, password: string) {
    console.debug("DEBUG: GoogleAuthService does not support password login");
    return { data: null, error: { message: 'Password login not supported' } };
  }

  async signUp(email: string, password: string) {
    console.debug("DEBUG: GoogleAuthService does not support sign up");
    return { data: null, error: { message: 'Sign up not supported' } };
  }

  async signOut() {
    console.debug("DEBUG: Starting Google sign out process");
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Important: include cookies for session
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        this.currentUser = null;
        this.notifyAuthStateChange(null);
        console.debug("DEBUG: Google sign out completed successfully");
        return { error: null };
      } else {
        const errorData = await response.json();
        console.error("DEBUG: Error during sign out:", errorData);
        return { error: errorData };
      }
    } catch (error) {
      console.error("DEBUG: Error during Google sign out:", error);
      return { error };
    }
  }

  getSession() {
    console.debug("DEBUG: Getting Google auth session");
    const session = this.currentUser ? { 
      user: this.currentUser,
    } : null;
    
    console.debug("DEBUG: Current session:", session);
    return { data: { session }, error: null };
  }
}

export const googleAuth = GoogleAuthService.getInstance();