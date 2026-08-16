import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpdatesPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasBeenShown = localStorage.getItem("updatesPopupShown_v3");

    // Show popup only if it hasn't been shown before
    if (!hasBeenShown) {
      setIsOpen(true);
      localStorage.setItem("updatesPopupShown_v3", "true");
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#1a1a1a] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/30 max-w-md w-full p-8 relative overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none"></div>

        {/* Close button */}
        <Button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 h-auto w-auto rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300"
          variant="ghost"
        >
          <X className="w-5 h-5 text-white hover:text-purple-300 transition-colors" />
        </Button>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse"></div>
              <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                What's New
              </span>
            </div>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              Updates & Features
            </h2>
            <div className="w-12 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
          </div>

          {/* Updates List */}
          <div className="space-y-4 mb-6">
            <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-400/30 rounded-lg p-4 hover:from-green-500/20 hover:to-teal-500/20 transition-all duration-300 group">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider bg-green-400/10 px-2 py-0.5 rounded-full">New</span>
                <h3 className="font-semibold text-green-200 group-hover:text-green-100 transition-colors">Live Seat Availability</h3>
              </div>
              <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
                Course cards now show real-time open seat counts — 🟢 available, 🟡 low, 🔴 full — updated daily. Tap a course for a per-section breakdown with the exact timestamp.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-lg p-4 hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-300 group">
              <h3 className="font-semibold text-purple-200 mb-1 group-hover:text-purple-100 transition-colors">Fall/Winter 2026-2027 Courses Now Available</h3>
              <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
                Browse and filter the newest Fall, Winter, and full-year elective offerings.
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleClose}
            className="w-full py-3 px-4 rounded-lg font-semibold text-sm
              bg-gradient-to-r from-purple-500 to-pink-500
              hover:from-purple-600 hover:to-pink-600
              text-white
              shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50
              transition-all duration-300
              hover:scale-105
              active:scale-95
            "
          >
            Got It! Let's Explore
          </Button>

          {/* Footer note */}
          <p className="text-xs text-gray-400 text-center mt-4">
            This is a one-time message
          </p>
        </div>
      </div>
    </div>
  );
}
