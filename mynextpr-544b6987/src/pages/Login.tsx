import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      localStorage.setItem('google_token', token);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        // Check quota before redirecting
        const res = await fetch(`${apiUrl}/api/quota`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          // If quota exceeded (>= 3 and not unlimited), go to result page to show unlock option
          if (data.usage_count >= 3 && !data.is_unlimited) {
            toast.success("Welcome back!");
            navigate("/result");
            return;
          }
        }
      } catch (e) {
        console.error("Failed to check quota", e);
      }

      toast.success("Successfully logged in!");
      navigate("/upload");
    },
    onError: () => {
      toast.error("Login Failed");
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute inset-0 bg-gray-900 transition-opacity duration-700 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`} />
        <img
          src="/lovable-uploads/27181310-92a0-4227-990a-4c6a6783842c.png"
          alt="Runner Background"
          className={`w-full h-full object-cover transition-opacity duration-1000 ${imageLoaded ? 'opacity-40' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90" />
      </div>

      {/* Content */}
      <section className="relative z-10 w-full max-w-md px-6 flex flex-col items-center text-center animate-fade-in">
        <div className="mb-8 p-4 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 shadow-xl">
          <img
            src="/mynextpr_logo.png"
            alt="MyNextPR Logo"
            className="w-16 h-16 object-contain"
          />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          MyNextPR
        </h1>

        <p className="text-lg text-gray-300 mb-6 max-w-sm leading-relaxed">
          AI-Powered Gait Analysis to unlock your running potential.
        </p>

        <div className="mb-10 text-sm text-gray-400 font-medium tracking-wide">
          <span className="text-brand-primary">Login</span>
          <span className="mx-2">→</span>
          <span className="text-gray-300">Upload Image</span>
          <span className="mx-2">→</span>
          <span className="text-brand-secondary">Get Analysis</span>
        </div>

        <div className="w-full flex justify-center">
          <button
            onClick={() => login()}
            className="flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 font-semibold py-3.5 px-8 rounded-full transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg w-full max-w-xs"
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-5 h-5"
            />
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Footer Text - Removed as per request */}
      </section>
    </div>
  );
};

export default Login;
