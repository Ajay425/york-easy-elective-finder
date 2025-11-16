import { useState } from "react";
import { Input } from "@/components/ui/input";

export function SearchBar({ onSearch, searchQuery }) {
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = () => {
    onSearch(searchInput);
  };

  const handleClear = () => {
    setSearchInput("");
    onSearch("");
  };

  return (
    <div className="w-full max-w-3xl px-6 sm:px-10 mt-6 mb-4 flex items-center gap-3">
      <Input
        type="text"
        placeholder="Search courses (e.g., EECS 1012, Psychology, 3.00)…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
        className="flex-1 rounded-xl bg-white/10 backdrop-blur-md text-white placeholder:text-white/50 border border-white/20 shadow-sm focus-visible:ring-yellow-300 focus-visible:ring-offset-0"
      />

      <button
        onClick={handleSearch}
        className="px-5 py-2 rounded-xl font-semibold text-white text-sm bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_3px_6px_rgba(0,0,0,0.4)] hover:bg-white/20 hover:shadow-[0_4px_12px_rgba(255,255,255,0.25)] active:scale-95 transition-all"
      >
        Search
      </button>

      {searchQuery && (
        <button
          onClick={handleClear}
          className="px-4 py-2 rounded-xl font-semibold text-white text-sm bg-red-500/20 backdrop-blur-md border border-red-400/30 hover:bg-red-500/30 active:scale-95 transition-all"
        >
          Clear
        </button>
      )}
    </div>
  );
}