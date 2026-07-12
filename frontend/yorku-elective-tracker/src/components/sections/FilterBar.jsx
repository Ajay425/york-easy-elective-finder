import { forwardRef, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, X, Filter, Search } from "lucide-react";
import {
  getCourseTypeDescription,
  getCourseTypeLabel,
  getDepartmentDescription,
  getDepartmentLabel,
} from "../../lib/courseFilters";

function getFilterLabel(filterName) {
  if (filterName === "CourseType") return "Course Type";
  if (filterName === "StartTime") return "Start Time";
  if (filterName === "EndTime") return "End Time";
  return filterName;
}

function getFilterValueLabel(filterName, value) {
  if (filterName === "CourseType") return getCourseTypeLabel(value);
  if (filterName === "Department") return getDepartmentLabel(value);
  return String(value);
}

function getFilterValueDescription(filterName, value) {
  if (filterName === "CourseType") return getCourseTypeDescription(value);
  return "";
}

function getFilterSearchText(filterName, value) {
  return [
    value,
    getFilterValueLabel(filterName, value),
    getFilterValueDescription(filterName, value),
    filterName === "Department" ? getDepartmentDescription(value) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterButtonClass(hasActiveFilters) {
  return `
    relative group
    w-full min-w-0 sm:w-auto sm:min-w-[140px]
    h-auto py-2.5 px-4
    rounded-lg font-medium text-sm
    border transition-all duration-300
    ${hasActiveFilters
      ? `
        bg-gradient-to-r from-purple-500/20 to-pink-500/20
        border-purple-400/40 text-white shadow-lg shadow-purple-500/10
      `
      : `
        bg-white/5 border-white/15 text-white/80
        hover:bg-white/10 hover:border-white/25 hover:text-purple-300
      `
    }
    hover:shadow-lg
    active:scale-95
  `;
}

function optionClass(active) {
  return `
    cursor-pointer rounded-md px-3 py-3 my-0.5
    transition-all duration-200 group
    ${active
      ? "bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white font-medium focus:from-purple-500/50 focus:to-pink-500/50 focus:text-purple-100"
      : "text-white/75 hover:bg-white/10 hover:text-purple-300 focus:bg-white/10 focus:text-purple-300"
    }
  `;
}

const ActiveFilterButton = forwardRef(function ActiveFilterButton(
  { filterName, activeCount, activeValues, className, ...props },
  ref
) {
  const filterLabel = getFilterLabel(filterName);
  const hasActiveFilters = activeCount > 0;

  return (
    <Button
      ref={ref}
      className={`${filterButtonClass(hasActiveFilters)} ${className || ""}`}
      {...props}
    >
      <div className="flex w-full flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-3">
          <span className="font-semibold transition-all duration-300 group-hover:text-purple-300">
            {filterLabel}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {hasActiveFilters && (
              <span className="rounded-full bg-gradient-to-r from-purple-400 to-pink-400 px-2 py-0.5 text-[10px] font-bold text-black transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-400/50">
                {activeCount}
              </span>
            )}
            <ChevronDown className="h-4 w-4 transition-all duration-300 group-data-[state=open]:rotate-180 group-hover:text-purple-300" />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-1 flex w-full flex-wrap gap-1">
            {activeValues.slice(0, 2).map((tag) => (
              <span
                key={String(tag)}
                className="max-w-[12rem] truncate rounded-md bg-purple-400/30 px-2 py-0.5 text-[10px] font-medium text-purple-200 sm:max-w-[120px]"
                title={getFilterValueLabel(filterName, tag)}
              >
                {getFilterValueLabel(filterName, tag)}
              </span>
            ))}
            {activeCount > 2 && (
              <span className="rounded-md bg-pink-400/30 px-2 py-0.5 text-[10px] font-bold text-pink-200">
                +{activeCount - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Button>
  );
});

function SearchableOptions({
  filterName,
  options,
  selectedValues,
  onSelect,
  closeOnSelect = true,
  searchable = false,
}) {
  const [query, setQuery] = useState("");
  const filterLabel = getFilterLabel(filterName);
  const normalizedQuery = query.trim().toLowerCase();

  const visibleOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      getFilterSearchText(filterName, option).includes(normalizedQuery)
    );
  }, [filterName, normalizedQuery, options]);

  const showSearch = searchable || options.length > 10;

  return (
    <>
      <div className="border-b border-white/10 bg-gray-950/95 p-2">
        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white/60">
          {filterLabel}
        </div>
        {showSearch && (
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key !== "Escape") event.stopPropagation();
              }}
              placeholder={`Search ${filterLabel.toLowerCase()}...`}
              aria-label={`Search ${filterLabel.toLowerCase()} filter options`}
              className="
                h-10 w-full rounded-md border border-white/10 bg-black/30
                pl-9 pr-3 text-sm text-white outline-none
                placeholder:text-white/40
                focus:border-purple-300/60 focus:bg-black/40
              "
            />
          </div>
        )}
      </div>

      <div className="max-h-[calc(72vh-5rem)] overflow-y-auto p-2 sm:max-h-[24rem]">
        {visibleOptions.length > 0 ? (
          visibleOptions.map((option) => {
            const active = selectedValues.includes(option);
            const optionLabel = getFilterValueLabel(filterName, option);
            const optionDescription = getFilterValueDescription(filterName, option);

            return (
              <DropdownMenuItem
                key={String(option)}
                onSelect={(event) => {
                  if (!closeOnSelect) event.preventDefault();
                  onSelect(option);
                }}
                className={optionClass(active)}
              >
                <div className="flex w-full min-w-0 items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{optionLabel}</span>
                    {optionDescription && (
                      <span className="block truncate text-[11px] font-normal text-white/45">
                        {optionDescription}
                      </span>
                    )}
                  </span>
                  {active && (
                    <span className="shrink-0 text-purple-300 transition-all duration-200 group-hover:scale-110">
                      ✓
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })
        ) : (
          <div className="px-3 py-6 text-center text-sm text-white/55">
            No matches for "{query}".
          </div>
        )}
      </div>
    </>
  );
}

function FilterMenuContent({ children }) {
  return (
    <DropdownMenuContent
      align="center"
      sideOffset={8}
      className="
        w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)]
        overflow-hidden rounded-lg border border-white/10 bg-gray-950/95 p-0
        text-white shadow-xl backdrop-blur-md
        sm:w-[26rem]
      "
    >
      {children}
    </DropdownMenuContent>
  );
}

