import { useState, useEffect } from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { saasQueryClient } from "@/lib/saasQueryClient";
import SaaSLogin from './SaaSLogin';
import SaaSDashboard from './SaaSDashboard';

export function SaaSPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('saasToken');
    if (token) {
      // Verify token validity (optional)
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (token: string) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={saasQueryClient}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {!isAuthenticated ? (
          <SaaSLogin onLoginSuccess={handleLoginSuccess} />
        ) : (
          <SaaSDashboard onLogout={handleLogout} />
        )}
      </div>
    </QueryClientProvider>
  );
}