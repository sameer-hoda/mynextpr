// src/pages/ResetData.tsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";

const ResetData = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const resetData = async () => {
      // Check if user is logged in
    if (!user) {
      navigate("/");
      return null;
    }

      try {
        console.debug("DEBUG: Starting data reset for user:", user?.id);
        
        // Call the backend reset endpoint to remove all user data from SQLite
        await apiClient.resetUserData();
        
        console.debug("DEBUG: Backend data reset completed, clearing localStorage data");
        
        // Clear all user data from localStorage
        localStorage.removeItem('runningPlan');
        localStorage.removeItem('local_auth_session');
        
        toast({
          title: "Success",
          description: "All data has been reset successfully",
        });

        // Navigate to onboarding
        setTimeout(() => {
          navigate("/onboarding");
        }, 1000);

      } catch (error) {
        console.error('DEBUG: Error resetting data:', error);
        toast({
          title: "Error",
          description: "Failed to reset data. Please try again.",
          variant: "destructive",
        });
        navigate("/plan");
      }
    };

    resetData();
  }, [navigate, toast, user, authLoading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <div className="animate-spin text-2xl">🔄</div>
        </div>
        <p className="text-lg">Resetting your data...</p>
      </div>
    </div>
  );
};

export default ResetData;