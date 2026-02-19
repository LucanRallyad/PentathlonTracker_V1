"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  ageCategory: string;
  gender: string;
  club: string | null;
}

interface AthleteSelectorProps {
  selectedAthlete: Athlete | null;
  onSelect: (athlete: Athlete | null) => void;
  excludeIds?: string[];
  placeholder?: string;
  label?: string;
}

export function AthleteSelector({
  selectedAthlete,
  onSelect,
  excludeIds = [],
  placeholder = "Search athletes...",
  label,
}: AthleteSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Athlete[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search as user types
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/athletes/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          const filtered = data.filter(
            (a: Athlete) => !excludeIds.includes(a.id) && a.id !== selectedAthlete?.id
          );
          setSearchResults(filtered);
        }
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, excludeIds, selectedAthlete?.id]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(athlete: Athlete) {
    onSelect(athlete);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  }

  function handleClear() {
    onSelect(null);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  }

  return (
    <div className="relative" ref={searchRef}>
      {label && (
        <label className="block text-xs font-medium text-[#9B9A97] uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      
      {selectedAthlete ? (
        <div className="border border-[#E9E9E7] rounded-[4px] p-3 bg-white flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#37352F]">
              {selectedAthlete.firstName} {selectedAthlete.lastName}
            </div>
            <div className="text-xs text-[#787774]">
              {selectedAthlete.country} · {selectedAthlete.ageCategory} · {selectedAthlete.gender}
            </div>
          </div>
          <button
            onClick={handleClear}
            className="p-1 rounded-[3px] hover:bg-[#EFEFEF] text-[#787774] transition-colors"
            aria-label="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9A97] pointer-events-none"
          />
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E9E9E7] rounded-[4px] focus:border-[#0B6E99] focus:outline-none text-[#37352F] placeholder:text-[#9B9A97] transition-colors"
          />
          {searching && (
            <Loader2
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9A97] animate-spin"
            />
          )}
        </div>
      )}

      {/* Search Results Dropdown */}
      {showSearch && searchQuery.length >= 2 && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#E9E9E7] rounded-[4px] shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((athlete) => (
            <button
              key={athlete.id}
              onClick={() => handleSelect(athlete)}
              className="w-full text-left px-3 py-2 hover:bg-[#F7F6F3] transition-colors border-b border-[#E9E9E7] last:border-b-0"
            >
              <div className="text-sm font-medium text-[#37352F]">
                {athlete.firstName} {athlete.lastName}
              </div>
              <div className="text-xs text-[#787774]">
                {athlete.country} · {athlete.ageCategory} · {athlete.gender}
              </div>
            </button>
          ))}
        </div>
      )}

      {showSearch && searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#E9E9E7] rounded-[4px] shadow-lg p-3 text-sm text-[#787774]">
          No athletes found
        </div>
      )}
    </div>
  );
}
