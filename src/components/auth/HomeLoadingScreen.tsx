import React, { useEffect, useRef, useState } from 'react';
import ResqShieldLogo from './ResqShieldLogo';
import { Shield } from 'lucide-react';

interface HomeLoadingScreenProps {
  onComplete: () => void;
}

const BOOT_LINES = [
  'ESTABLISHING SECURE LINK',
  'SYNCING EMS UNITS',
  'VERIFYING HOSPITAL MESH',
  'NETWORK LIVE',
];

export default function HomeLoadingScreen({ onComplete }: HomeLoadingScreenProps) {
  const [progress, setProgress] = useState(15);

  // Parent re-renders every second (live sync polling) which recreates the
  // onComplete callback — keep it in a ref so the boot timers run exactly once.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(45), 300);
    const timer2 = setTimeout(() => setProgress(75), 800);
    const timer3 = setTimeout(() => setProgress(100), 1400);
    const timer4 = setTimeout(() => {
      onCompleteRef.current();
    }, 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  const bootLine =
    progress < 45 ? BOOT_LINES[0]
    : progress < 75 ? BOOT_LINES[1]
    : progress < 100 ? BOOT_LINES[2]
    : BOOT_LINES[3];

  return (
    <div
      onClick={onComplete}
      className="relative w-full h-full bg-[#070b14] text-white flex flex-col p-5 select-none overflow-hidden overflow-y-auto cursor-pointer"
      title="Tap to skip to Welcome Screen"
    >
      <style>{`
        @keyframes resq-load-flash-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.15; } }
        @keyframes resq-load-flash-blue { 0%, 100% { opacity: 0.15; } 50% { opacity: 1; } }
        @keyframes resq-load-sweep { to { transform: rotate(360deg); } }
        @keyframes resq-load-ring { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes resq-load-ekg { to { stroke-dashoffset: -600; } }
        @keyframes resq-load-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
        .resq-load-flash-red { animation: resq-load-flash-red 1.1s ease-in-out infinite; }
        .resq-load-flash-blue { animation: resq-load-flash-blue 1.1s ease-in-out infinite; }
        .resq-load-sweep { animation: resq-load-sweep 3s linear infinite; }
        .resq-load-ring { animation: resq-load-ring 2s ease-out infinite; }
        .resq-load-ekg { stroke-dasharray: 120 480; animation: resq-load-ekg 3s linear infinite; }
        .resq-load-bar { animation: resq-load-bar 1.4s ease-in-out infinite; }
      `}</style>

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-red-600/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-72 h-56 rounded-full bg-red-900/30 blur-3xl" />

      {/* Emergency lightbar */}
      <div className="relative shrink-0 pt-1">
        <div className="flex items-center gap-1.5 h-3 rounded-full overflow-hidden">
          <div className="flex-1 h-full rounded-full bg-red-500 shadow-[0_0_18px_4px_rgba(239,68,68,0.8)] resq-load-flash-red" />
          <div className="flex-1 h-full rounded-full bg-slate-700/60" />
          <div className="flex-1 h-full rounded-full bg-blue-500 shadow-[0_0_18px_4px_rgba(59,130,246,0.8)] resq-load-flash-blue" />
          <div className="flex-1 h-full rounded-full bg-slate-700/60" />
          <div className="flex-1 h-full rounded-full bg-red-500 shadow-[0_0_18px_4px_rgba(239,68,68,0.8)] resq-load-flash-red" />
          <div className="flex-1 h-full rounded-full bg-slate-700/60" />
          <div className="flex-1 h-full rounded-full bg-blue-500 shadow-[0_0_18px_4px_rgba(59,130,246,0.8)] resq-load-flash-blue" />
        </div>
      </div>

      {/* Branding */}
      <div className="relative pt-4 flex flex-col items-center text-center shrink-0">
        <div className="relative">
          <div className="absolute -inset-5 rounded-full bg-red-600/25 blur-2xl" />
          <ResqShieldLogo size="lg" variant="dark" className="relative" />
        </div>
        <h1 className="mt-2 text-4xl font-black tracking-tighter leading-none">
          <span className="bg-gradient-to-b from-white via-red-200 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(239,68,68,0.45)]">
            RESQ
          </span>
        </h1>
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 leading-relaxed">
          Rapid Emergency <span className="text-red-400">Synchronisation</span> & Quick Response
        </p>
      </div>

      {/* Radar hub */}
      <div className="relative my-auto flex flex-col items-center justify-center py-3 shrink-0">
        <div className="relative w-56 h-56">
          {/* Expanding ping rings */}
          <div className="absolute inset-0 rounded-full border-2 border-red-500/60 resq-load-ring" />
          <div className="absolute inset-0 rounded-full border-2 border-red-500/40 resq-load-ring" style={{ animationDelay: '0.7s' }} />
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/40 resq-load-ring" style={{ animationDelay: '1.3s' }} />

          {/* Radar dish */}
          <div className="absolute inset-3 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-2xl overflow-hidden">
            {/* Sweep */}
            <div
              className="absolute inset-0 resq-load-sweep"
              style={{ background: 'conic-gradient(from 0deg, rgba(239,68,68,0.5), transparent 25%)' }}
            />
            {/* Static rings */}
            <div className="absolute inset-5 rounded-full border border-slate-700/60" />
            <div className="absolute inset-11 rounded-full border border-red-500/25" />
            <div className="absolute inset-16 rounded-full border border-blue-500/25" />
            {/* Crosshair */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700/40" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700/40" />
            {/* Blips */}
            <span className="absolute top-[22%] left-[30%] w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,1)] animate-ping" />
            <span className="absolute bottom-[26%] right-[28%] w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,1)] animate-ping" style={{ animationDelay: '0.5s' }} />
            <span className="absolute top-[58%] left-[68%] w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] animate-ping" style={{ animationDelay: '1s' }} />
          </div>

          {/* Center core */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.7)] text-white animate-pulse">
            <Shield size={26} className="fill-white/20" />
          </div>

          {/* Orbiting unit chips */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-blue-500/20 border border-blue-400/60 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.5)]">
            EMS SYNC
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-500/20 border border-amber-400/60 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
            EMS DISPATCH
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 bg-emerald-500/20 border border-emerald-400/60 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]">
            HOSPITAL
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 bg-purple-500/20 border border-purple-400/60 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.5)]">
            TRAFFIC
          </div>
        </div>

        {/* Animated EKG */}
        <div className="w-full max-w-[300px] mt-3 rounded-xl bg-black/50 border border-red-500/20 px-2 py-1.5 overflow-hidden">
          <svg viewBox="0 0 300 36" className="w-full h-8" preserveAspectRatio="none">
            <path
              d="M0 18 L60 18 L72 18 L82 4 L92 32 L102 10 L112 26 L122 18 L180 18 L190 6 L200 30 L210 18 L300 18"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="resq-load-ekg"
              style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.9))' }}
            />
          </svg>
        </div>

        {/* Boot status */}
        <p className="mt-2 text-[10px] font-mono font-black tracking-[0.25em] text-red-400 uppercase">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mr-1.5" />
          {bootLine}
        </p>
      </div>

      {/* Bottom progress */}
      <div className="relative pb-2 flex flex-col items-center text-center shrink-0">
        <p className="text-xs font-semibold text-slate-300 mb-3 tracking-wide">
          Every Second Optimized. Every <span className="text-red-500 font-black">Life</span> Matters.
        </p>

        <div className="w-full max-w-[240px]">
          <div className="relative h-2 w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/60 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_16px_rgba(239,68,68,0.8)]"
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-y-0 w-1/3 bg-white/25 blur-[2px] resq-load-bar" />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-red-400 mt-2 px-0.5">
            <span>LOADING NETWORK</span>
            <span>{progress}%</span>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="mt-2 text-[10px] text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest font-mono"
        >
          Tap to skip &rarr;
        </button>
      </div>
    </div>
  );
}
