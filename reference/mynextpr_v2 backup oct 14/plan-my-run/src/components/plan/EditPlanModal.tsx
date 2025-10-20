import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditPlanModalProps {
  onClose: () => void;
  onSubmit: (request: string) => void;
  editsRemaining: number;
}

export default function EditPlanModal({ onClose, onSubmit, editsRemaining }: EditPlanModalProps) {
  const [request, setRequest] = useState("");
  const [showTips, setShowTips] = useState(false);
  const maxLength = 280;

  const handleSubmit = () => {
    if (request.trim()) {
      onSubmit(request);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 z-50 animate-fade-in" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-card rounded-2xl max-w-md w-full shadow-2xl pointer-events-auto animate-slide-up">
          {/* Header */}
          <div className="relative p-6 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Edit className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Request a Change</h3>
                <p className="text-sm text-muted-foreground mt-1">Your coach is on it!</p>
              </div>
              {editsRemaining > 0 && (
                <div className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                  {editsRemaining} {editsRemaining === 1 ? "edit" : "edits"} remaining
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            {/* Text Input */}
            <div className="space-y-2">
              <Textarea
                value={request}
                onChange={(e) => setRequest(e.target.value.slice(0, maxLength))}
                placeholder="E.g., 'Can we add more recovery days?' or 'I need shorter runs this week'"
                className="min-h-[120px] resize-none"
                maxLength={maxLength}
              />
              <div className="flex justify-end">
                <span className="text-xs text-muted-foreground">
                  {request.length} / {maxLength}
                </span>
              </div>
            </div>

            {/* Tips Section */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowTips(!showTips)}
                className="w-full px-4 py-3 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Tips for effective change requests</span>
                <span className={cn("transition-transform", showTips && "rotate-180")}>▼</span>
              </button>
              {showTips && (
                <div className="px-4 py-3 space-y-2 text-sm text-muted-foreground">
                  <p><strong>Be specific:</strong> Instead of "make it easier," try "reduce long run to 8km"</p>
                  <p><strong>Be realistic:</strong> Changes should align with your fitness level and goals</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!request.trim() || editsRemaining === 0}
                className="w-full"
                size="lg"
              >
                Submit Request
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full"
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
