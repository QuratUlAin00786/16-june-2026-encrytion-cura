export function AppStoreBadge({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="appstore-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="100%" stopColor="#333333" />
        </linearGradient>
      </defs>
      <rect width="120" height="40" rx="6" ry="6" fill="url(#appstore-gradient)" stroke="#a6a6a6" strokeWidth="0.5"/>
      
      {/* Apple Logo */}
      <g transform="translate(12, 8)">
        <path d="M15.5 3.9c-1.2 0-2.4 0.8-3.2 2.1-0.7 1.1-1.3 2.6-1.1 4.1 1.3 0.1 2.6-0.7 3.4-1.8 0.7-1.1 1.2-2.5 0.9-4.4z" fill="white"/>
        <path d="M19.3 16.9c-0.9 1.9-1.3 2.7-2.4 4.4-1.5 2.3-3.6 5.1-6.2 5.2-2.3 0.1-2.9-1.5-5.9-1.5-2.9 0-3.6 1.4-5.9 1.5-2.6 0.1-4.9-3.1-6.4-5.4-3.1-4.6-5.5-13.2-2.3-18.9 2.3-4.1 6.4-6.7 10.8-6.8 2.5-0.1 4.9 1.7 6.4 1.7 1.5 0 4.3-2.1 7.5-1.8 1.2 0.1 4.7 0.5 6.9 3.6-0.2 0.1-4.1 2.4-4.0 7.2 0.1 5.7 5.0 7.6 5.1 7.6-0.1 0.2-0.8 2.7-2.6 5.2z" fill="white"/>
      </g>
      
      {/* Text */}
      <text x="35" y="14" fontSize="9" fill="white" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">Download on the</text>
      <text x="35" y="28" fontSize="14" fill="white" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif" fontWeight="600">App Store</text>
    </svg>
  );
}