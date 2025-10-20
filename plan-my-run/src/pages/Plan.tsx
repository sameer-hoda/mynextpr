// src/pages/Plan.tsx

import { useState, useEffect } from "react";
import { LogOut, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import WorkoutCard from "@/components/plan/WorkoutCard";
import WorkoutModal from "@/components/plan/WorkoutModal";
import CalendarModal from "@/components/plan/CalendarModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/integrations/api/client";
import { generateICS, downloadICS } from "@/utils/calendarExport";
import planBg from "@/assets/plan-page-bg.jpg";

const Plan = () => {
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/");
      return;
    }

    if (user) {
      fetchWorkouts();
    }
  }, [user, authLoading, navigate]);

  const fetchWorkouts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const workoutsData = await apiClient.getWorkouts(user.id);
      
      const transformedWorkouts = workoutsData.map((w: any) => {
        const scheduledDate = w.scheduled_date ? new Date(w.scheduled_date) : null;
        
        let intensity = 3;
        if (w.type) {
          const typeStr = w.type.toLowerCase();
          if (typeStr.includes('rest')) intensity = 0;
          else if (typeStr.includes('easy') || typeStr.includes('recovery')) intensity = 2;
          else if (typeStr.includes('tempo') || typeStr.includes('threshold')) intensity = 4;
          else if (typeStr.includes('intervals') || typeStr.includes('speed')) intensity = 5;
        }

        return {
          id: w.id,
          title: w.title,
          type: w.type,
          description: w.description?.split(' ').slice(0, 7).join(' ') + (w.description?.length > 50 ? '...' : ''),
          fullDescription: w.description,
          duration: w.duration_minutes,
          distance: w.distance_km,
          scheduledDate,
          status: w.completed ? 'completed' : 'upcoming',
          day: w.day,
          intensity,
          completed: w.completed,
          warmup: w.warmup,
          mainSet: w.main_set,
          cooldown: w.cooldown,
          userNotes: w.user_notes,
          rating: w.rating,
        };
      });

      setWorkouts(transformedWorkouts);
    } catch (error) {
      console.error('Error fetching workouts:', error);
      toast({
        variant: "destructive",
        title: "Error loading workouts",
        description: "Please try refreshing the page",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = async () => {
    if (!user) return;
    try {
      await apiClient.resetUserData();
      toast({
        title: "Plan Reset",
        description: "Your old plan has been deleted. Let's create a new one!",
      });
      navigate("/coach-selection");
    } catch (error) {
      console.error('Error resetting user data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not reset your plan. Please try again.",
      });
    }
  };

  const handleExportToCalendar = () => {
    const calendarEvents = workouts.map(w => ({
      title: w.title,
      description: w.fullDescription || w.description || '',
      duration: w.duration || 30,
      distance: w.distance,
      scheduledDate: w.scheduledDate ? w.scheduledDate.toISOString().split('T')[0] : '',
      type: w.type,
      intensity: w.intensity,
      warmup: w.warmup,
      main_set: w.mainSet,
      cooldown: w.cooldown,
    }));

    const icsContent = generateICS(calendarEvents);
    downloadICS(icsContent);

    toast({
      title: "Calendar exported! 🗓️",
      description: "Your workouts have been downloaded. Import the file to your calendar app.",
    });
  };

  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    localStorage.clear(); // Force clear all local storage
    navigate("/");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div 
      className="min-h-screen h-screen relative bg-cover bg-center bg-fixed overflow-hidden"
      style={{ backgroundImage: `url(${planBg})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80 backdrop-blur-[2px]" />
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-5 backdrop-blur-md bg-black/20">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCalendarModal(true)}
            className="gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 hover:border-blue-400/40 transition-all"
          >
            <CalendarPlus className="w-4 h-4 text-blue-400" />
            Add to Calendar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEditPlan}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            Edit Plan
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 space-y-5 max-w-3xl pb-10">
            {loading ? (
              <div className="text-center py-12 text-white/80">Loading workouts...</div>
            ) : workouts.length === 0 ? (
              <div className="text-center py-12 text-white/80">No workouts found. Try creating a new plan!</div>
            ) : (
              workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onClick={() => setSelectedWorkout(workout)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {selectedWorkout && (
        <WorkoutModal
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onUpdate={fetchWorkouts}
        />
      )}

      {showCalendarModal && (
        <CalendarModal
          onClose={() => setShowCalendarModal(false)}
          onExportICS={handleExportToCalendar}
          workoutCount={workouts.length}
        />
      )}
    </div>
  );
};

export default Plan;