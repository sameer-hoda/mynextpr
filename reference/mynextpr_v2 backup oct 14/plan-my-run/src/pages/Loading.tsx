// src/pages/Loading.tsx

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { googleAuth } from "@/integrations/auth/googleAuth";
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

      if (!userProfile) {
        toast({
          title: "Error",
          description: "Missing user profile data",
          variant: "destructive",
        });
        navigate("/onboarding");
        return;
      }

      // Wait for auth to finish loading, then check if user is logged in
      if (authLoading) {
        // Wait a bit more for auth to load
        setTimeout(() => {
          // Trigger re-check
          const checkAuth = async () => {
            const user = await googleAuth.handleOAuthCompletion();
            if (!user && !authLoading) {
              toast({
                variant: "destructive",
                title: "Error",
                description: "Please log in to generate a plan",
              });
              navigate("/auth");
            }
          };
          checkAuth();
        }, 500);
        return;
      }

      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please log in to generate a plan",
        });
        navigate("/auth");
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
          
          // Fallback to mock data generation if AI fails
          toast({
            title: "AI Service Unavailable",
            description: "Using default plan. Please try again later.",
            variant: "default",
          });
          
          // Create fallback mock workouts based on user profile
          const mockWorkouts = [
            {
              plan_id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              user_id: user!.id,
              day: 1,
              title: "Easy Recovery Run",
              type: "easy_run",
              description: "Gentle pace to recover from weekend long run. Focus on form and breathing.",
              completed: false,
              scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
              duration_minutes: 30,
              distance_km: 5,
              rating: null,
              user_notes: null,
              warmup: "5 min easy jog",
              main_set: "20 min easy pace",
              cooldown: "5 min easy jog",
            },
            {
              plan_id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              user_id: user!.id,
              day: 2,
              title: "Speed Intervals",
              type: "intervals",
              description: "8x400m at 5K pace with 90s recovery. Warm up 10 min, cool down 10 min.",
              completed: false,
              scheduled_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // 2 days from now
              duration_minutes: 45,
              distance_km: 8,
              rating: null,
              user_notes: null,
              warmup: "10 min easy jog",
              main_set: "8x400m at 5K pace with 90s recovery",
              cooldown: "10 min easy jog",
            },
            {
              plan_id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              user_id: user!.id,
              day: 3,
              title: "Tempo Run",
              type: "tempo_run",
              description: "20 minutes at comfortably hard pace. Should feel like 7-8/10 effort.",
              completed: false,
              scheduled_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], // 3 days from now
              duration_minutes: 40,
              distance_km: 7,
              rating: null,
              user_notes: null,
              warmup: "10 min easy jog",
              main_set: "20 min tempo pace",
              cooldown: "10 min easy jog",
            },
            {
              plan_id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              user_id: user!.id,
              day: 4,
              title: "Easy Morning Run",
              type: "easy_run",
              description: "Conversational pace. If you can't hold a conversation, slow down!",
              completed: false,
              scheduled_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0], // 4 days from now
              duration_minutes: 35,
              distance_km: 6,
              rating: null,
              user_notes: null,
              warmup: "5 min easy jog",
              main_set: "25 min easy conversational pace",
              cooldown: "5 min easy jog",
            },
            {
              plan_id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              user_id: user!.id,
              day: 5,
              title: "Hill Repeats",
              type: "strength",
              description: "6x2min uphill at hard effort. Walk/jog down for recovery.",
              completed: false,
              scheduled_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], // 5 days from now
              duration_minutes: 50,
              distance_km: 8,
              rating: null,
              user_notes: null,
              warmup: "10 min easy jog",
              main_set: "6x2min hill repeats with walk recovery",
              cooldown: "10 min easy jog",
            },
            {
              plan_id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              user_id: user!.id,
              day: 6,
              title: "Rest Day",
              type: "rest",
              description: "Active recovery. Light stretching or yoga recommended.",
              completed: false,
              scheduled_date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0], // 6 days from now
              duration_minutes: null,
              distance_km: null,
              rating: null,
              user_notes: null,
              warmup: null,
              main_set: "Rest and recovery",
              cooldown: null,
            },
            {
              plan_id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              user_id: user!.id,
              day: 7,
              title: "Long Run",
              type: "long_run",
              description: "Build your endurance. Keep it conversational for the first hour.",
              completed: false,
              scheduled_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // 7 days from now
              duration_minutes: 70,
              distance_km: 12,
              rating: null,
              user_notes: null,
              warmup: "10 min easy jog",
              main_set: "50 min long run at easy pace",
              cooldown: "10 min easy jog",
            },
          ];

          // Create workouts in the database
          for (const workout of mockWorkouts) {
            await apiClient.createWorkout(workout);
          }

          console.debug("DEBUG: Created", mockWorkouts.length, "fallback workouts for user:", user?.id);
          
          // Create a mock plan in the database
          const displayGoalDistance = 
            userProfile?.goal_distance === 5 ? '5K' :
            userProfile?.goal_distance === 10 ? '10K' :
            userProfile?.goal_distance === 21.1 ? 'Half Marathon' :
            userProfile?.goal_distance === 42.2 ? 'Marathon' : userProfile?.goal_distance || '5K';
            
          const displayFitnessLevel = 
            userProfile?.fitness_level === 'beginner' ? 'Beginner' :
            userProfile?.fitness_level === 'intermediate' ? 'Intermediate' :
            userProfile?.fitness_level === 'advanced' ? 'Advanced' : userProfile?.fitness_level || 'Intermediate';
            
          const displayAge = 
            userProfile?.age === '30-39' ? '35' :
            userProfile?.age === '40-49' ? '45' :
            userProfile?.age === '50-59' ? '55' :
            userProfile?.age === '60+' ? '60' : userProfile?.age || '30';

          await apiClient.createPlan({
            user_id: user!.id,
            coach_persona: userProfile?.coach_persona || 'Balanced',
            age: displayAge,
            sex: userProfile?.sex || 'Male',
            fitness_level: displayFitnessLevel,
            goal_distance: displayGoalDistance,
            goal_time: userProfile?.goal_time || null,
            plan_overview: `Your personalized ${displayGoalDistance} training plan`,
          });

          console.debug("DEBUG: Created fallback plan for user:", user?.id);

          // Store the plan in localStorage for backward compatibility
          localStorage.setItem('runningPlan', JSON.stringify(mockWorkouts));
          
          // Navigate to plan page
          navigate("/plan");
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