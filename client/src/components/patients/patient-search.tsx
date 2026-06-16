import { useState } from "react";
import { Search, Filter, X, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface PatientSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onClear: () => void;
}

export interface SearchFilters {
  searchType: 'all' | 'name' | 'postcode' | 'phone' | 'nhsNumber' | 'email';
  ageRange?: { min: number; max: number };
  insuranceProvider?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  patientId?: string;
  hasUpcomingAppointments?: boolean;
  lastVisit?: 'week' | 'month' | 'quarter' | 'year';
}

export function PatientSearch({ onSearch, onClear }: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    searchType: 'all'
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [patientIdOpen, setPatientIdOpen] = useState(false);
  const [patientIdSearch, setPatientIdSearch] = useState("");

  // Fetch all patients to get their IDs
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  // Extract unique patient IDs and sort them
  const patientIds = Array.isArray(patients)
    ? Array.from(new Set(patients.map((p: any) => p.patientId).filter(Boolean))).sort()
    : [];

  const handleSearch = () => {
    onSearch(query, filters);
  };

  const handleClear = () => {
    setQuery("");
    setFilters({ searchType: 'all' });
    setShowAdvanced(false);
    onClear();
  };

  const activeFiltersCount = Object.values(filters).filter(v => 
    v !== undefined && v !== 'all' && v !== ''
  ).length - 1; // Subtract 1 for searchType which is always present

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search patients by name, postcode, phone, NHS number..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch(e.target.value, filters);
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        
        <Select 
          value={filters.searchType} 
          onValueChange={(value: SearchFilters['searchType']) => {
            const newFilters = { ...filters, searchType: value };
            setFilters(newFilters);
            onSearch(query, newFilters);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fields</SelectItem>
            <SelectItem value="name">Name Only</SelectItem>
            <SelectItem value="postcode">Postcode</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="nhsNumber">NHS Number</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} variant="default">
          Search
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="relative border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {(query || activeFiltersCount > 0) && (
          <Button variant="ghost" onClick={handleClear} className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-sm text-gray-700">Advanced Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Insurance Provider</label>
              <Select 
                value={filters.insuranceProvider || 'all'} 
                onValueChange={(value) => {
                  const newFilters = { ...filters, insuranceProvider: value === 'all' ? undefined : value };
                  setFilters(newFilters);
                  onSearch(query, newFilters);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any provider</SelectItem>
                  <SelectItem value="NHS (National Health Service)">NHS (National Health Service)</SelectItem>
                  <SelectItem value="Bupa">Bupa</SelectItem>
                  <SelectItem value="AXA PPP Healthcare">AXA PPP Healthcare</SelectItem>
                  <SelectItem value="Vitality Health">Vitality Health</SelectItem>
                  <SelectItem value="Aviva Health">Aviva Health</SelectItem>
                  <SelectItem value="Simply Health">Simply Health</SelectItem>
                  <SelectItem value="WPA">WPA</SelectItem>
                  <SelectItem value="Benenden Health">Benenden Health</SelectItem>
                  <SelectItem value="Healix Health Services">Healix Health Services</SelectItem>
                  <SelectItem value="Sovereign Health Care">Sovereign Health Care</SelectItem>
                  <SelectItem value="Exeter Friendly Society">Exeter Friendly Society</SelectItem>
                  <SelectItem value="Self-Pay">Self-Pay</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Risk Level</label>
              <Select 
                value={filters.riskLevel || 'all'} 
                onValueChange={(value) => {
                  const newFilters = { ...filters, riskLevel: value === 'all' ? undefined : value as SearchFilters['riskLevel'] };
                  setFilters(newFilters);
                  onSearch(query, newFilters);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any risk level</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Patient ID</label>
              <Popover open={patientIdOpen} onOpenChange={setPatientIdOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientIdOpen}
                    className="w-full justify-between"
                  >
                    {filters.patientId || "Any patient ID"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search patient ID..."
                      value={patientIdSearch}
                      onValueChange={setPatientIdSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No patient ID found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            const newFilters = { ...filters, patientId: undefined };
                            setFilters(newFilters);
                            onSearch(query, newFilters);
                            setPatientIdOpen(false);
                            setPatientIdSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !filters.patientId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Any patient ID
                        </CommandItem>
                        {patientIds
                          .filter((id: string) =>
                            id.toLowerCase().includes(patientIdSearch.toLowerCase())
                          )
                          .map((id: string) => (
                            <CommandItem
                              key={id}
                              value={id}
                              onSelect={(currentValue) => {
                                const newFilters = { ...filters, patientId: currentValue };
                                setFilters(newFilters);
                                onSearch(query, newFilters);
                                setPatientIdOpen(false);
                                setPatientIdSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filters.patientId === id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {id}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSearch} size="sm" variant="default">
              Apply Filters
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setFilters({ searchType: filters.searchType });
                setShowAdvanced(false);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}