import React from 'react';
import { ArrowRight, Info, PhoneCall } from 'lucide-react';
import ResqShieldLogo from './ResqShieldLogo';

interface WelcomeScreenProps {
  onLoginClick: () => void;
  onInfoClick: () => void;
  onEmergencySosClick: () => void;
}

export default function WelcomeScreen({
  onLoginClick,
  onInfoClick,
  onEmergencySosClick
}: WelcomeScreenProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col justify-between p-5 text-gray-900 overflow-y-auto">
      {/* Top Header Section with Logo & Helicopter Accent */}
      <div className="relative pt-3 flex flex-col items-center text-center">
        {/* Rescue Helicopter Accent Icon in Upper Right */}
        <div className="absolute top-1 right-2 text-slate-400 flex items-center gap-1 opacity-70">
          <svg className="w-8 h-8 text-slate-500 stroke-current fill-none stroke-1.5" viewBox="0 0 24 24">
            <path d="M4 6h16M12 2v4M5 14h14l-2 4H7l-2-4zm-2 2h18M10 18v2m4-2v2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <ResqShieldLogo size="lg" variant="light" className="mb-2 drop-shadow-sm" />

        <h1 className="text-3xl font-black tracking-tight text-gray-950 flex items-center gap-1">
          <span className="text-red-600">RESQ</span>
        </h1>

        <p className="text-xs font-semibold text-gray-700 mt-0.5 max-w-[280px] leading-snug">
          Rapid Emergency Synchronisation &amp; Quick Response
        </p>

        {/* Heart Divider line */}
        <div className="flex items-center justify-center gap-2 mt-2 w-32">
          <div className="h-px bg-red-200 flex-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <div className="h-px bg-red-200 flex-1" />
        </div>
      </div>

      {/* Middle Illustration: Ambulance & Fire Engine Response Fleet */}
      <div className="my-auto py-2 flex flex-col items-center">
        <div className="relative w-full max-w-[320px] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-3 shadow-lg border border-slate-700/60 overflow-hidden flex items-center justify-center gap-3">
          {/* Ambulance side */}
          <div className="flex-1 flex flex-col items-center text-center bg-white/5 rounded-xl p-2 border border-white/10 backdrop-blur-xs">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-1">
              <span className="text-xl">🚑</span>
            </div>
            <span className="text-[11px] font-black text-white tracking-wide">AMBULANCE</span>
            <span className="text-[9px] text-blue-300 font-mono">EMS Fleet Ready</span>
          </div>

          {/* Fire Engine side */}
          <div className="flex-1 flex flex-col items-center text-center bg-white/5 rounded-xl p-2 border border-white/10 backdrop-blur-xs">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-1">
              <span className="text-xl">🚒</span>
            </div>
            <span className="text-[11px] font-black text-white tracking-wide">FIRE RESCUE</span>
            <span className="text-[9px] text-amber-300 font-mono">Hazmat / Heavy Aid</span>
          </div>

          {/* Background emergency lightbar pulse */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-48 h-8 bg-gradient-to-r from-blue-500/40 via-red-500/50 to-blue-500/40 blur-lg pointer-events-none" />
        </div>

        {/* Quote Block */}
        <div className="mt-4 px-4 py-3 bg-white rounded-2xl border border-gray-200/80 shadow-2xs max-w-[330px] relative text-center">
          <span className="text-red-500 text-2xl font-serif font-black absolute top-1 left-3 leading-none select-none">“</span>
          <p className="text-xs font-semibold text-gray-800 italic px-3 pt-1 leading-relaxed">
            When every second counts, RESQ connects. Together, we save more lives.
          </p>
          <span className="text-red-500 text-2xl font-serif font-black absolute bottom-0 right-3 leading-none select-none">”</span>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="space-y-2.5 pt-2 pb-1">
        {/* 1. Primary Red Login Button */}
        <button
          onClick={onLoginClick}
          className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black py-3.5 px-6 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer text-sm tracking-wide"
        >
          <span>LOGIN</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>

        {/* 2. Secondary Outlined App Info Button */}
        <button
          onClick={onInfoClick}
          className="w-full bg-white hover:bg-red-50/50 active:scale-[0.98] text-red-600 border-2 border-red-500 font-bold py-2.5 px-6 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer text-xs tracking-wide shadow-2xs"
        >
          <Info size={16} strokeWidth={2.5} />
          <span>APP INFO</span>
        </button>

        {/* 3. Emergency SOS Immediate Help Trigger */}
        <button
          onClick={onEmergencySosClick}
          className="w-full bg-red-50 hover:bg-red-100/70 active:scale-[0.98] text-red-700 border border-red-200 rounded-2xl p-2.5 flex items-center justify-center gap-3 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
            <PhoneCall size={16} className="animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
              <span>EMERGENCY SOS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </div>
            <p className="text-[10px] text-gray-600 font-medium">Tap for immediate emergency dispatch</p>
          </div>
        </button>
      </div>
    </div>
  );
}
