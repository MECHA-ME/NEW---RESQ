import React from 'react';

interface ResqShieldLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  className?: string;
}

export default function ResqShieldLogo({ 
  size = 'md', 
  variant = 'dark',
  className = '' 
}: ResqShieldLogoProps) {
  const sizeMap = {
    sm: { box: 'w-8 h-9', icon: 16, text: 'text-sm' },
    md: { box: 'w-14 h-16', icon: 26, text: 'text-xl' },
    lg: { box: 'w-20 h-24', icon: 38, text: 'text-3xl' },
    xl: { box: 'w-24 h-28', icon: 46, text: 'text-4xl' },
  };

  const dim = sizeMap[size];

  return (
    <div className={`relative inline-flex items-center justify-center ${dim.box} ${className}`}>
      {/* Outer Shield Container */}
      <svg 
        viewBox="0 0 100 115" 
        className="w-full h-full drop-shadow-md"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="resqShieldGrad" x1="50" y1="0" x2="50" y2="115" gradientUnits="userSpaceOnUse">
            <stop stopColor={variant === 'dark' ? '#0f172a' : '#1e293b'} />
            <stop offset="1" stopColor={variant === 'dark' ? '#020617' : '#0f172a'} />
          </linearGradient>
          <linearGradient id="resqRedBorder" x1="0" y1="0" x2="100" y2="115" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ef4444" />
            <stop offset="0.5" stopColor="#dc2626" />
            <stop offset="1" stopColor="#b91c1c" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.6"/>
          </filter>
        </defs>

        {/* Outer Shield Frame */}
        <path 
          d="M50 4 L88 20 C88 64 68 96 50 110 C32 96 12 64 12 20 Z" 
          fill="url(#resqShieldGrad)" 
          stroke="url(#resqRedBorder)" 
          strokeWidth="6" 
          strokeLinejoin="round"
        />

        {/* Inner Subtle Inset */}
        <path 
          d="M50 14 L80 27 C80 60 64 86 50 98 C36 86 20 60 20 27 Z" 
          stroke="#334155" 
          strokeWidth="1.5" 
          fill="none"
          opacity="0.5"
        />

        {/* Central Bold 'R' Letterform */}
        <text 
          x="50" 
          y="68" 
          textAnchor="middle" 
          fill="#ffffff" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontWeight="900" 
          fontSize="48"
          letterSpacing="-1"
        >
          R
        </text>

        {/* Electrocardiogram Heartbeat Vector Overlaid */}
        <path 
          d="M16 58 H34 L40 40 L48 76 L56 46 L62 66 L68 58 H84" 
          stroke="#ef4444" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          filter="url(#glowFilter)"
        />
      </svg>
    </div>
  );
}