function MultiSelectFilterMenu({
  filterName,
  options,
  filters,
  setFilters,
  onFilterChange,
}) {
  const selectedValues = Array.isArray(filters[filterName]) ? filters[filterName] : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActiveFilterButton
          filterName={filterName}
          activeCount={selectedValues.length}
          activeValues={selectedValues}
        />
      </DropdownMenuTrigger>
      <FilterMenuContent>
        <SearchableOptions
          filterName={filterName}
          options={options}
          selectedValues={selectedValues}
          closeOnSelect
          searchable={filterName === "Department" || filterName === "CourseType"}
          onSelect={(option) => {
            setFilters((prev) => {
              const previousValues = Array.isArray(prev[filterName]) ? prev[filterName] : [];
              const active = previousValues.includes(option);
              return {
                ...prev,
                [filterName]: active
                  ? previousValues.filter((x) => x !== option)
                  : [...previousValues, option],
              };
            });
            onFilterChange?.();
          }}
        />
      </FilterMenuContent>
    </DropdownMenu>
  );
}

function SingleSelectFilterMenu({
  filterName,
  options,
  filters,
  setFilters,
  onFilterChange,
}) {
  const selectedValue = filters[filterName];
  const selectedValues = selectedValue ? [selectedValue] : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActiveFilterButton
          filterName={filterName}
          activeCount={selectedValue ? 1 : 0}
          activeValues={selectedValues}
        />
      </DropdownMenuTrigger>
      <FilterMenuContent>
        <SearchableOptions
          filterName={filterName}
          options={options}
          selectedValues={selectedValues}
          closeOnSelect
          searchable
          onSelect={(option) => {
            setFilters((prev) => ({
              ...prev,
              [filterName]: prev[filterName] === option ? null : option,
            }));
            onFilterChange?.();
          }}
        />
      </FilterMenuContent>
    </DropdownMenu>
  );
}

