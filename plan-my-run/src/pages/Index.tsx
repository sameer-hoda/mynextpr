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
          console.log('[DEBUG] Index.tsx useEffect triggered', { authLoading, user });
          if (authLoading) {
            console.log('[DEBUG] Auth is loading, returning');
            return; // Wait for auth to resolve
          }
          if (user) {
            console.log('[DEBUG] User is present, checking for plan', user.id);
            setLoading(true);
            apiClient.hasPlan(user.id)
              .then(response => {
                console.log('[DEBUG] hasPlan response:', response);
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
      className="h-screen overflow-hidden relative flex flex-col items-center justify-between py-12 px-4"
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
          mynextpr
        </h1>
      </div>
      <div className="flex-1" />
      <div className="relative z-10 pb-12 text-center">
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