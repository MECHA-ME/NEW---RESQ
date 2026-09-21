import React, { useId } from 'react';

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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sizeMap = {
    sm: { box: 'w-9 h-9' },
    md: { box: 'w-14 h-14' },
    lg: { box: 'w-20 h-20' },
    xl: { box: 'w-24 h-24' },
  };

  const dim = sizeMap[size];

  const gFace = `face-${uid}`;
  const gEdge = `edge-${uid}`;
  const gR = `r-${uid}`;
  const gHalo = `halo-${uid}`;
  const fSoft = `soft-${uid}`;

  return (
    <div className={`relative inline-flex items-center justify-center ${dim.box} ${className}`}>
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="RESQ logo"
      >
        <defs>
          <radialGradient id={gHalo} cx="60" cy="56" r="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ef4444" stopOpacity={variant === 'dark' ? '0.28' : '0.22'} />
            <stop offset="0.7" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={gFace} x1="30" y1="18" x2="90" y2="102" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1b2540" />
            <stop offset="0.55" stopColor="#0b1122" />
            <stop offset="1" stopColor="#050912" />
          </linearGradient>
          <linearGradient id={gEdge} x1="14" y1="10" x2="106" y2="110" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fca5a5" />
            <stop offset="0.4" stopColor="#ef4444" />
            <stop offset="1" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id={gR} x1="44" y1="30" x2="76" y2="74" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#fecaca" />
          </linearGradient>
          <filter id={fSoft} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* Soft halo */}
        <circle cx="60" cy="56" r="56" fill={`url(#${gHalo})`} />

        {/* Hex shield */}
        <polygon
          points="108,58 84,99.6 36,99.6 12,58 36,16.4 84,16.4"
          fill={`url(#${gFace})`}
          stroke={`url(#${gEdge})`}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Inner hairline */}
        <polygon
          points="100,58 80,92.6 40,92.6 20,58 40,23.4 80,23.4"
          stroke="#f87171"
          strokeOpacity="0.25"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* R */}
        <text
          x="60"
          y="66"
          textAnchor="middle"
          fill={`url(#${gR})`}
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontWeight="900"
          fontSize="40"
          letterSpacing="-2"
        >
          R
        </text>

        {/* Single pulse line */}
        <path
          d="M32 76 H49 L55 62 L63 88 L71 66 L76 76 H88"
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${fSoft})`}
        />
        <circle cx="32" cy="76" r="2.2" fill="#fca5a5" />
        <circle cx="88" cy="76" r="2.2" fill="#ef4444" filter={`url(#${fSoft})`} />
      </svg>
    </div>
  );
}
