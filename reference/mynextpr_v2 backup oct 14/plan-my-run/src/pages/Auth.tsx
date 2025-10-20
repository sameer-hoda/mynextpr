// src/pages/Auth.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { googleAuth } from "@/integrations/auth/googleAuth";
import { apiClient } from "@/integrations/api/client";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.debug("DEBUG: Auth page mounted - checking session");
    
    // Check if user is already logged in by validating session with backend
    const checkSession = async () => {
      // This will fetch the user from backend if session exists
      const user = await googleAuth.handleOAuthCompletion();
      if (user) {
        console.debug("DEBUG: User already logged in, redirecting to coach-selection");
        // Check if user is a Google user and get their display name
        const displayName = user.displayName || 
                           user.user_metadata?.full_name || 
                           user.user_metadata?.name || 
                           user.email?.split('@')[0] || 
                           'User';
        
        // Create or update profile with display name
        await apiClient.createOrUpdateProfile(user.id, displayName);
        console.debug("DEBUG: Profile created/updated for user:", user.id);
        navigate("/coach-selection");
      }
    };
    
    checkSession();

    // Listen for auth changes
    console.debug("DEBUG: Setting up auth state change listener in Auth component");
    const unsubscribe = googleAuth.onAuthStateChange((user) => {
      if (user) {
        console.debug("DEBUG: User signed in in Auth component, redirecting to coach-selection");
        // Check if user is a Google user and get their display name
        const displayName = user.displayName || 
                           user.user_metadata?.full_name || 
                           user.user_metadata?.name || 
                           user.email?.split('@')[0] || 
                           'User';
        
        // Create or update profile with display name
        apiClient.createOrUpdateProfile(user.id, displayName).then(() => {
          console.debug("DEBUG: Profile created/updated for user:", user.id);
          navigate("/coach-selection");
        }).catch(err => {
          console.error("DEBUG: Error creating profile:", err);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create user profile",
          });
        });
      }
    });

    return () => {
      console.debug("DEBUG: Cleaning up auth state change listener in Auth component");
      unsubscribe();
    };
  }, [navigate]);

  const handleGoogleLogin = async () => {
    console.debug("DEBUG: handleGoogleLogin called");
    try {
      setLoading(true);
      
      const result = await googleAuth.signInWithGoogle();
      if (result.error) throw result.error;
      
      console.debug("DEBUG: Google login initiated");
      // The actual navigation happens after the OAuth flow completes
    } catch (error: any) {
      console.error("DEBUG: Error in handleGoogleLogin:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign in with Google",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto space-y-8 text-center">
          {/* Logo */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">AI-Powered Training</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
            Welcome to Your
            <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Running Journey
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-muted-foreground leading-relaxed">
            Sign in to get your personalized training plan and start achieving your running goals.
          </p>

          {/* Auth Buttons */}
          <div className="space-y-3 pt-4">
            <Button 
              size="lg" 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="w-full gap-2 shadow-lg hover:shadow-xl transition-all"
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
                  Continue with Google
                </>
              )}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;