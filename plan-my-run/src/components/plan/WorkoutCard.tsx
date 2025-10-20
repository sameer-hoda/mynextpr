interface WorkoutCardProps {
  workout: {
    id: string;
    title: string;
    type: string;
    status: "upcoming" | "completed";
    duration?: number;
    distance?: number;
    scheduledDate: Date;
    description: string;
    intensity: number;
    completed?: boolean;
  };
  onClick: () => void;
}

const getIntensityLabel = (intensity: number) => {
  if (intensity <= 0) return null;
  if (intensity <= 2) return "Easy";
  if (intensity === 3) return "Moderate";
  return "Hard"; // 4-5
};

const WorkoutCard = ({ workout, onClick }: WorkoutCardProps) => {
  const isCompleted = workout.completed;
  const date = workout.scheduledDate;
  const month = date ? date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
  const day = date ? date.getDate() : '';
  const dayName = date ? date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : '';
  const intensityLabel = getIntensityLabel(workout.intensity);
  const isRestDay = workout.type.toLowerCase() === 'rest';

  return (
    <button
      onClick={onClick}
      className={`group relative w-full rounded-2xl p-3 text-left transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(0,0,0,0.25)] animate-fade-in ${
        isCompleted 
          ? "bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.2)] opacity-60" 
          : "bg-white/8 backdrop-blur-md border border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
      }`}
    >
      <div className="relative flex gap-4">
        <div className={`relative flex-shrink-0 w-14 h-16 rounded-xl overflow-hidden shadow-md transition-transform duration-300 group-hover:scale-105 ${
          isCompleted ? "grayscale" : ""
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
          <div className="relative h-full flex flex-col items-center justify-center text-white">
            <div className="text-[9px] font-semibold opacity-70 tracking-wider">{month}</div>
            <div className="text-2xl font-bold leading-none my-0.5 tracking-tight">{day}</div>
            <div className="text-[9px] font-medium opacity-70 tracking-wider">{dayName}</div>
          </div>
          <div className="absolute inset-0 shadow-[inset_0_2px_6px_rgba(0,0,0,0.3)] rounded-xl pointer-events-none" />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="mb-1">
              <h3 className={`text-base font-semibold text-white leading-tight ${
                isCompleted ? 'line-through opacity-60' : ''
              }`}>
                {workout.title}
              </h3>
            </div>
            <p className={`text-sm leading-snug mb-1.5 ${
              isCompleted ? 'text-white/40' : 'text-white/70'
            }`}>
              {workout.description}
            </p>
          </div>

          <div className={`flex items-center gap-3 text-xs ${
            isCompleted ? 'text-white/40' : 'text-white/70'
          }`}>
            {workout.duration !== undefined && workout.duration !== null && workout.duration > 0 && (
              <span className="flex items-center gap-1">
                ⏱ <span>{workout.duration}m</span>
              </span>
            )}
            {workout.distance !== undefined && workout.distance !== null && workout.distance > 0 && (
              <span className="flex items-center gap-1">
                📍 <span>{workout.distance}km</span>
              </span>
            )}
            {!isRestDay && intensityLabel && (
              <span className="flex items-center">
                <span>{intensityLabel}</span>
              </span>
            )}
            {isCompleted && (
              <span className="ml-auto text-green-400">✅</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default WorkoutCard;