import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Home = () => {
    const navigate = useNavigate();

  return (
    <section className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-16 bg-gradient-to-br from-[#A42439] via-[#8c1f32] to-[#6a1525] text-center space-y-8">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-yellow-200 via-white to-yellow-100 bg-clip-text text-transparent drop-shadow-lg">
          Welcome to YorkU Elective Tracker
        </h1>
        <p className="text-gray-100 text-lg md:text-xl leading-relaxed drop-shadow-sm">
          Simplify your elective search and make smarter course choices.
        </p>
      </div>

      <div className="">
        <Button
        onClick={() => {navigate('/electives')}}
        className="relative overflow-hidden text-lg font-semibold px-8 py-6 rounded-2xl shadow-md bg-white text-[#A42439] transition-all duration-500 hover:scale-105 hover:shadow-xl group">
          <span className="absolute inset-0 bg-gradient-to-r from-[#A42439] via-[#8c1f32] to-[#6a1525] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 ease-out rounded-2xl"></span>
            <span className="relative z-10 text-[#A42439] group-hover:text-white transition-colors duration-500">
                    Search for Electives
            </span>
        </Button>
        </div>
      <p className="text-gray-200 italic max-w-md text-base leading-relaxed mt-5">
        ⚠️ Always double-check with your faculty academic advisor before finalizing your electives.
      </p>
      <p className="text-gray-200 italic max-w-md text-base leading-relaxed mt-3">
        📚 This tool is unofficial and not affiliated with York University.
      </p>
      <p className="text-gray-200 italic max-w-md text-base leading-relaxed mt-3">
        📞 Feedback, Suggestions? Reach out to @plebwastaken on Discord or email at plebwastaken68@gmail.com.
      </p>
    </section>
  );
};

export default Home;
