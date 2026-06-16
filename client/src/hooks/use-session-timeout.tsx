import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

// Session timeout configuration
const SESSION_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 25 * 60 * 1000; // 25 minutes in milliseconds (5 minutes before timeout)
const CHECK_INTERVAL = 60 * 1000; // Check every minute

// Storage keys
const LAST_ACTIVITY_KEY = 'lastActivityTime';
const SESSION_START_KEY = 'sessionStartTime';

export function useSessionTimeout() {
  const { logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityHandlersRef = useRef<(() => void)[]>([]);

  // Initialize session on login
  const initializeSession = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    localStorage.setItem(SESSION_START_KEY, now.toString());
    console.log('🔐 SESSION: Session initialized at', new Date(now).toISOString());
  }, []);

  // Update last activity time
  const updateLastActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    
    // Reset warning if it was showing
    if (showWarning) {
      setShowWarning(false);
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    }
    
    // Reset check timer
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }
    startSessionCheck();
  }, [isAuthenticated, showWarning]);

  // Check session timeout
  const checkSessionTimeout = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) {
      // No session data, initialize it
      initializeSession();
      return;
    }

    const now = Date.now();
    const lastActivityTime = parseInt(lastActivity, 10);
    const timeSinceActivity = now - lastActivityTime;

    // Check if session has expired
    if (timeSinceActivity >= SESSION_TIMEOUT_DURATION) {
      console.log('🔐 SESSION: Session expired due to inactivity');
      handleSessionExpired();
      return;
    }

    // Check if warning should be shown
    const timeUntilWarning = WARNING_TIME - timeSinceActivity;
    if (timeUntilWarning <= 0 && !showWarning) {
      const timeUntilExpiry = SESSION_TIMEOUT_DURATION - timeSinceActivity;
      setTimeRemaining(Math.ceil(timeUntilExpiry / 1000 / 60)); // minutes remaining
      setShowWarning(true);
      
      // Set timer to auto-logout if no activity
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      warningTimerRef.current = setTimeout(() => {
        if (isAuthenticated) {
          handleSessionExpired();
        }
      }, timeUntilExpiry);
    } else if (showWarning) {
      // Update remaining time in warning modal
      const timeUntilExpiry = SESSION_TIMEOUT_DURATION - timeSinceActivity;
      setTimeRemaining(Math.ceil(timeUntilExpiry / 1000 / 60));
    }

    // Schedule next check
    startSessionCheck();
  }, [isAuthenticated, showWarning, initializeSession]);

  // Start periodic session check
  const startSessionCheck = useCallback(() => {
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }
    checkTimerRef.current = setTimeout(() => {
      checkSessionTimeout();
    }, CHECK_INTERVAL);
  }, [checkSessionTimeout]);

  // Handle session expiration
  const handleSessionExpired = useCallback(() => {
    console.log('🔐 SESSION: Handling session expiration');
    
    // Get subdomain before clearing (needed for redirect)
    const subdomain = localStorage.getItem('user_subdomain') || 'demo';
    
    // Clear all timers
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = null;
    }

    // Clear session data
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_subdomain');

    // Logout user
    logout();

    // Redirect to login with expired message
    // Use universal login if subdomain is demo, otherwise use subdomain-specific login
    if (subdomain === 'demo') {
      setLocation('/auth/login?expired=true');
    } else {
      setLocation(`/${subdomain}/login?expired=true`);
    }
  }, [logout, setLocation]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    updateLastActivity();
  }, [updateLastActivity]);

  // Setup activity listeners
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timers when not authenticated
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
        checkTimerRef.current = null;
      }
      setShowWarning(false);
      return;
    }

    // Initialize session if not already done
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) {
      initializeSession();
    }

    // Activity event handlers
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      const handler = () => handleActivity();
      document.addEventListener(event, handler, { passive: true });
      activityHandlersRef.current.push(handler);
    });

    // Start session check
    startSessionCheck();

    // Cleanup
    return () => {
      events.forEach((event, index) => {
        const handler = activityHandlersRef.current[index];
        if (handler) {
          document.removeEventListener(event, handler);
        }
      });
      activityHandlersRef.current = [];
      
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
      }
    };
  }, [isAuthenticated, initializeSession, handleActivity, startSessionCheck]);

  // Handle warning modal actions
  const handleStayLoggedIn = useCallback(() => {
    updateLastActivity();
    setShowWarning(false);
  }, [updateLastActivity]);

  const handleLogoutNow = useCallback(() => {
    setShowWarning(false);
    handleSessionExpired();
  }, [handleSessionExpired]);

  return {
    initializeSession,
    updateLastActivity,
    showWarning,
    timeRemaining,
    handleStayLoggedIn,
    handleLogoutNow,
  };
}

// Session Timeout Warning Modal Component
export function SessionTimeoutWarning({ 
  show, 
  timeRemaining, 
  onStayLoggedIn, 
  onLogoutNow 
}: { 
  show: boolean; 
  timeRemaining: number; 
  onStayLoggedIn: () => void; 
  onLogoutNow: () => void;
}) {
  return (
    <Dialog open={show} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <AlertCircle className="h-5 w-5" />
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Your session will expire in {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''} due to inactivity.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={onStayLoggedIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Stay Logged In
          </Button>
          <Button
            onClick={onLogoutNow}
            variant="outline"
            className="w-full"
          >
            Logout Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
