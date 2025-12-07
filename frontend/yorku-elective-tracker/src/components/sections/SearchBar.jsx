import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Sparkles } from "lucide-react";
import {io} from "socket.io-client";

const socket = io("https://york-easy-elective-finder-production.up.railway.app", {
  transports: ["websocket"],
  secure: true
});




export function SearchBar({ onSearch, searchQuery }) {
  const [searchInput, setSearchInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState([]);

  useEffect(() => {
    // Listen for trending searches from the socket server
    socket.on("trendingSearches", (searches) => {
    console.log("[TRENDING RECEIVED FROM SERVER]", searches);
      setTrendingSearches(searches);
    });
    return () => {
      socket.off("trendingSearches");
    };
  }, []);

  const handleSearch = () => {
    onSearch(searchInput);

    if(searchInput.trim()) {
      socket.emit("search", searchInput); // this should send a search request to the socket server
    }
  };

  const handleClear = () => {
    setSearchInput("");
    onSearch("");
  };

  return (
    <div className="w-full max-w-4xl px-6 sm:px-10 mt-8 mb-6">
      {/* Search Header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Search className="w-5 h-5 text-yellow-200" />
        <h3 className="text-lg font-semibold text-yellow-100">
          Search for Your Perfect Course
        </h3>
        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
      </div>

      {/* Search Bar Container */}
      <div className="relative">
        {/* Glow Effect Background */}
        <div 
          className={`
            absolute -inset-1 bg-gradient-to-r from-yellow-400 to-yellow-600 
            rounded-2xl blur-lg opacity-0 transition-opacity duration-500
            ${isFocused ? 'opacity-30' : ''}
          `}
        />

        {/* Main Search Container */}
        <div className="relative flex items-center gap-3">
          {/* Search Icon (inside input on left) */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-300/70 pointer-events-none z-10" />
            
            <Input
              type="text"
              placeholder="Try: EECS 1012, Psychology, Data Structures, 3.00 credits..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`
                w-full h-14 pl-12 pr-4
                rounded-xl
                bg-white/10 backdrop-blur-xl
                text-white font-medium
                placeholder:text-white/40
                border-2 transition-all duration-300
                shadow-xl
                ${isFocused 
                  ? 'border-yellow-400/60 bg-white/15 shadow-2xl shadow-yellow-500/20' 
                  : 'border-white/20 hover:border-white/40'
                }
                focus-visible:ring-2 focus-visible:ring-yellow-400/50 
                focus-visible:ring-offset-0
              `}
            />

            {/* Clear Button (inside input on right) */}
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  p-1.5 rounded-full
                  bg-white/10 hover:bg-red-500/30
                  border border-white/20 hover:border-red-400/50
                  transition-all duration-200
                  group z-10
                "
              >
                <X className="w-4 h-4 text-white/60 group-hover:text-red-300 group-hover:rotate-90 transition-all duration-200" />
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="
              relative group
              h-14 px-8
              rounded-xl font-semibold text-base
              bg-white/10 backdrop-blur-md
              text-white
              border-2 border-white/30
              shadow-lg
              hover:bg-white/20 hover:border-white/50
              hover:shadow-xl hover:shadow-white/10
              hover:scale-105 hover:-translate-y-0.5
              active:scale-95 active:translate-y-0
              transition-all duration-300
            "
          >
            {/* Button Content */}
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span>Search</span>
            </div>
          </button>

          {/* Clear Search Results Button */}
          {searchQuery && (
            <button
              onClick={handleClear}
              className="relative group h-14 px-6 rounded-xl font-bold text-sm bg-gradient-to-br from-red-500/30 to-red-700/30 text-white border-2 border-red-400/50 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/40 hover:scale-105 hover:-translate-y-0.5
                active:scale-95 active:translate-y-0
                transition-all duration-300
                backdrop-blur-md
              "
            >
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                <span>Clear</span>
              </div>
            </button>
          )}
        </div>

        {/* Search Tips */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-yellow-300">
              Enter
            </kbd>
            to search
          </span>
          <span className="text-white/30">•</span>
          <span>Search by course code, name, or faculty</span>
        </div>

        {/* Search Results Summary */}
        {searchQuery && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/20 border border-yellow-400/40 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-semibold text-yellow-100">
                Searching for: <span className="text-yellow-300">"{searchQuery}"</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Popular Searches (Live + Fallback) */}
{/* Popular Searches (Live + Fallback) */}
{!searchInput.trim() && (
  <div className="mt-6 flex flex-col items-center gap-3">
    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
      Popular Searches
    </p>

    <div className="flex flex-wrap justify-center gap-2">
      {(trendingSearches.length > 0 
        ? trendingSearches 
        : ['ECON', 'STS', 'Psychology', 'Business', 'Games'])
        .map((suggestion, index) => (
          <button
            key={index}
            onClick={() => {
              setSearchInput(suggestion);
              onSearch(suggestion);
              socket.emit("search", suggestion);
            }}
            className="
              px-4 py-2 text-xs font-semibold
              bg-gradient-to-r from-purple-500/20 to-pink-500/10
              hover:from-purple-500/40 hover:to-pink-500/30
              border border-purple-400/30 hover:border-purple-400/60
              rounded-full
              text-purple-300 hover:text-purple-200
              transition-all duration-300
              hover:scale-110 hover:shadow-lg hover:shadow-purple-500/30
            "
          >
            {suggestion}
          </button>
      ))}
    </div>
  </div>
)}

    </div>
  );
}

export default SearchBar;