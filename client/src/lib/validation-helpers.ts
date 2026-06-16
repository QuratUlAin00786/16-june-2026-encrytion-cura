import { z } from "zod";
import { UseFormSetError, FieldValues } from "react-hook-form";

// Common validation patterns
export const validationPatterns = {
  // Required string with trim
  requiredString: (message: string = "This field is required") =>
    z.string().trim().min(1, message),
  
  // Email validation
  email: (message: string = "Please enter a valid email address") =>
    z.string().trim().email(message).min(1, "Email is required"),
  
  // Phone validation (basic international format)
  phone: (message: string = "Please enter a valid phone number") =>
    z.string().trim().min(1, "Phone number is required").regex(
      /^[\+]?[1-9][\d]{0,15}$/,
      message
    ),
  
  // Number validation
  requiredNumber: (message: string = "This field is required") =>
    z.coerce.number({ invalid_type_error: message }).positive("Must be greater than 0"),
  
  // Date validation
  requiredDate: (message: string = "Date is required") =>
    z.coerce.date({ required_error: message, invalid_type_error: "Invalid date format" }),
  
  // Select/enum validation
  requiredSelect: (message: string = "Please select an option") =>
    z.string().min(1, message),
  
  // Array validation (for multi-select)
  requiredArray: (message: string = "Please select at least one option") =>
    z.array(z.string()).min(1, message),
  
  // Optional string
  optionalString: () => z.string().optional(),
  
  // Password validation
  password: (minLength: number = 6) =>
    z.string().min(minLength, `Password must be at least ${minLength} characters`),
  
  // Currency/decimal validation
  currency: (message: string = "Please enter a valid amount") =>
    z.coerce.number({ invalid_type_error: message }).min(0, "Amount cannot be negative"),
};

// Error mapping utility for server-side validation errors
export function mapServerErrorsToForm<T extends FieldValues>(
  setError: UseFormSetError<T>,
  serverErrors: Record<string, string[]> | string
) {
  if (typeof serverErrors === 'string') {
    // Generic error - could set on a specific field or handle differently
    console.error('Server validation error:', serverErrors);
    return;
  }

  Object.entries(serverErrors).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : messages;
    setError(field as any, {
      type: 'server',
      message: message
    });
  });
}

// Utility to scroll to first error field
export function scrollToFirstError() {
  const firstErrorElement = document.querySelector('[data-invalid="true"]') || 
                          document.querySelector('.border-red-500');
  
  if (firstErrorElement) {
    firstErrorElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // Focus if it's an input
    if (firstErrorElement instanceof HTMLInputElement || 
        firstErrorElement instanceof HTMLTextAreaElement || 
        firstErrorElement instanceof HTMLSelectElement) {
      firstErrorElement.focus();
    }
  }
}

// Common validation schemas that can be reused
export const commonSchemas = {
  // User contact info
  userContact: z.object({
    firstName: validationPatterns.requiredString("First name is required"),
    lastName: validationPatterns.requiredString("Last name is required"),
    email: validationPatterns.email(),
    phone: validationPatterns.phone().optional(),
  }),
  
  // Address schema
  address: z.object({
    street: validationPatterns.requiredString("Street address is required"),
    city: validationPatterns.requiredString("City is required"),
    state: validationPatterns.requiredString("State is required"),
    zipCode: validationPatterns.requiredString("ZIP code is required"),
    country: validationPatterns.requiredString("Country is required"),
  }).partial({ // Make all optional by default
    street: true,
    city: true,
    state: true,
    zipCode: true,
    country: true,
  }),
  
  // Date range
  dateRange: z.object({
    startDate: validationPatterns.requiredDate("Start date is required"),
    endDate: validationPatterns.requiredDate("End date is required"),
  }).refine(
    (data) => data.endDate >= data.startDate,
    { message: "End date must be after start date", path: ["endDate"] }
  ),
};