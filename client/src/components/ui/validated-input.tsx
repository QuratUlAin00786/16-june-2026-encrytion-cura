import { useFormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ValidatedInputProps extends React.ComponentProps<typeof Input> {
  label: string;
  required?: boolean;
}

export function ValidatedInput({ label, required, className, ...props }: ValidatedInputProps) {
  const { error } = useFormField();
  
  return (
    <FormItem>
      <FormLabel className={cn(required && "after:content-['*'] after:text-red-500 after:ml-1")}>
        {label}
      </FormLabel>
      <FormControl>
        <Input
          className={cn(
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
      </FormControl>
      <FormMessage className="text-red-600 dark:text-red-400" />
    </FormItem>
  );
}

interface ValidatedSelectProps {
  label: string;
  required?: boolean;
  placeholder?: string;
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function ValidatedSelect({ 
  label, 
  required, 
  placeholder, 
  children, 
  value, 
  onValueChange,
  className 
}: ValidatedSelectProps) {
  const { error } = useFormField();
  
  return (
    <FormItem>
      <FormLabel className={cn(required && "after:content-['*'] after:text-red-500 after:ml-1")}>
        {label}
      </FormLabel>
      <Select value={value} onValueChange={onValueChange}>
        <FormControl>
          <SelectTrigger 
            className={cn(
              error && "border-red-500 focus:border-red-500 focus:ring-red-500",
              className
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
      <FormMessage className="text-red-600 dark:text-red-400" />
    </FormItem>
  );
}

interface ValidatedTextareaProps extends React.ComponentProps<typeof Textarea> {
  label: string;
  required?: boolean;
}

export function ValidatedTextarea({ label, required, className, ...props }: ValidatedTextareaProps) {
  const { error } = useFormField();
  
  return (
    <FormItem>
      <FormLabel className={cn(required && "after:content-['*'] after:text-red-500 after:ml-1")}>
        {label}
      </FormLabel>
      <FormControl>
        <Textarea
          className={cn(
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
      </FormControl>
      <FormMessage className="text-red-600 dark:text-red-400" />
    </FormItem>
  );
}