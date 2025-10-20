import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from '@/contexts/AuthContext'; // Assuming useAuth has a method to set the user from token

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loadUserFromToken } = useAuth(); // You'll need to implement this in your AuthContext

  useEffect(() => {
    const handleAuthCallback = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (token) {
        // Store the token and load the user profile
        await Preferences.set({ key: 'authToken', value: token });
        await loadUserFromToken(token);

        // After user is loaded, check for a plan and redirect
        // Note: We are navigating from the callback, but the main Index page also has this logic.
        // This ensures a smooth flow even if the user lands here directly.
        navigate('/plan'); 
      } else {
        // Handle error or no token case
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [location, navigate, loadUserFromToken]);

  return <div>Loading...</div>;
};

export default AuthCallback;