export function FilterBar({ filters, setFilters, filterOptions, onClear, onFilterChange }) {
  const totalActiveFilters = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === "StartTime" || key === "EndTime") {
      return count + (value != null ? 1 : 0);
    }
    return count + (Array.isArray(value) ? value.length : 0);
  }, 0);

  return (
    <div className="mb-6 w-full px-4 sm:px-8">
      <div className="mb-4 flex items-center justify-center gap-2">
        <Filter className="h-5 w-5 text-purple-300" />
        <h3 className="text-lg font-semibold text-white">
          Filter Courses
          {totalActiveFilters > 0 && (
            <span className="ml-2 text-sm text-purple-300">
              ({totalActiveFilters} active)
            </span>
          )}
        </h3>
      </div>

      <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3">
        {Object.entries(filterOptions)
          .filter(([filterName]) => filterName !== "StartTime" && filterName !== "EndTime")
          .map(([filterName, options]) => (
            <MultiSelectFilterMenu
              key={filterName}
              filterName={filterName}
              options={options}
              filters={filters}
              setFilters={setFilters}
              onFilterChange={onFilterChange}
            />
          ))}

        {filterOptions.StartTime && filterOptions.StartTime.length > 0 && (
          <SingleSelectFilterMenu
            filterName="StartTime"
            options={filterOptions.StartTime}
            filters={filters}
            setFilters={setFilters}
            onFilterChange={onFilterChange}
          />
        )}

        {filterOptions.EndTime && filterOptions.EndTime.length > 0 && (
          <SingleSelectFilterMenu
            filterName="EndTime"
            options={filterOptions.EndTime}
            filters={filters}
            setFilters={setFilters}
            onFilterChange={onFilterChange}
          />
        )}

        {totalActiveFilters > 0 && (
          <Button
            onClick={onClear}
            className="
              h-auto w-full min-w-0 rounded-lg border border-red-400/30
              bg-gradient-to-r from-red-500/15 to-orange-500/15 px-4 py-2.5
              text-sm font-semibold text-white shadow-md shadow-red-500/10
              transition-all duration-300
              hover:border-red-400/50 hover:bg-red-500/25 hover:text-red-200 hover:shadow-lg hover:shadow-red-500/20
              active:scale-95 sm:w-auto sm:min-w-[140px]
            "
          >
            <div className="flex items-center justify-center gap-2">
              <X className="h-4 w-4 transition-all duration-300 group-hover:rotate-90" />
              <div className="flex flex-col items-start">
                <span>Clear All</span>
                <span className="text-xs text-red-200/70">
                  {totalActiveFilters} filter{totalActiveFilters !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </Button>
        )}
      </div>

      {totalActiveFilters > 0 && (
        <div className="mx-auto mt-4 flex max-w-5xl flex-wrap justify-center gap-2">
          {Object.entries(filters).map(([filterName, values]) => {
            if (filterName === "StartTime" || filterName === "EndTime") {
              return values ? (
                <ActiveFilterPill
                  key={`${filterName}-${values}`}
                  filterName={filterName}
                  value={values}
                  onRemove={() => {
                    setFilters((prev) => ({
                      ...prev,
                      [filterName]: null,
                    }));
                    onFilterChange?.();
                  }}
                />
              ) : null;
            }

            return Array.isArray(values)
              ? values.map((value) => (
                <ActiveFilterPill
                  key={`${filterName}-${value}`}
                  filterName={filterName}
                  value={value}
                  onRemove={() => {
                    setFilters((prev) => ({
                      ...prev,
                      [filterName]: prev[filterName].filter((x) => x !== value),
                    }));
                    onFilterChange?.();
                  }}
                />
              ))
              : null;
          })}
        </div>
      )}
    </div>
  );
}

function ActiveFilterPill({ filterName, value, onRemove }) {
  const filterLabel = getFilterLabel(filterName);
  const valueLabel = getFilterValueLabel(filterName, value);

  return (
    <div
      className="
        flex max-w-full items-center gap-2 rounded-full border border-purple-400/30
        bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-1.5
        text-xs text-purple-100 shadow-sm transition-all duration-300
        hover:border-purple-400/60 hover:from-purple-500/40 hover:to-pink-500/40 hover:text-purple-200 hover:shadow-md
      "
    >
      <span className="shrink-0 font-medium">{filterLabel}:</span>
      <span className="max-w-[min(70vw,18rem)] truncate font-semibold" title={valueLabel}>
        {valueLabel}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${valueLabel} from ${filterLabel}`}
        className="
          ml-1 shrink-0 rounded-full bg-red-500/30 p-0.5
          transition-all duration-200 hover:bg-red-500/50
        "
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default FilterBar;
