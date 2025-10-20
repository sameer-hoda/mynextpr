import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from '@/contexts/AuthContext'; // Assuming useAuth has a method to set the user from token

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loadUserFromToken } = useAuth(); // You'll need to implement this in your AuthContext

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      const storeTokenAndRedirect = async () => {
        // Store the token
        await Preferences.set({ key: 'authToken', value: token });
        
        // Update the auth context
        await loadUserFromToken(token);

        // Redirect to the main app page
        navigate('/plan');
      };

      storeTokenAndRedirect();
    } else {
      // Handle error or no token case
      navigate('/');
    }
  }, [location, navigate, loadUserFromToken]);

  return <div>Loading...</div>;
};

export default AuthCallback;