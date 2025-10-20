import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (token) {
        // Store the token in both Capacitor Preferences and localStorage for web compatibility
        await Preferences.set({ key: 'authToken', value: token });
        localStorage.setItem('authToken', token);
        
        // Redirect to the root. The main App/Index component will handle the rest.
        navigate('/');
      } else {
        // Handle error or no token case by sending to the home page.
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [location, navigate]);

  return <div>Loading...</div>;
};

export default AuthCallback;