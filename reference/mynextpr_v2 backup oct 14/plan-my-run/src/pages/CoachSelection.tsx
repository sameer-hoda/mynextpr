import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import danielsImg from "@/assets/daniels-running-formula.jpg";
import maffetoneImg from "@/assets/maffetone-method.jpg";
import runLessImg from "@/assets/run-less-run-faster.jpg";
import bgImg from "@/assets/people-running-bg.jpg";

const philosophies = [
  {
    id: "daniels",
    name: "Daniels' Running Formula",
    author: "Jack Daniels, PhD",
    image: danielsImg,
    emoji: "🧠",
    subtitle: "Smart & Structured",
    tldr: "Science-based training that builds endurance and speed using your current fitness level.",
  },
  {
    id: "maffetone",
    name: "Maffetone Method",
    author: "Dr. Phil Maffetone",
    image: maffetoneImg,
    emoji: "💗",
    subtitle: "Gentle & Steady",
    tldr: "Train easy to get faster — build endurance, stay healthy, and avoid burnout.",
  },
  {
    id: "run-less",
    name: "Run Less, Run Faster",
    author: "Bill Pierce & Scott Murr",
    image: runLessImg,
    emoji: "⚡️",
    subtitle: "Efficient & Powerful",
    tldr: "Three focused runs a week for strong results with less mileage.",
  },
];

const CoachSelection = () => {
  const [selectedPhilosophy, setSelectedPhilosophy] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Check if user is logged in
    if (!user && !authLoading) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to continue",
      });
      navigate("/auth");
    }
  }, [user, authLoading, navigate, toast]);

  const handleContinue = () => {
    if (selectedPhilosophy) {
      // Store selected philosophy in localStorage
      localStorage.setItem('selectedCoach', selectedPhilosophy);
      navigate("/onboarding");
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <p className="text-sm text-white/70 mb-2">Step 1 of 2</p>
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div className="bg-white rounded-full h-1.5 transition-all" style={{ width: "50%" }} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
              Pick a training style
            </h1>
          </div>

          {/* Philosophy Cards */}
          <div className="space-y-3 md:space-y-4">
            {philosophies.map((philosophy) => (
              <button
                key={philosophy.id}
                onClick={() => setSelectedPhilosophy(philosophy.id)}
                className={`w-full flex items-start gap-3 md:gap-4 p-4 md:p-5 bg-white/95 backdrop-blur-sm rounded-lg transition-all text-left ${
                  selectedPhilosophy === philosophy.id
                    ? "ring-2 ring-white shadow-xl"
                    : "hover:bg-white hover:shadow-lg"
                }`}
              >
                {/* Book Image */}
                <div className="flex-shrink-0">
                  <img
                    src={philosophy.image}
                    alt={philosophy.name}
                    className="w-16 h-24 md:w-20 md:h-28 object-cover rounded shadow-md"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg md:text-xl flex-shrink-0">{philosophy.emoji}</span>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-base md:text-lg leading-tight">
                        {philosophy.name}
                      </h3>
                      <p className="text-sm md:text-base font-medium text-foreground/90 mb-1">
                        {philosophy.subtitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {philosophy.author}
                      </p>
                    </div>
                    {/* Selected Indicator - Mobile */}
                    {selectedPhilosophy === philosophy.id && (
                      <div className="flex-shrink-0 md:hidden">
                        <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                          <svg className="w-3 h-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {philosophy.tldr}
                  </p>
                </div>

                {/* Selected Indicator - Desktop */}
                {selectedPhilosophy === philosophy.id && (
                  <div className="hidden md:flex flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                      <svg className="w-4 h-4 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Not Sure Option */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setSelectedPhilosophy("daniels")}
              className="text-sm text-white/70 hover:text-white transition-colors underline"
            >
              Not sure? Let me pick for you
            </button>
          </div>

          {/* Continue Button */}
          <div className="mt-4 md:mt-6">
            <Button
              size="lg"
              className="w-full gap-2 bg-white text-foreground hover:bg-white/90"
              disabled={!selectedPhilosophy}
              onClick={handleContinue}
            >
              Continue to Goal Setting
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachSelection;
