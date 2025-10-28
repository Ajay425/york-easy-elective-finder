import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Home = () => {
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

    <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl justify-center">
        <Select>
        <SelectTrigger className="w-[220px] bg-white text-black font-medium rounded-xl shadow">      
            <SelectValue placeholder="Select Faculty" />
        </SelectTrigger>
        <SelectContent> 
            <SelectItem value="arts">Faculty of Arts</SelectItem>
            <SelectItem value="engineering">Lassonde School of Engineering</SelectItem>
            <SelectItem value="science">Faculty of Science</SelectItem>
            <SelectItem value="business">Schulich School of Business</SelectItem>
            <SelectItem value="health">Faculty of Health</SelectItem>
            <SelectItem value="education">Faculty of Education</SelectItem>
            <SelectItem value="finearts">Faculty of Fine Arts</SelectItem>
        </SelectContent>
      </Select>
    
    {/* Department Select */}
        <Select>
          <SelectTrigger className="w-[220px] bg-white text-black font-medium rounded-xl shadow">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="math">Mathematics & Statistics</SelectItem>
            <SelectItem value="cs">Computer Science</SelectItem>
            <SelectItem value="eco">Economics</SelectItem>
          </SelectContent>
        </Select>
    {/* Credit Select */}
        <Select>
          <SelectTrigger className="w-[220px] bg-white text-black font-medium rounded-xl shadow">
            <SelectValue placeholder="Select Credits" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 Credits</SelectItem>
            <SelectItem value="6">6 Credits</SelectItem>
            <SelectItem value="9">9 Credits</SelectItem>
          </SelectContent>
        </Select>

    </div>



      <div className="mt-10">
        <Button
          className="bg-white text-[#A42439] hover:bg-gray-100 hover:text-[#8c1f32] text-lg font-semibold px-8 py-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
        >
          Search for Electives
        </Button>
      </div>
      <p className="text-gray-200 italic max-w-md text-base leading-relaxed mt-10">
        ⚠️ Always double-check with your faculty academic advisor before finalizing your electives.
      </p>
    </section>
  );
};

export default Home;
