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
        <Filter className="w-5 h-5 text-yellow-200" />
        <h3 className="text-lg font-semibold text-yellow-100">
          Filter Courses
          {totalActiveFilters > 0 && (
            <span className="ml-2 text-sm text-yellow-300">
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
                    min-w-[140px] h-auto py-3 px-4
                    rounded-xl font-medium text-sm
                    border-2 transition-all duration-300
                    ${hasActiveFilters 
                      ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-yellow-400/60 text-white shadow-lg shadow-yellow-500/20' 
                      : 'bg-white/5 border-white/20 text-white/90 hover:bg-white/10 hover:border-white/40'
                    }
                    hover:scale-105 hover:shadow-xl
                    active:scale-95
                  `}
                >
                  <div className="flex flex-col items-start w-full gap-1">
                    {/* Filter Name with Icon */}
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold">
                        {filterName}
                      </span>
                      <div className="flex items-center gap-1">
                        {hasActiveFilters && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-yellow-400 text-black rounded-full">
                            {activeCount}
                          </span>
                        )}
                        <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </div>

                    {/* Active Filter Tags */}
                    {hasActiveFilters && (
                      <div className="flex flex-wrap gap-1 w-full mt-1">
                        {filters[filterName].slice(0, 2).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[10px] font-medium bg-yellow-300 text-black rounded-md truncate max-w-[80px]"
                            title={tag}
                          >
                            {tag}
                          </span>
                        ))}
                        {activeCount > 2 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-400/50 text-white rounded-md">
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
                  bg-[#2A0B14]/95 backdrop-blur-xl
                  text-white border-2 border-white/30
                  rounded-xl shadow-2xl
                  max-h-72 overflow-y-auto
                  min-w-[200px]
                  scrollbar-thin scrollbar-thumb-yellow-400/50 scrollbar-track-white/10
                "
              >
                <div className="p-2">
                  <div className="text-xs font-semibold text-yellow-200 px-2 py-1 mb-1">
                    Select {filterName}
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
                          cursor-pointer rounded-lg px-3 py-2 my-1
                          transition-all duration-200
                          ${active 
                            ? 'bg-yellow-400/25 text-yellow-100 font-semibold border-l-4 border-yellow-400' 
                            : 'hover:bg-white/10 text-white/80 hover:text-white'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{option}</span>
                          {active && (
                            <span className="text-yellow-400 text-lg">✓</span>
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
              min-w-[140px] h-auto py-3 px-4
              rounded-xl font-semibold text-sm
              bg-gradient-to-br from-red-500/20 to-red-700/20
              border-2 border-red-400/60
              text-white
              shadow-lg shadow-red-500/20
              hover:bg-red-500/30 hover:border-red-400/80
              hover:scale-105 hover:shadow-xl
              active:scale-95
              transition-all duration-300
              group
            "
          >
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <div className="flex flex-col items-start">
                <span>Clear All</span>
                <span className="text-xs text-red-200">
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
                  bg-gradient-to-r from-yellow-400/20 to-yellow-600/20
                  border border-yellow-400/40
                  rounded-full text-xs text-yellow-100
                  shadow-md hover:shadow-lg
                  transition-all duration-200
                  group
                "
              >
                <span className="font-medium">{filterName}:</span>
                <span className="font-semibold">{value}</span>
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
                    transition-colors duration-200
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