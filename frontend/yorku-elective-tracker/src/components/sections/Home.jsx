import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";

function DisclaimerModal({ open, onContinue, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="bg-gradient-to-br from-gray-800/40 via-gray-900/40 to-black/40 backdrop-blur-xl border border-white/10 text-gray-200 rounded-2xl shadow-2xl shadow-black/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Before You Continue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm leading-relaxed text-gray-300">
            We only display <span className="font-semibold text-purple-300">elective courses that do not require prerequisites</span>.
          </p>
          
          <p className="text-sm leading-relaxed text-gray-300">
            Courses are sorted from <span className="font-semibold text-purple-300">best-rated popularity to lowest-rated popularity</span>.
          </p>
          
          <p className="text-sm leading-relaxed text-gray-300">
            Some CAT codes — especially those with <span className="font-semibold text-purple-300">labs or tutorials</span> — may be inaccurate so please double-check with the official course listings.
          </p>

          <p className="text-sm leading-relaxed text-gray-300">
            Please note that some information may be incomplete or outdated and it is updated best to our knowledge.
          </p>
        </div>

        <DialogFooter className="flex gap-3 justify-end pt-4 border-t border-white/10">
          <Button 
            onClick={onCancel}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all duration-300 hover:scale-105"
          >
            Cancel
          </Button>

          <Button
            onClick={onContinue}
            className="bg-gradient-to-r from-[#7f5af0] to-[#a855f7] hover:from-[#8b6eff] hover:to-[#b566ff] text-white rounded-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Home = () => {
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const navigate = useNavigate();

  const handleSearchClick = () => {
    // Before navigating, show disclaimer
    setShowDisclaimer(true);
  };

  const handleContinue = () => {
    setShowDisclaimer(false);
    navigate("/electives", { state: { term: selectedTerm } });
  };

  return (
    <>
      {/* MODAL */}
      <DisclaimerModal
        open={showDisclaimer}
        onContinue={handleContinue}
        onCancel={() => setShowDisclaimer(false)}
      />

      {/* PAGE CONTENT */}
      <section
        className="
        relative w-full min-h-screen 
        flex flex-col items-center justify-center 
        overflow-hidden bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#1a1a1a]
        px-6 py-16 text-center space-y-8
      "
      >
        {/* Background Glows */}
        <div className="absolute w-[500px] h-[500px] bg-purple-800 rounded-full blur-[180px] opacity-25 top-[-120px] left-1/2 -translate-x-1/2 animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] bg-blue-700 rounded-full blur-[180px] opacity-20 bottom-[-150px] left-1/2 -translate-x-1/2 animate-pulse"></div>

        {/* Header */}
        <div
          className="
          relative z-10 max-w-3xl space-y-4
          animate-[fadeZoom_1s_ease-out]
          [@keyframes_fadeZoom]:{0%{opacity:0;transform:scale(0.95)}100%{opacity:1;transform:scale(1)}}
        "
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#7f5af0] drop-shadow-[0_0_15px_rgba(127,90,240,0.35)]">
            Welcome to YorkU Elective Finder
          </h1>

          <p className="text-gray-300 text-lg md:text-xl leading-relaxed drop-shadow-sm">
            Simplify your elective search and make smarter course choices.
          </p>
        </div>

        <div className="relative z-10 w-full max-w-xs">
          <Select onValueChange={(val) => setSelectedTerm(val)}>
            <SelectTrigger className="w-full bg-white/10 backdrop-blur-xl border border-white/20 text-white">
              <SelectValue placeholder="Select a Term..." />
            </SelectTrigger>

            <SelectContent className="bg-black/40 backdrop-blur-xl text-white border-white/10">
              <SelectItem value="W">Winter (W)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <div className="relative z-10">
          <Button
            onClick={handleSearchClick}
            disabled={!selectedTerm}
            className="
            relative overflow-hidden text-lg font-semibold px-10 py-6 rounded-2xl shadow-md
            bg-white text-[#7f5af0] border border-white/10
            transition-all duration-500 hover:scale-105 
            hover:shadow-[0_0_30px_rgba(127,90,240,0.45)]
            group disabled:opacity-40 disabled:cursor-not-allowed
          "
          >
            {/* Sliding Color Animation (TrackMySubs style) */}
            <span
              className="
              absolute inset-0 bg-gradient-to-r 
              from-[#7f5af0] via-[#6a4fff] to-[#3a68ff]
              translate-x-[-100%]
              group-hover:translate-x-0
              transition-transform duration-700 ease-out rounded-2xl"
            ></span>

            <span className="relative z-10 transition-colors duration-500 group-hover:text-white">
              Search for Electives →
            </span>
          </Button>
        </div>

        {/* Disclaimers */}
        <div className="relative z-10 space-y-3 text-gray-400 max-w-md">
          <p className="italic">
            ⚠️ Always double-check with your faculty academic advisor before finalizing your electives.
          </p>
          <p className="italic">📚 This tool is unofficial and not affiliated with York University.</p>
          <p className="italic">
            📞 Feedback? Suggestions? Reach out to us using the {" "}
            <a href="/contact-us" className="underline hover:text-[#7f5af0] transition-colors">
              Contact Us form
            </a>.
          </p>
        </div>
      </section>
    </>
  );
};

export default Home;
