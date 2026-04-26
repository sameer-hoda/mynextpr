import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import ScanReveal from "@/components/ScanReveal";
import StartButton from "@/components/StartButton";

const Index = () => {
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  const handleStartAnalysis = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate("/login");
    }, 800);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex flex-col overflow-hidden"
        initial={{ opacity: 1 }}
        animate={{
          opacity: isExiting ? 0 : 1,
          y: isExiting ? -30 : 0
        }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Ambient Glow Effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 35%, hsl(217 91% 60% / 0.06) 0%, transparent 55%)" }}
        />

        {/* Minimal Header - Top Left */}
        <motion.header
          className="absolute top-0 left-0 right-0 flex justify-start px-6 pt-6 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="logo-text text-lg">MyNextPR</span>
        </motion.header>

        {/* Main Content Area - More Breathing Room */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-32">
          {/* Hero Headline - More spacing */}
          <motion.div
            className="text-center mb-12 z-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h1 className="headline-gradient text-3xl md:text-4xl lg:text-5xl">
              Unlock Your Next PR.
            </h1>
            <p className="text-sm text-muted-foreground mt-5 max-w-sm mx-auto leading-relaxed">
              World-class biomechanics analysis, powered by AI.
            </p>
          </motion.div>

          {/* Hero Image Container - Smaller, cleaner */}
          <motion.div
            className="relative w-full max-w-[240px] md:max-w-[280px] aspect-[2/3] mx-auto"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <ScanReveal />
          </motion.div>
        </div>

        {/* Bottom CTA - Fixed Position */}
        <motion.div
          className="fixed bottom-10 left-0 right-0 flex justify-center z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <StartButton onClick={handleStartAnalysis} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Index;
