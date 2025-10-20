// src/pages/Loading.tsx

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import loadingBg from "@/assets/loading-bg.jpg";

const Loading = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const userProfile = location.state;

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    let isGenerating = false;

    const generatePlan = async () => {
      if (isGenerating) return;
      isGenerating = true;

      if (authLoading) {
        // Auth is still loading, wait for the next render.
        return;
      }

      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please log in to generate a plan",
        });
        navigate("/");
        return;
      }

      if (!userProfile) {
        toast({
          title: "Error",
          description: "Missing user profile data",
          variant: "destructive",
        });
        navigate("/onboarding");
        return;
      }

      try {
        console.debug("DEBUG: Checking for existing workouts for user:", user?.id);
        // Check if user already has workouts
        const existingWorkouts = await apiClient.getWorkouts(user!.id);

        if (existingWorkouts && existingWorkouts.length > 0) {
          console.debug("DEBUG: User already has", existingWorkouts.length, "workouts, redirecting to plan");
          // User already has a plan, navigate directly
          navigate("/plan");
          return;
        }

        console.debug("DEBUG: No existing workouts, calling AI to generate plan for user:", user?.id);
        
        // Prepare user data for AI service - transforming field names and values
        const userData = {
          goal_distance: 
            userProfile?.goal_distance === 5 ? '5K' :
            userProfile?.goal_distance === 10 ? '10K' :
            userProfile?.goal_distance === 21.1 ? 'Half Marathon' :
            userProfile?.goal_distance === 42.2 ? 'Marathon' : userProfile?.goal_distance,
          goal_time: userProfile?.goal_time,
          fitness_level: 
            userProfile?.fitness_level === 'beginner' ? 'Beginner' :
            userProfile?.fitness_level === 'intermediate' ? 'Intermediate' :
            userProfile?.fitness_level === 'advanced' ? 'Advanced' : userProfile?.fitness_level,
          age: 
            userProfile?.age === '30-39' ? '35' :
            userProfile?.age === '40-49' ? '45' :
            userProfile?.age === '50-59' ? '55' :
            userProfile?.age === '60+' ? '60' : userProfile?.age,
          sex: userProfile?.sex,
          coach_persona: userProfile?.coach_persona || 'Balanced'
        };

        // Generate plan using AI
        try {
          // Call the new AI endpoint
          const response = await apiClient.generatePlanWithAI(userData);
          
          if (response && response.plan && response.plan.workouts) {
            console.debug("DEBUG: AI plan generated successfully with", response.plan.workouts.length, "workouts");
            
            // The plan and workouts are already saved in the backend database
            // Just store the plan in localStorage for backward compatibility
            localStorage.setItem('runningPlan', JSON.stringify(response.plan.workouts));
            
            // Navigate to plan page
            navigate("/plan");
          } else {
            console.error("DEBUG: AI response did not contain valid plan data:", response);
            throw new Error("Invalid response from AI service");
          }
        } catch (aiError) {
          console.error("Error with AI plan generation:", aiError);
          
          // Inform the user and redirect
          toast({
            variant: "destructive",
            title: "Plan Generation Failed",
            description: "There was an error creating your plan. Please try again.",
            duration: 5000,
          });
      
          // Log the failure for debugging
          // (This could be a call to a logging service in the future)
          console.error("AI_PLAN_GENERATION_FAILED for user:", user?.id, "with profile:", userProfile);
      
          // Redirect back to the onboarding page to allow the user to retry
          navigate("/onboarding");
        }
      } catch (error) {
        console.error('Error generating plan:', error);
        toast({
          title: "Error generating plan",
          description: "Please try again later",
          variant: "destructive",
        });
        navigate("/onboarding");
      }
    };

    generatePlan();
  }, [navigate, userProfile, toast, user, authLoading]);

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${loadingBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl">
        {/* Message */}
        <div className="text-center mb-16">
          <p className="text-2xl font-light text-white/90 tracking-wide">
            Warming up your plan…
          </p>
        </div>

        {/* Progress Bar with Sprinting Runner */}
        <div className="relative w-full h-1 bg-white/20 rounded-full overflow-visible">
          {/* Glowing Runner Icon */}
          <div className="runner-icon absolute -top-4 left-0 text-3xl animate-sprint">
            ⚡️
          </div>
          
          {/* Progress Fill */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 rounded-full animate-color-shift" />
        </div>
      </div>

      <style>{`
        @keyframes sprint {
          0% {
            left: -5%;
            filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.8));
          }
          25% {
            left: 20%;
            filter: drop-shadow(0 0 12px rgba(168, 85, 247, 0.8));
          }
          50% {
            left: 50%;
            filter: drop-shadow(0 0 8px rgba(20, 184, 166, 0.8));
          }
          75% {
            left: 80%;
            filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.8));
          }
          100% {
            left: 105%;
            filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.8));
          }
        }

        @keyframes color-shift {
          0% {
            background: linear-gradient(90deg, rgba(56, 189, 248, 0.6) 0%, rgba(168, 85, 247, 0.6) 50%, rgba(20, 184, 166, 0.6) 100%);
          }
          33% {
            background: linear-gradient(90deg, rgba(168, 85, 247, 0.6) 0%, rgba(20, 184, 166, 0.6) 50%, rgba(59, 130, 246, 0.6) 100%);
          }
          66% {
            background: linear-gradient(90deg, rgba(20, 184, 166, 0.6) 0%, rgba(59, 130, 246, 0.6) 50%, rgba(56, 189, 248, 0.6) 100%);
          }
          100% {
            background: linear-gradient(90deg, rgba(56, 189, 248, 0.6) 0%, rgba(168, 85, 247, 0.6) 50%, rgba(20, 184, 166, 0.6) 100%);
          }
        }

        .animate-sprint {
          animation: sprint 3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        .animate-color-shift {
          animation: color-shift 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Loading;