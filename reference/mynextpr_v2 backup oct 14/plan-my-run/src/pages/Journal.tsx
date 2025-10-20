// src/pages/Journal.tsx

import { useState, useEffect } from "react";
import { Calendar, Book, TrendingUp, Clock, MapPin, Star, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { format } from "date-fns";

const tabs = ["7 days", "30 days", "All", "Custom"];

const stats = [
  { label: "Total Workouts", value: "12", change: "+10%", icon: Calendar },
  { label: "Total Distance", value: "56.6 km", change: "+5%", icon: MapPin },
  { label: "Total Time", value: "4h 15m", change: "+8%", icon: Clock },
  { label: "Avg. Effort", value: "3.2", change: "+2%", icon: Star },
];

const Journal = () => {
  const [activeTab, setActiveTab] = useState("7 days");
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    console.debug("DEBUG: Journal page mounted - checking auth and fetching completed workouts");
    // Check if user is logged in and fetch workouts
    if (!user && !authLoading) {
      console.debug("DEBUG: User not authenticated, redirecting to auth");
      navigate("/auth");
      return;
    }

    if (user) {
      console.debug("DEBUG: User authenticated, fetching completed workouts for user:", user.id);
      fetchCompletedWorkouts();
    }
  }, [user, authLoading, navigate]);

  const fetchCompletedWorkouts = async () => {
    console.debug("DEBUG: fetchCompletedWorkouts called for user:", user?.id);
    try {
      setLoading(true);
      const completedWorkoutsData = await apiClient.getCompletedWorkouts(user!.id);
      console.debug("DEBUG: Completed workouts from API:", completedWorkoutsData);

      // Transform data to match component expectations
      const transformedWorkouts = completedWorkoutsData.map(w => ({
        ...w,
        scheduledDate: w.scheduled_date ? new Date(w.scheduled_date) : null,
        scheduledDateStr: w.scheduled_date ? format(new Date(w.scheduled_date), 'MMM d, yyyy') : 'Unknown Date'
      }));

      console.debug("DEBUG: Transformed completed workouts:", transformedWorkouts);
      setCompletedWorkouts(transformedWorkouts);
    } catch (error) {
      console.error('DEBUG: Error fetching completed workouts:', error);
      toast({
        variant: "destructive",
        title: "Error loading completed workouts",
        description: "Please try refreshing the page",
      });
    } finally {
      setLoading(false);
    }
  };

  const { signOut } = useAuth();

  const handleLogout = async () => {
    console.debug("DEBUG: handleLogout called");
    await signOut();
    navigate("/");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-display font-bold">Your Training Journal</h1>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="text-white hover:bg-white/20"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="whitespace-nowrap rounded-full"
            >
              {tab}
            </Button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card rounded-lg p-4 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-2xl font-display font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-success" />
                  <span className="text-xs text-success font-medium">{stat.change}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed Workouts */}
        <div className="space-y-3">
          <h2 className="text-lg font-display font-semibold">Completed Workouts</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : completedWorkouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed workouts yet. Complete your first workout to see it here!
            </div>
          ) : (
            completedWorkouts.map((workout) => {
              const getEmoji = (type: string) => {
                if (type === 'easy_run') return '🏃';
                if (type === 'tempo_run') return '⚡';
                if (type === 'intervals') return '🔥';
                if (type === 'long_run') return '🏃‍♀️';
                if (type === 'strength') return '💪';
                return '🏃';
              };

              const pace = workout.distance_km && workout.duration_minutes
                ? (workout.duration_minutes / workout.distance_km).toFixed(2)
                : null;

              return (
                <div key={workout.id} className="bg-card rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)
                    }
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{getEmoji(workout.type)}</div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          {workout.scheduledDateStr?.toUpperCase()}
                        </p>
                        <h3 className="font-display font-semibold">{workout.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {workout.distance_km && <span>{workout.distance_km} km</span>}
                          {workout.duration_minutes && (
                            <>
                              {workout.distance_km && <span>·</span>}
                              <span>{workout.duration_minutes} min</span>
                            </>
                          )}
                          {pace && (
                            <>
                              <span>·</span>
                              <span>{pace} /km</span>
                            </>
                          )}
                        </div>
                        {workout.rating && (
                          <div className="mt-2">
                            <span className="text-xs font-semibold text-primary">
                              Effort: {workout.rating === 1 ? 'Easy' : 
                                      workout.rating === 2 ? 'Light' : 
                                      workout.rating === 3 ? 'Moderate' : 
                                      workout.rating === 4 ? 'Hard' : 'Very Hard'}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-2xl">
                        {expandedWorkout === workout.id ? "−" : "+"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedWorkout === workout.id && workout.user_notes && (
                    <div className="px-4 pb-4 pt-2 border-t animate-fade-in">
                      <p className="text-sm text-muted-foreground italic">{workout.user_notes}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-4 py-4">
            <Link to="/plan">
              <Button variant="ghost" className="flex-col gap-1 h-auto w-full">
                <Calendar className="w-6 h-6" />
                <span className="text-xs font-medium">Plan</span>
              </Button>
            </Link>
            <Button variant="ghost" className="flex-col gap-1 h-auto">
              <Book className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium text-primary">Journal</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Journal;