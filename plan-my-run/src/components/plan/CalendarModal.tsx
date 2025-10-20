import { Calendar, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarModalProps {
  onClose: () => void;
  onExportICS: () => void;
  workoutCount: number;
}

const CalendarModal = ({ onClose, onExportICS, workoutCount }: CalendarModalProps) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-b from-slate-900 to-slate-950 rounded-t-3xl animate-slide-up max-h-[60vh]">
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Add to Calendar</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Add {workoutCount} workouts to your calendar
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10 rounded-full h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-6 space-y-3">
          {/* Google Calendar */}
          <button
            onClick={() => {
              onExportICS();
              onClose();
            }}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-left hover:bg-white/15 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5">Google Calendar</h3>
                <p className="text-xs text-gray-400">Download .ics file and import</p>
              </div>
            </div>
          </button>

          {/* Apple Calendar */}
          <button
            onClick={() => {
              onExportICS();
              onClose();
            }}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-left hover:bg-white/15 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-slate-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5">Apple Calendar</h3>
                <p className="text-xs text-gray-400">Download .ics file and sync</p>
              </div>
            </div>
          </button>

          {/* Export ICS */}
          <button
            onClick={() => {
              onExportICS();
              onClose();
            }}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-left hover:bg-white/15 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Download className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5">Export .ics File</h3>
                <p className="text-xs text-gray-400">Works with any calendar app</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default CalendarModal;
