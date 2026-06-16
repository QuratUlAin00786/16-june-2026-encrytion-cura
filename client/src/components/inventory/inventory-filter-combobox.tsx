import { useState, type Dispatch, type SetStateAction } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const FILTER_ALL = "__all__";

export const inventoryFilterLabelClass = "text-sm font-medium text-muted-foreground mb-1.5 block";
export const inventoryFilterControlClass = "h-10 text-sm";
export const inventoryClearButtonClass = "h-10 text-sm";
export const inventoryTableHeadClass = "font-semibold text-lg text-gray-700 py-3 px-4";
export const inventoryTableCellClass = "text-lg text-gray-700 py-3 px-4";
export const inventoryIdCellClass = "text-lg font-bold font-mono text-gray-900 py-3 px-4";
export const inventoryNumberCellClass = "text-lg font-bold text-gray-900 py-3 px-4";

export function buildFilterOptions(
  values: Array<string | number | null | undefined>,
  allLabel = "All",
): Array<{ value: string; label: string }> {
  const unique = [
    ...new Set(
      values
        .filter((value) => value != null && String(value).trim() !== "")
        .map((value) => String(value)),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return [{ value: FILTER_ALL, label: allLabel }, ...unique.map((value) => ({ value, label: value }))];
}

export function matchesFilterValue(
  filterValue: string,
  actualValue: string | number | null | undefined,
): boolean {
  if (filterValue === FILTER_ALL || !filterValue) return true;
  return String(actualValue ?? "") === filterValue;
}

export function applyExclusiveFilter<T extends Record<string, string>>(
  defaults: T,
  setFilters: Dispatch<SetStateAction<T>>,
  key: keyof T,
  value: string,
  getEmptyValue: (field: keyof T) => string = () => FILTER_ALL,
) {
  const emptyValue = getEmptyValue(key);
  if (value === emptyValue) {
    setFilters((current) => ({ ...current, [key]: emptyValue }));
    return;
  }

  setFilters({
    ...defaults,
    [key]: value,
  });
}

interface InventoryFilterComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export function InventoryFilterCombobox({
  label,
  value,
  onChange,
  options,
  className,
}: InventoryFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn("min-w-[140px] flex-1", className)}>
      <span className={inventoryFilterLabelClass}>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", inventoryFilterControlClass)}
          >
            <span className="truncate">{selected?.label ?? label}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface InventoryFilterDateProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

interface InventoryFilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

export function InventoryFilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: InventoryFilterSelectProps) {
  return (
    <div className={cn("min-w-[140px] flex-1", className)}>
      <span className={inventoryFilterLabelClass}>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn("w-full font-normal", inventoryFilterControlClass)}>
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function InventoryFilterDate({
  label,
  value,
  onChange,
  className,
}: InventoryFilterDateProps) {
  return (
    <div className={cn("min-w-[140px] flex-1", className)}>
      <span className={inventoryFilterLabelClass}>{label}</span>
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inventoryFilterControlClass}
      />
    </div>
  );
}
