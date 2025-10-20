import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TimeWheelPickerProps {
  hours: number;
  minutes: number;
  seconds: number;
  onHoursChange: (value: number) => void;
  onMinutesChange: (value: number) => void;
  onSecondsChange: (value: number) => void;
}

const WheelColumn = ({
  value,
  onChange,
  max,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  max: number;
  label: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const values = Array.from({ length: max + 1 }, (_, i) => i);
  const itemHeight = 48;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = value * itemHeight;
    }
  }, [value]);

  const handleScroll = () => {
    if (containerRef.current && !isDragging) {
      const scrollTop = containerRef.current.scrollTop;
      const newValue = Math.round(scrollTop / itemHeight);
      if (newValue !== value && newValue >= 0 && newValue <= max) {
        onChange(newValue);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    startValue.current = value;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = startY.current - e.touches[0].clientY;
    const steps = Math.round(deltaY / itemHeight);
    const newValue = Math.max(0, Math.min(max, startValue.current + steps));
    if (newValue !== value) {
      onChange(newValue);
      if (containerRef.current) {
        containerRef.current.scrollTop = newValue * itemHeight;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="relative w-full h-[144px] overflow-hidden">
        {/* Top gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
        
        {/* Selection indicator */}
        <div className="absolute top-1/2 left-0 right-0 h-12 -translate-y-1/2 border-y border-primary/20 bg-primary/5 z-0 pointer-events-none" />
        
        {/* Scrollable wheel */}
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ paddingTop: itemHeight, paddingBottom: itemHeight }}
        >
          {values.map((val) => (
            <div
              key={val}
              className={cn(
                "h-12 flex items-center justify-center text-2xl font-semibold transition-all snap-center cursor-pointer",
                val === value
                  ? "text-foreground scale-110"
                  : "text-muted-foreground/40 scale-90"
              )}
              onClick={() => {
                onChange(val);
                if (containerRef.current) {
                  containerRef.current.scrollTop = val * itemHeight;
                }
              }}
            >
              {val.toString().padStart(2, "0")}
            </div>
          ))}
        </div>
        
        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
};

export function TimeWheelPicker({
  hours,
  minutes,
  seconds,
  onHoursChange,
  onMinutesChange,
  onSecondsChange,
}: TimeWheelPickerProps) {
  return (
    <div className="flex gap-4 items-center justify-center bg-muted/30 rounded-lg p-4">
      <WheelColumn value={hours} onChange={onHoursChange} max={10} label="Hours" />
      <div className="text-2xl font-bold text-muted-foreground self-center mt-6">:</div>
      <WheelColumn value={minutes} onChange={onMinutesChange} max={59} label="Minutes" />
      <div className="text-2xl font-bold text-muted-foreground self-center mt-6">:</div>
      <WheelColumn value={seconds} onChange={onSecondsChange} max={59} label="Seconds" />
    </div>
  );
}
