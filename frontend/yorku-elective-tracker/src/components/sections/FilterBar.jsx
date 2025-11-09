import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const FilterBar = ({ filters, filterOptions, setFilters, onClear }) => {
  const filterMenu = useMemo(
    () =>
      Object.entries(filterOptions).map(([filterName, options]) => (
        <DropdownMenu key={filterName}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
            >
              {filters[filterName] || filterName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white/10 text-white border border-white/20 backdrop-blur-md max-h-64 overflow-y-auto">
            {options.map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    [filterName]: option === prev[filterName] ? "" : option,
                  }))
                }
                className={`cursor-pointer ${
                  filters[filterName] === option ? "bg-white/20" : ""
                }`}
              >
                {option}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )),
    [filters, filterOptions, setFilters]
  );

  return (
    <div className="flex flex-wrap justify-center gap-3 px-4 sm:px-8 mb-8 mt-6">
      {filterMenu}
      <Button
        onClick={onClear}
        variant="secondary"
        className="bg-white/10 text-white border border-white/20 hover:bg-white/20"
      >
        Clear Filters
      </Button>
    </div>
  );
};

export default FilterBar;
