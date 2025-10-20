// src/components/plan/WorkoutModal.tsx

import { useState } from "react";
import { X, Clock, MapPin, Flame, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/integrations/api/client";

interface WorkoutModalProps {
  workout: {
    id: string;
    title: string;
    type: string;
    description: string;
    warmup?: string;
    mainSet?: string;
    cooldown?: string;
    duration?: number;
    distance?: number;
    scheduledDate: Date | null;
    completed: boolean;
    rating?: number;
    userNotes?: string;
  };
  onClose: () => void;
  onUpdate?: () => void;
}

const WorkoutModal = ({ workout, onClose, onUpdate }: WorkoutModalProps) => {
  const [completed, setCompleted] = useState(workout.completed);
  const [rating, setRating] = useState(workout.rating || 0);
  const [notes, setNotes] = useState(workout.userNotes || "");
  const [saving, setSaving] = useState(false);

  const handleComplete = (checked: boolean) => {
    setCompleted(checked);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update workout in the database
      await apiClient.updateWorkout(workout.id, {
        completed,
        rating: rating > 0 ? rating : null,
        user_notes: notes || null,
      });

      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('DEBUG: Error saving workout:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal - Compact for mobile */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-b from-slate-900 to-slate-950 rounded-t-3xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header - Compact */}
        <div className="px-5 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{workout.title}</h2>
              <p className="text-xs text-gray-400">
                {workout.scheduledDate 
                  ? new Date(workout.scheduledDate).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : 'No date'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10 rounded-full h-8 w-8 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-white">
          {/* Workout Details - Compact */}
          {(workout.warmup || workout.mainSet || workout.cooldown) && (
            <div className="bg-white/5 rounded-lg p-3 space-y-3 text-sm">
              {workout.warmup && (
                <div>
                  <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-primary" />
                    Warm-up
                  </p>
                  <p className="text-gray-400 text-xs leading-relaxed">{workout.warmup}</p>
                </div>
              )}
              
              {(workout.mainSet || workout.description) && (
                <div>
                  <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-primary" />
                    {workout.mainSet ? 'Main Set' : 'Workout Details'}
                  </p>
                  <div className="text-gray-400 text-xs space-y-0.5">
                    {(workout.mainSet || workout.description).split('\n').map((line, i) => (
                      <p key={i} className="leading-relaxed">{line}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {workout.cooldown && (
                <div>
                  <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-primary" />
                    Cool-down
                  </p>
                  <p className="text-gray-400 text-xs leading-relaxed">{workout.cooldown}</p>
                </div>
              )}
            </div>
          )}

          {/* Description (if exists and no workout details) */}
          {workout.description && !workout.warmup && !workout.mainSet && !workout.cooldown && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-sm text-gray-300 leading-relaxed">{workout.description}</p>
            </div>
          )}

          {/* Metrics - Compact */}
          {((workout.duration !== undefined && workout.duration !== null && workout.duration > 0) || 
            (workout.distance !== undefined && workout.distance !== null && workout.distance > 0)) && (
            <div className="flex gap-3">
              {workout.duration !== undefined && workout.duration !== null && workout.duration > 0 && (
                <div className="flex-1 bg-white/5 rounded-lg p-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="text-lg font-bold">{workout.duration}</div>
                    <div className="text-[10px] text-gray-400">min</div>
                  </div>
                </div>
              )}
              {workout.distance !== undefined && workout.distance !== null && workout.distance > 0 && (
                <div className="flex-1 bg-white/5 rounded-lg p-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="text-lg font-bold">{workout.distance}</div>
                    <div className="text-[10px] text-gray-400">km</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mark Complete - Checkbox */}
          <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
            <Checkbox 
              checked={completed} 
              onCheckedChange={handleComplete}
              className="h-5 w-5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label className="text-sm font-medium cursor-pointer" onClick={() => handleComplete(!completed)}>
              Mark as Complete
            </label>
          </div>

          {/* Effort Rating - Compact */}
          <div className="space-y-2">
            <p className="text-sm font-medium">how did it feel?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((effort) => (
                <button
                  key={effort}
                  onClick={() => setRating(effort)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    effort === rating
                      ? "bg-primary text-white shadow-md scale-105"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <span className="text-2xl">
                    {effort === 1 && "😊"}
                    {effort === 2 && "🙂"}
                    {effort === 3 && "😐"}
                    {effort === 4 && "😓"}
                    {effort === 5 && "😤"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes - Compact */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go?"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm min-h-[60px] resize-none"
            />
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="px-5 py-3 border-t border-white/10 flex-shrink-0 bg-slate-950/50 backdrop-blur-sm">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={saving}
              className="flex-1 border-white/20 text-white bg-white/5 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 bg-primary text-white hover:bg-primary/90"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkoutModal;