import { useCurrency } from "@/hooks/use-currency";
import { useEffect, useState } from "react";

/**
 * CurrencyIcon component that displays the currency symbol from organization
 * Can be used as a replacement for PoundSterling or other currency icons
 * Automatically updates when currency changes in organizations table
 */
export function CurrencyIcon({ className }: { className?: string }) {
  const { currencySymbol, _version } = useCurrency();
  // Use state to force re-render when currency changes
  const [displaySymbol, setDisplaySymbol] = useState(currencySymbol);
  
  // Update whenever currencySymbol or _version changes
  useEffect(() => {
    setDisplaySymbol(currencySymbol);
  }, [currencySymbol, _version]);
  
  return (
    <span 
      className={className} 
      style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}
    >
      {displaySymbol}
    </span>
  );
}
