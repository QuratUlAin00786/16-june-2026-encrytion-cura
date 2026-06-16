import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if current page is a login/auth page
  const isAuthPage = () => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    return (
      path.includes("/auth/login") ||
      path.includes("/login") ||
      path.includes("/auth/reset-password") ||
      path.includes("/create-trial") ||
      path.includes("/create-trial-verify") ||
      path.includes("/create-trial-set-password")
    );
  };

  // Initialize theme from localStorage on client side only
  useEffect(() => {
    // Force light theme on login/auth pages
    if (isAuthPage()) {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add("light");
      setTheme("light");
      setIsInitialized(true);
      return;
    }

    const savedTheme = localStorage.getItem("cura-theme") as Theme;
    const initialTheme = savedTheme || "light";
    
    // Apply theme immediately without waiting for state update
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(initialTheme);
    
    setTheme(initialTheme);
    setIsInitialized(true);
  }, []);

  // Watch for route changes and apply theme accordingly
  useEffect(() => {
    const handleRouteChange = () => {
      if (isAuthPage()) {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add("light");
        setTheme("light");
      } else if (isInitialized) {
        // Restore theme from localStorage when leaving auth pages
        const savedTheme = localStorage.getItem("cura-theme") as Theme;
        const themeToApply = savedTheme || "light";
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(themeToApply);
        setTheme(themeToApply);
      }
    };

    // Check on mount and listen for popstate (back/forward navigation)
    handleRouteChange();
    window.addEventListener("popstate", handleRouteChange);
    
    // Also check periodically for route changes (for programmatic navigation)
    const interval = setInterval(handleRouteChange, 100);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
      clearInterval(interval);
    };
  }, [isInitialized]);

  // Apply theme changes immediately when theme state changes
  useEffect(() => {
    // Force light theme on login/auth pages
    if (isAuthPage()) {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add("light");
      return;
    }

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    // Save theme to localStorage (only if not on auth page)
    localStorage.setItem("cura-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    
    // Apply theme change immediately to DOM
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
    
    // Update state
    setTheme(newTheme);
    
    // Save to localStorage immediately
    localStorage.setItem("cura-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};