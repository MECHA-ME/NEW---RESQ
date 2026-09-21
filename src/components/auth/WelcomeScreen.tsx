import React from 'react';
import { ArrowRight, PhoneCall, Siren, Navigation, Radio, Hospital, Zap, Timer, ShieldCheck } from 'lucide-react';
import ResqShieldLogo from './ResqShieldLogo';

interface WelcomeScreenProps {
  onLoginClick: () => void;
  onInfoClick: () => void;
  onEmergencySosClick: () => void;
}

const FEATURES = [
  {
    icon: Siren,
    title: 'One-Touch SOS Dispatch',
    desc: 'Hold 1 second — nearest ambulance units notified instantly.',
    glow: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  {
    icon: Navigation,
    title: 'Live GPS Tracking',
    desc: 'Patient, driver & hospital watch the same real-time route.',
    glow: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    icon: Radio,
    title: 'Green Corridor Clearance',
    desc: 'Traffic police pre-empt signals — zero-stop ambulance runs.',
    glow: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    icon: Hospital,
    title: 'Hospital Readiness Sync',
    desc: 'ER beds, ICU & trauma teams confirmed before arrival.',
    glow: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
];

const STATS = [
  { icon: Timer, value: '~4 min', label: 'Avg response' },
  { icon: Zap, value: '24/7', label: 'Live dispatch' },
  { icon: ShieldCheck, value: '5-way', label: 'Synced mesh' },
];

export default function WelcomeScreen({
  onLoginClick,
  onEmergencySosClick
}: WelcomeScreenProps) {
  return (
    <div className="relative w-full h-full bg-[#070b14] text-white flex flex-col overflow-y-auto overflow-x-hidden">
      <style>{`
        @keyframes resq-flash-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.15; } }
        @keyframes resq-flash-blue { 0%, 100% { opacity: 0.15; } 50% { opacity: 1; } }
        @keyframes resq-ekg { to { stroke-dashoffset: -600; } }
        @keyframes resq-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes resq-glow-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .resq-flash-red { animation: resq-flash-red 1.1s ease-in-out infinite; }
        .resq-flash-blue { animation: resq-flash-blue 1.1s ease-in-out infinite; }
        .resq-ekg-line { stroke-dasharray: 120 480; animation: resq-ekg 3s linear infinite; }
        .resq-float { animation: resq-float 3.5s ease-in-out infinite; }
        .resq-glow-pulse { animation: resq-glow-pulse 2.2s ease-in-out infinite; }
      `}</style>

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-red-600/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-72 h-56 rounded-full bg-red-900/30 blur-3xl" />

      {/* Emergency lightbar */}
      <div className="relative shrink-0 px-5 pt-4">
        <div className="flex items-center gap-1.5 h-3 rounded-full overflow-hidden">
          <div className="flex-1 h-full rounded-full bg-red-500 shadow-[0_0_18px_4px_rgba(239,68,68,0.8)] resq-flash-red" />
          <div className="flex-1 h-full rounded-full bg-slate-700/60" />
          <div className="flex-1 h-full rounded-full bg-blue-500 shadow-[0_0_18px_4px_rgba(59,130,246,0.8)] resq-flash-blue" />
          <div className="flex-1 h-full rounded-full bg-slate-700/60" />
          <div className="flex-1 h-full rounded-full bg-red-500 shadow-[0_0_18px_4px_rgba(239,68,68,0.8)] resq-flash-red" />
          <div className="flex-1 h-full rounded-full bg-slate-700/60" />
          <div className="flex-1 h-full rounded-full bg-blue-500 shadow-[0_0_18px_4px_rgba(59,130,246,0.8)] resq-flash-blue" />
        </div>
      </div>

      {/* Hero */}
      <div className="relative px-5 pt-4 pb-2 text-center shrink-0">
        <div className="mt-1 flex items-center justify-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-black tracking-widest uppercase whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live emergency mesh
          </div>

          <div className="relative inline-block resq-float">
            <div className="absolute -inset-4 rounded-full bg-red-600/30 blur-2xl resq-glow-pulse" />
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 p-3 shadow-2xl">
              <ResqShieldLogo size="lg" variant="light" />
            </div>
          </div>
        </div>

        <h1 className="mt-3 text-5xl font-black tracking-tighter leading-none">
          <span className="bg-gradient-to-b from-white via-red-200 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(239,68,68,0.45)]">
            RESQ
          </span>
        </h1>
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 leading-relaxed">
          Rapid Emergency <span className="text-red-400">Synchronisation</span> & Quick Response
        </p>

        {/* EKG strip */}
        <div className="mt-3 rounded-xl bg-black/50 border border-red-500/20 px-2 py-1.5 overflow-hidden">
          <svg viewBox="0 0 300 36" className="w-full h-8" preserveAspectRatio="none">
            <path
              d="M0 18 L60 18 L72 18 L82 4 L92 32 L102 10 L112 26 L122 18 L180 18 L190 6 L200 30 L210 18 L300 18"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="resq-ekg-line"
              style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.9))' }}
            />
          </svg>
        </div>
      </div>

      {/* Stats */}
      <div className="relative px-5 mt-1 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm px-2 py-2 text-center"
            >
              <s.icon size={14} className="mx-auto text-red-400" />
              <div className="text-sm font-black text-white mt-0.5">{s.value}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Product features */}
      <div className="relative px-5 mt-3 space-y-2 shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">
          Why RESQ wins seconds
        </p>
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-3 hover:bg-white/10 hover:border-red-500/40 transition-all"
          >
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${f.glow}`}>
              <f.icon size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white leading-tight">{f.title}</p>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-600/20 via-red-500/10 to-blue-600/20 p-3 text-center">
          <p className="text-[11px] font-semibold italic text-slate-200 leading-relaxed">
            “When every second counts, RESQ connects. Together, we save more lives.”
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="relative px-5 pt-3 pb-5 mt-auto space-y-2.5 shrink-0">
        <button
          onClick={onLoginClick}
          className="group w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:brightness-110 active:scale-[0.98] text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_40px_-8px_rgba(239,68,68,0.7)] transition-all cursor-pointer text-sm tracking-widest"
        >
          <span>LOGIN</span>
          <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={onEmergencySosClick}
          className="w-full bg-gradient-to-r from-red-950/80 to-slate-900/80 hover:from-red-900/80 active:scale-[0.98] text-red-200 border border-red-500/40 rounded-2xl p-2.5 flex items-center justify-center gap-3 transition-all cursor-pointer group shadow-lg"
        >
          <div className="relative w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.8)]">
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
            <PhoneCall size={16} className="relative animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span>Emergency SOS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Tap for immediate emergency dispatch</p>
          </div>
        </button>
      </div>
    </div>
  );
}
