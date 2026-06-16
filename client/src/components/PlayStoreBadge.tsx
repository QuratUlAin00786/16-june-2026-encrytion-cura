export function PlayStoreBadge({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="playstore-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="100%" stopColor="#333333" />
        </linearGradient>
      </defs>
      <rect width="135" height="40" rx="6" ry="6" fill="url(#playstore-gradient)" stroke="#a6a6a6" strokeWidth="0.5"/>
      
      {/* Google Play Logo */}
      <g transform="translate(8, 8)">
        <defs>
          <linearGradient id="play-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00A4DC" />
            <stop offset="100%" stopColor="#00D4FF" />
          </linearGradient>
          <linearGradient id="play-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4AA" />
            <stop offset="100%" stopColor="#00BF63" />
          </linearGradient>
          <linearGradient id="play-yellow" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFD500" />
            <stop offset="100%" stopColor="#FFAA00" />
          </linearGradient>
          <linearGradient id="play-red" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#FF5500" />
            <stop offset="100%" stopColor="#DD0031" />
          </linearGradient>
        </defs>
        
        <path d="M1.5 1.5L1.5 22.5L11.5 12L1.5 1.5Z" fill="url(#play-blue)"/>
        <path d="M1.5 22.5L11.5 12L19 15.5L1.5 22.5Z" fill="url(#play-green)"/>
        <path d="M11.5 12L19 8.5L19 15.5L11.5 12Z" fill="url(#play-yellow)"/>
        <path d="M1.5 1.5L19 8.5L11.5 12L1.5 1.5Z" fill="url(#play-red)"/>
      </g>
      
      {/* Text */}
      <text x="32" y="13" fontSize="8" fill="white" fontFamily="Roboto, sans-serif">GET IT ON</text>
      <text x="32" y="27" fontSize="13" fill="white" fontFamily="Roboto, sans-serif" fontWeight="500">Google Play</text>
    </svg>
  );
}