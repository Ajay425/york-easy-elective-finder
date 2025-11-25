import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, X, Filter } from "lucide-react";

export function FilterBar({ filters, setFilters, filterOptions, onClear, onFilterChange }) {
  const totalActiveFilters = Object.values(filters).flat().length;

  return (
    <div className="w-full px-4 sm:px-8 mb-6">
      {/* Filter Header with Icon */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-purple-300" />
        <h3 className="text-lg font-semibold text-white">
          Filter Courses
          {totalActiveFilters > 0 && (
            <span className="ml-2 text-sm text-purple-300">
              ({totalActiveFilters} active)
            </span>
          )}
        </h3>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
        {Object.entries(filterOptions).map(([filterName, options]) => {
          const activeCount = filters[filterName].length;
          const hasActiveFilters = activeCount > 0;

          return (
            <DropdownMenu key={filterName}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`
                    relative group
                    min-w-[140px] h-auto py-2.5 px-4
                    rounded-lg font-medium text-sm
                    border transition-all duration-300
                    ${hasActiveFilters 
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/40 text-white shadow-lg shadow-purple-500/10 group-hover:from-purple-500/35 group-hover:to-pink-500/35 group-hover:border-purple-400/70 group-hover:text-purple-100 group-hover:shadow-purple-500/20' 
                      : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:border-white/25 hover:text-purple-300'
                    }
                    hover:shadow-lg
                    active:scale-95
                    group-hover:animate-pulse
                  `}
                >
                  <div className="flex flex-col items-start w-full gap-1">
                    {/* Filter Name with Icon */}
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold transition-all duration-300 group-hover:text-purple-300">
                        {filterName}
                      </span>
                      <div className="flex items-center gap-1">
                        {hasActiveFilters && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-black rounded-full text-[10px] transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-400/50">
                            {activeCount}
                          </span>
                        )}
                        <ChevronDown className="w-4 h-4 transition-all duration-300 group-data-[state=open]:rotate-180 group-hover:text-purple-300" />
                      </div>
                    </div>

                    {/* Active Filter Tags */}
                    {hasActiveFilters && (
                      <div className="flex flex-wrap gap-1 w-full mt-1">
                        {filters[filterName].slice(0, 2).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[10px] font-medium bg-purple-400/30 text-purple-200 rounded-md truncate max-w-[80px]"
                            title={tag}
                          >
                            {tag}
                          </span>
                        ))}
                        {activeCount > 2 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-pink-400/30 text-pink-200 rounded-md">
                            +{activeCount - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent 
                className="
                  bg-gray-900/98 backdrop-blur-md
                  text-white border border-white/10
                  rounded-lg shadow-xl
                  max-h-72 overflow-y-auto
                  min-w-[200px]
                "
              >
                <div className="p-2">
                  <div className="text-xs font-semibold text-white/60 px-2 py-2 mb-1 uppercase tracking-wider">
                    {filterName}
                  </div>
                  {options.map((option) => {
                    const active = filters[filterName].includes(option);
                    
                    return (
                      <DropdownMenuItem
                        key={option}
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            [filterName]: active
                              ? prev[filterName].filter((x) => x !== option)
                              : [...prev[filterName], option],
                          }));
                          onFilterChange();
                        }}
                        className={`
                          cursor-pointer rounded-md px-3 py-2 my-0.5
                          transition-all duration-200 group
                          ${active 
                            ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white font-medium group-hover:from-purple-500/50 group-hover:to-pink-500/50 group-hover:text-purple-100' 
                            : 'hover:bg-white/5 text-white/70 hover:text-purple-300 hover:bg-white/10'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="transition-all duration-200">{option}</span>
                          {active && (
                            <span className="text-purple-400 transition-all duration-200 group-hover:scale-110 group-hover:text-purple-300">✓</span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {/* Clear All Button */}
        {totalActiveFilters > 0 && (
          <Button
            onClick={onClear}
            className="
              min-w-[140px] h-auto py-2.5 px-4
              rounded-lg font-semibold text-sm
              bg-gradient-to-r from-red-500/15 to-orange-500/15
              border border-red-400/30
              text-white
              shadow-md shadow-red-500/10
              hover:bg-red-500/25 hover:border-red-400/50 hover:text-red-200 hover:shadow-lg hover:shadow-red-500/20
              active:scale-95
              transition-all duration-300
              group
              hover:animate-pulse
            "
          >
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 group-hover:rotate-90 transition-all duration-300" />
              <div className="flex flex-col items-start">
                <span className="transition-all duration-300">Clear All</span>
                <span className="text-xs text-red-200/70 transition-all duration-300 group-hover:text-red-200">
                  {totalActiveFilters} filter{totalActiveFilters !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </Button>
        )}
      </div>

      {/* Active Filters Summary Pills */}
      {totalActiveFilters > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-5xl mx-auto">
          {Object.entries(filters).map(([filterName, values]) =>
            values.map((value) => (
              <div
                key={`${filterName}-${value}`}
                className="
                  flex items-center gap-2 px-3 py-1.5
                  bg-gradient-to-r from-purple-500/20 to-pink-500/20
                  border border-purple-400/30
                  rounded-full text-xs text-purple-100
                  shadow-sm hover:shadow-md hover:from-purple-500/40 hover:to-pink-500/40 hover:border-purple-400/60 hover:text-purple-200
                  transition-all duration-300
                  group
                  hover:animate-pulse
                "
              >
                <span className="font-medium transition-all duration-300">{filterName}:</span>
                <span className="font-semibold transition-all duration-300">{value}</span>
                <button
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      [filterName]: prev[filterName].filter((x) => x !== value),
                    }));
                    onFilterChange();
                  }}
                  className="
                    ml-1 p-0.5 rounded-full
                    bg-red-500/30 hover:bg-red-500/50
                    transition-all duration-200
                    group-hover:scale-110
                  "
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default FilterBar;