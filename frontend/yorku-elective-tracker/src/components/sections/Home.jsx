import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";

const Home = () => {
  const navigate = useNavigate();

  return (
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
          Welcome to YorkU Elective Tracker
        </h1>

        <p className="text-gray-300 text-lg md:text-xl leading-relaxed drop-shadow-sm">
          Simplify your elective search and make smarter course choices.
        </p>
      </div>

      {/* Button */}
      <div className="relative z-10">
        <Button
          onClick={() => navigate("/electives")}
          className="
            relative overflow-hidden text-lg font-semibold px-10 py-6 rounded-2xl shadow-md
            bg-white text-[#7f5af0] border border-white/10
            transition-all duration-500 hover:scale-105 
            hover:shadow-[0_0_30px_rgba(127,90,240,0.45)]
            group
          "
        >
          {/* Sliding Color Animation (TrackMySubs style) */}
          <span
            className="
              absolute inset-0 bg-gradient-to-r 
              from-[#7f5af0] via-[#6a4fff] to-[#3a68ff]
              translate-x-[-100%]
              group-hover:translate-x-0
              transition-transform duration-700 ease-out rounded-2xl
            "
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
          📞 Feedback? Contact @plebwastaken on Discord or email at plebwastaken68@gmail.com.
        </p>
      </div>
    </section>
  );
};

export default Home;
