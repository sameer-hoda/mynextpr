// src/integrations/auth/localAuth.ts

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export class LocalAuthService {
  private static instance: LocalAuthService;
  private currentUser: User | null = null;
  private authStateListeners: Array<(user: User | null) => void> = [];

  private constructor() {
    this.checkStoredSession();
  }

  static getInstance(): LocalAuthService {
    if (!LocalAuthService.instance) {
      LocalAuthService.instance = new LocalAuthService();
    }
    return LocalAuthService.instance;
  }

  private checkStoredSession() {
    console.debug("DEBUG: Checking for stored session");
    const storedUser = localStorage.getItem('local_auth_session');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        console.debug("DEBUG: Restored session for user:", this.currentUser.id);
      } catch (e) {
        console.error("DEBUG: Error restoring session from storage:", e);
        localStorage.removeItem('local_auth_session');
      }
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
    console.debug("DEBUG: Starting Google sign in with local auth");
    try {
      // For local authentication, we'll simulate Google login
      // In a real scenario, you'd integrate with Google OAuth API
      const userId = crypto.randomUUID();
      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        user_metadata: {
          full_name: 'John Doe',
          name: 'John Doe',
          avatar_url: 'https://via.placeholder.com/150'
        }
      };

      console.debug("DEBUG: Created mock user:", mockUser);
      this.currentUser = mockUser;
      localStorage.setItem('local_auth_session', JSON.stringify(mockUser));
      
      this.notifyAuthStateChange(mockUser);
      console.debug("DEBUG: Google sign in completed successfully");
      
      return { data: { user: mockUser }, error: null };
    } catch (error) {
      console.error("DEBUG: Error during Google sign in:", error);
      return { data: null, error };
    }
  }

  async signInWithPassword(email: string, password: string) {
    console.debug("DEBUG: Starting password sign in for:", email);
    try {
      const storedUsers = JSON.parse(localStorage.getItem('local_users') || '{}');
      const user = storedUsers[email];
      
      if (user && user.password === password) {
        this.currentUser = user;
        localStorage.setItem('local_auth_session', JSON.stringify(user));
        this.notifyAuthStateChange(user);
        
        console.debug("DEBUG: Password sign in completed successfully for:", email);
        return { data: { user }, error: null };
      } else {
        console.error("DEBUG: Invalid credentials for:", email);
        return { data: null, error: { message: 'Invalid credentials' } };
      }
    } catch (error) {
      console.error("DEBUG: Error during password sign in:", error);
      return { data: null, error };
    }
  }

  async signUp(email: string, password: string) {
    console.debug("DEBUG: Starting sign up for:", email);
    try {
      let storedUsers = JSON.parse(localStorage.getItem('local_users') || '{}');
      
      if (storedUsers[email]) {
        console.error("DEBUG: User already exists:", email);
        return { data: null, error: { message: 'User already exists' } };
      }
      
      const userId = crypto.randomUUID();
      const user: User = {
        id: userId,
        email,
        user_metadata: {
          name: email.split('@')[0],
        }
      };
      
      storedUsers[email] = user;
      localStorage.setItem('local_users', JSON.stringify(storedUsers));
      
      this.currentUser = user;
      localStorage.setItem('local_auth_session', JSON.stringify(user));
      
      this.notifyAuthStateChange(user);
      console.debug("DEBUG: Sign up completed successfully for:", email);
      
      return { data: { user }, error: null };
    } catch (error) {
      console.error("DEBUG: Error during sign up:", error);
      return { data: null, error };
    }
  }

  async signOut() {
    console.debug("DEBUG: Starting sign out process");
    try {
      this.currentUser = null;
      localStorage.removeItem('local_auth_session');
      
      this.notifyAuthStateChange(null);
      console.debug("DEBUG: Sign out completed successfully");
      
      return { error: null };
    } catch (error) {
      console.error("DEBUG: Error during sign out:", error);
      return { error };
    }
  }

  getSession() {
    console.debug("DEBUG: Getting current session");
    const session = this.currentUser ? { 
      user: this.currentUser,
      expires_at: null // No expiration for local auth
    } : null;
    
    console.debug("DEBUG: Current session:", session);
    return { data: { session }, error: null };
  }
}

export const localAuth = LocalAuthService.getInstance();