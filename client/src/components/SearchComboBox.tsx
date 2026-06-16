import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  type: 'invoice_id' | 'patient_id' | 'patient_name';
  value: string;
  display: string;
  searchValue: string;
}

interface SearchComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export function SearchComboBox({
  value,
  onValueChange,
  placeholder = "Search...",
  className = "",
  testId = "search-combobox"
}: SearchComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setOpen(value.length >= 2); // Auto-open when typing
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Fetch suggestions from API
  const { data: suggestions = [], isLoading } = useQuery<SearchSuggestion[]>({
    queryKey: ['/api/billing/search-suggestions', debouncedValue],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      
      const response = await fetch(
        `/api/billing/search-suggestions?query=${encodeURIComponent(debouncedValue)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': subdomain,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch search suggestions');
      }
      
      return response.json();
    },
    enabled: debouncedValue.length >= 2,
    staleTime: 30000,
  });

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  // Handle keyboard navigation and auto-complete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && e.key !== 'Escape') {
      setOpen(true);
      return;
    }

    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex].searchValue);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <input
            type="text"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            data-testid={testId}
          />
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={placeholder}
              value={value}
              onValueChange={onValueChange}
              className="hidden"
            />
            {isLoading && (
              <div className="p-4 text-sm text-gray-500">Loading suggestions...</div>
            )}
            {!isLoading && debouncedValue.length >= 2 && suggestions.length === 0 && (
              <CommandEmpty>No results found. You can type any search term.</CommandEmpty>
            )}
            {!isLoading && suggestions.length > 0 && (
              <CommandGroup>
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`${suggestion.type}-${suggestion.value}`}
                    value={suggestion.searchValue}
                    onSelect={() => handleSelect(suggestion.searchValue)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      highlightedIndex === index && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === suggestion.searchValue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{suggestion.display}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {debouncedValue.length < 2 && (
              <div className="p-4 text-sm text-gray-500">Type at least 2 characters to see suggestions</div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
