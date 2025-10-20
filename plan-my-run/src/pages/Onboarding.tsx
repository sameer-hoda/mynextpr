import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import runningGoalBg from "@/assets/running-goal-bg.jpg";

const distanceOptions = [
  { label: "5K", value: 5 },
  { label: "10K", value: 10 },
  { label: "21.1K", value: 21.1 },
  { label: "42.2K", value: 42.2 },
];

const currentTimeOptions: Record<number, string[]> = {
  5: ["50:00", "40:00", "35:00", "32:30", "30:00", "27:30", "25:00", "22:30", "20:00"],
  10: ["75:00", "70:00", "65:00", "60:00", "55:00", "50:00", "45:00", "40:00"],
  21.1: ["2:45:00", "2:30:00", "2:20:00", "2:10:00", "2:00:00", "1:50:00", "1:40:00", "1:30:00"],
  42.2: ["5:30:00", "5:00:00", "4:45:00", "4:30:00", "4:15:00", "4:00:00", "3:45:00", "3:30:00"],
};

const timeToSeconds = (time: string): number => {
  const parts = time.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
};

const secondsToTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const calculateGoalTimes = (currentTime: string): string[] => {
  const currentSeconds = timeToSeconds(currentTime);
  const improvements = [0.05, 0.075, 0.10]; // 5%, 7.5%, 10%
  
  return improvements.map(improvement => {
    const goalSeconds = currentSeconds * (1 - improvement);
    const rounded = Math.round(goalSeconds / 10) * 10; // Round to nearest 10 seconds
    return secondsToTime(rounded);
  });
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goalDistance, setGoalDistance] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [goalTime, setGoalTime] = useState<string | null>(null);
  const [fitnessLevel, setFitnessLevel] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Check if user is logged in
        if (!user) {
          navigate("/");
          return null;
        }  }, [user, authLoading, navigate, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goalDistance || !currentTime || !goalTime || !fitnessLevel) {
      toast({
        variant: "destructive",
        title: "Incomplete Form",
        description: "Please fill in all fields",
      });
      return;
    }
    
    const coachPersona = localStorage.getItem('selectedCoach') || 'anya';
    
    const userProfile = {
      goal_distance: goalDistance,
      goal_time: goalTime,
      current_time: currentTime,
      fitness_level: fitnessLevel,
      age: "30-39",
      sex: "unspecified",
      coach_persona: coachPersona
    };
    
    navigate("/loading", { state: userProfile });
  };

  const goalTimeOptions = currentTime ? calculateGoalTimes(currentTime) : [];

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: `url(${runningGoalBg})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <div className="relative container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Goal Distance */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground/80">Goal Distance</Label>
              <div className="grid grid-cols-4 gap-2">
                {distanceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setGoalDistance(option.value);
                      setCurrentTime(null);
                      setGoalTime(null);
                    }}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      goalDistance === option.value
                        ? "bg-foreground text-background shadow-md"
                        : "bg-background/60 text-foreground/70 hover:bg-background/80 border border-foreground/10"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Time */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground/80">Current Time</Label>
              {!goalDistance ? (
                <div className="text-center py-8 text-sm text-muted-foreground bg-background/40 rounded-lg border border-foreground/10">
                  Select a distance to see time options
                </div>
              ) : (
                <div 
                  ref={scrollRef}
                  className="overflow-x-auto pb-2 scrollbar-hide"
                >
                  <div className="flex gap-2 min-w-max">
                    {currentTimeOptions[goalDistance].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          setCurrentTime(time);
                          setGoalTime(null);
                        }}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                          currentTime === time
                            ? "bg-foreground text-background shadow-md"
                            : "bg-background/60 text-foreground/70 hover:bg-background/80 border border-foreground/10"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Goal Time */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground/80">
                Estimated Goal (3-4 months)
              </Label>
              {!currentTime ? (
                <div className="text-center py-8 text-sm text-muted-foreground bg-background/40 rounded-lg border border-foreground/10">
                  Select your current time first
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {goalTimeOptions.map((time, index) => {
                    const labels = ["Mild", "Moderate", "Ambitious"];
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setGoalTime(time)}
                        className={`px-3 py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                          goalTime === time
                            ? "bg-foreground text-background shadow-md"
                            : "bg-background/60 text-foreground/70 hover:bg-background/80 border border-foreground/10"
                        }`}
                      >
                        <span className="text-xs opacity-70">{labels[index]}</span>
                        <span>{time}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fitness Level */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground/80">Current Fitness Level</Label>
              <div className="grid grid-cols-3 gap-2">
                {["beginner", "intermediate", "advanced"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFitnessLevel(level)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${
                      fitnessLevel === level
                        ? "bg-foreground text-background shadow-md"
                        : "bg-background/60 text-foreground/70 hover:bg-background/80 border border-foreground/10"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 mt-8 bg-foreground text-background hover:bg-foreground/90 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Generate My Plan
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
