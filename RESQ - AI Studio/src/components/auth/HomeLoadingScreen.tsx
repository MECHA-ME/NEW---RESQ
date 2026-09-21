import React, { useEffect, useState } from 'react';
import ResqShieldLogo from './ResqShieldLogo';
import { Shield, Activity, Radio, Sparkles } from 'lucide-react';

interface HomeLoadingScreenProps {
  onComplete: () => void;
}

export default function HomeLoadingScreen({ onComplete }: HomeLoadingScreenProps) {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(45), 300);
    const timer2 = setTimeout(() => setProgress(75), 800);
    const timer3 = setTimeout(() => setProgress(100), 1400);
    const timer4 = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div 
      onClick={onComplete}
      className="relative w-full h-full bg-[#070b12] text-white flex flex-col justify-between p-6 select-none overflow-hidden cursor-pointer"
      title="Tap to skip to Welcome Screen"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Branding Section */}
      <div className="pt-6 flex flex-col items-center text-center z-10">
        <ResqShieldLogo size="lg" variant="dark" className="mb-3 animate-pulse" />
        
        <div className="flex items-center justify-center gap-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center">
            <span className="text-red-500">RESQ</span>
          </h1>
        </div>

        <p className="text-xs font-semibold text-gray-300 max-w-[260px] mt-1 tracking-wide leading-snug">
          Rapid Emergency Synchronisation &amp; Quick Response
        </p>
      </div>

      {/* Middle Artwork: Synchronized Radar Hub & Heartbeat Pulse (No image files) */}
      <div className="relative my-auto flex flex-col items-center justify-center z-10 w-full py-4">
        {/* Hub Graphic Container */}
        <div className="relative w-48 h-48 rounded-full border border-slate-800 bg-slate-900/80 shadow-2xl flex items-center justify-center">
          {/* Radar Circles */}
          <div className="absolute inset-4 rounded-full border border-slate-700/50" />
          <div className="absolute inset-10 rounded-full border border-red-500/20" />
          <div className="absolute inset-16 rounded-full border border-blue-500/20" />

          {/* Central Pulse Indicator */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/50 text-white z-10 animate-bounce">
            <Shield size={26} className="fill-white/20" />
          </div>

          {/* Orbiting Responders */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-500/20 border border-blue-400 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-blue-300">
            EMS SYNC
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-amber-500/20 border border-amber-400 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-amber-300">
            FIRE HAZMAT
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-emerald-500/20 border border-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-emerald-300">
            HOSPITAL
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-500/20 border border-purple-400 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-purple-300">
            TRAFFIC
          </div>
        </div>

        {/* EKG Heartbeat Waveform */}
        <div className="w-full max-w-[300px] mt-4 relative">
          <svg viewBox="0 0 300 40" className="w-full h-10 overflow-visible">
            <path 
              d="M0 20 L60 20 L75 20 L85 6 L95 34 L105 12 L115 28 L125 20 L180 20 L190 8 L200 32 L210 20 L300 20" 
              fill="none" 
              stroke="#ef4444" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            />
          </svg>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500/40 to-transparent -mt-5" />
        </div>
      </div>

      {/* Bottom Tagline & Progress Bar */}
      <div className="pb-4 flex flex-col items-center text-center z-10">
        <p className="text-xs font-semibold text-gray-300 mb-4 tracking-wide">
          Every Second Optimized. Every <span className="text-red-500 font-black">Life</span> Matters.
        </p>

        {/* Progress Container */}
        <div className="w-full max-w-[240px]">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-red-400 mt-2 px-0.5">
            <span>LOADING NETWORK</span>
            <span>{progress}%</span>
          </div>
        </div>

        <button 
          onClick={onComplete}
          className="mt-3 text-[10px] text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest font-mono"
        >
          Tap to skip &rarr;
        </button>
      </div>
    </div>
  );
}
