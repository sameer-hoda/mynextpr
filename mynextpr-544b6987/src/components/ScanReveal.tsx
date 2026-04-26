import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const images = [
  { real: "/carousel/image1.jpg", blueprint: "/carousel/image1_blueprint.png" },
  { real: "/carousel/image2.jpg", blueprint: "/carousel/image2_blueprint.png" },
  { real: "/carousel/image3.jpg", blueprint: "/carousel/image3_blueprint.png" },
  { real: "/carousel/image4.jpg", blueprint: "/carousel/image4_blueprint.png" },
  { real: "/carousel/image5.jpg", blueprint: "/carousel/image5_blueprint.png" }
];

const ScanReveal = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(true);
  const [glitchOffset, setGlitchOffset] = useState(0);

  // Preload images
  useEffect(() => {
    images.forEach((img) => {
      new Image().src = img.real;
      new Image().src = img.blueprint;
    });
  }, []);

  // Cycle through images
  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setIsScanning(false);

      // Preload next image
      const nextIndex = (currentIndex + 1) % images.length;
      const nextImg = new Image();
      nextImg.src = images[nextIndex].real;
      const nextBlueprint = new Image();
      nextBlueprint.src = images[nextIndex].blueprint;

      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setScanProgress(0);
        setIsScanning(true);
      }, 500); // Wait for scan to reset before switching
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(cycleInterval);
  }, [currentIndex]);

  // Scan animation
  useEffect(() => {
    if (!isScanning) return;

    const scanInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          return 100;
        }

        // Add subtle glitch effect during scan
        if (Math.random() > 0.85) {
          setGlitchOffset(Math.random() * 4 - 2);
          setTimeout(() => setGlitchOffset(0), 50);
        }

        return prev + 0.8; // Faster scan
      });
    }, 16);

    return () => clearInterval(scanInterval);
  }, [isScanning, currentIndex]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-gray-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Layer 1: Real Runner */}
          <img
            src={images[currentIndex].real}
            alt="Runner"
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />

          {/* Layer 2: Real Blueprint */}
          <div
            className="absolute inset-0 bg-gray-900"
            style={{
              clipPath: `inset(0 ${100 - scanProgress}% 0 0)`,
              transform: `translateX(${glitchOffset}px)`,
            }}
          >
            <img
              src={images[currentIndex].blueprint}
              alt="Analysis overlay"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Blueprint Grid Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
              clipPath: `inset(0 ${100 - scanProgress}% 0 0)`,
            }}
          />

          {/* Scan Line */}
          {isScanning && scanProgress > 0 && scanProgress < 100 && (
            <motion.div
              className="absolute top-0 bottom-0 w-[3px]"
              style={{
                left: `${scanProgress}%`,
                background: `linear-gradient(180deg, 
                  transparent 0%, 
                  hsl(180 100% 60%) 20%, 
                  hsl(217 91% 60%) 50%, 
                  hsl(180 100% 60%) 80%, 
                  transparent 100%)`,
                boxShadow: `
                  0 0 20px 6px hsl(180 100% 60% / 0.6),
                  0 0 40px 12px hsl(217 91% 60% / 0.3),
                  10px 0 30px 5px hsl(180 100% 60% / 0.2)
                `,
                zIndex: 20,
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Subtle Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-background/20" />
      </div>

      {/* Corner Brackets */}
      <div className="corner-bracket top-3 left-3 border-l-2 border-t-2" style={{ zIndex: 25 }} />
      <div className="corner-bracket top-3 right-3 border-r-2 border-t-2" style={{ zIndex: 25 }} />
      <div className="corner-bracket bottom-3 left-3 border-l-2 border-b-2" style={{ zIndex: 25 }} />
      <div className="corner-bracket bottom-3 right-3 border-r-2 border-b-2" style={{ zIndex: 25 }} />
    </div>
  );
};

export default ScanReveal;
