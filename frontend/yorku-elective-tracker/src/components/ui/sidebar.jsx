import { Slider } from "@/components/ui/slider"
import  {useState} from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const sidebar = () => {
    const [showDepartments, setShowDepartments] = useState(true);
    const [credits, ShowCredits] = useState([3]);

    return (
        <aside className="w-64 bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-lg text-gray-100 space-y-6 sticky top-4 h-fit"> 
        {/* Credits Filter */}
        <div>
            <h3 className="">
                Credits
            </h3>
            <div className="">
            {["1.0", "3.0", "6.0"].map((credit) => (
            <label key={credit} className="flex items-center gap-2">
              <input type="checkbox" className="accent-yellow-400" />
              <span>{credit}</span>
            </label>
          ))}
            </div>
        </div>
            {/* Popularity Filter */}
        <div>
            <h3 className="font-semibold text-lg mb-2">Popularity</h3>
            <div className="space-y-2">
                {[5, 4, 3].map((stars) => (
                <label key={stars} className="flex items-center gap-1">
              <input type="checkbox" className="accent-yellow-400" />
              <span className="text-yellow-400">{"★".repeat(stars)}</span>
              <span className="text-sm text-gray-300">& Up</span>
            </label>
          ))}
            </div>
        </div>
         {/* Department Filter */}
      <div>
        <div
          onClick={() => setShowDepartments(!showDepartments)}
          className="flex items-center justify-between cursor-pointer mb-2"
        >
          <h3 className="font-semibold text-lg">Departments</h3>
          {showDepartments ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        {showDepartments && (
          <div className="space-y-2 pl-2">
            {["Computer Science", "Psychology", "Economics", "Philosophy", "Math"].map(
              (dept) => (
                <label key={dept} className="flex items-center gap-2">
                  <input type="checkbox" className="accent-yellow-400" />
                  <span>{dept}</span>
                </label>
              )
            )}
          </div>
        )}
      </div>
        {/* Delivery Filter */}
      <div>
        <h3 className="font-semibold text-lg mb-2">Delivery Type</h3>
        <div className="space-y-2">
          {["Online", "In-person", "Hybrid"].map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input type="checkbox" className="accent-yellow-400" />
              <span>{type}</span>
            </label>
          ))}
        </div>
    </div>
    </aside>
    );
};

export default sidebar;