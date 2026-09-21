import React from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Radio, 
  Route, 
  Hospital, 
  ShieldAlert, 
  Cpu, 
  Truck, 
  Flame,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import ResqShieldLogo from './ResqShieldLogo';

interface InfoPageProps {
  onBack: () => void;
  onSelectMode?: (mode: 'AMBULANCE' | 'FIRE') => void;
}

export default function InfoPage({ onBack, onSelectMode }: InfoPageProps) {
  return (
    <div className="w-full h-full bg-slate-50 flex flex-col justify-between text-gray-900 overflow-y-auto">
      {/* Top App Bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-gray-200 flex items-center justify-between z-20 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="font-bold text-base text-gray-900 tracking-tight">About RESQ</span>

        <ResqShieldLogo size="sm" variant="dark" />
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4 flex-1">
        {/* Central Synchronised Ecosystem Diagram */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs text-center relative overflow-hidden">
          <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-3">
            Synchronised Stakeholder Mesh
          </h3>

          {/* Orbital Circle Graph */}
          <div className="relative w-64 h-64 mx-auto flex items-center justify-center my-2">
            {/* Outer dotted orbital orbit */}
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-gray-200 pointer-events-none" />

            {/* Central RESQ Crest */}
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center shadow-lg border-2 border-red-500 z-10">
              <ResqShieldLogo size="sm" variant="dark" />
            </div>

            {/* Orbital Node 1: You (Public / Top-Left) */}
            <div className="absolute top-2 left-10 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center justify-center shadow-xs">
                <UserIcon size={16} />
              </div>
              <span className="text-[9px] font-bold text-gray-800 mt-1">You (Public)</span>
            </div>

            {/* Orbital Node 2: Ambulance (Top-Right) */}
            <div className="absolute top-2 right-10 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
                <Truck size={16} />
              </div>
              <span className="text-[9px] font-bold text-gray-800 mt-1">Ambulance</span>
            </div>

            {/* Orbital Node 3: Hospital (Right-Center) */}
            <div className="absolute right-0 top-24 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
                <Hospital size={16} />
              </div>
              <span className="text-[9px] font-bold text-gray-800 mt-1">Hospital</span>
            </div>

            {/* Orbital Node 4: Emergency Control (Bottom-Right) */}
            <div className="absolute bottom-2 right-10 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 border border-purple-200 flex items-center justify-center shadow-xs">
                <ShieldCheck size={16} />
              </div>
              <span className="text-[9px] font-bold text-gray-800 mt-1">Control</span>
            </div>

            {/* Orbital Node 5: Traffic Police (Bottom-Left) */}
            <div className="absolute bottom-2 left-10 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                <ShieldAlert size={16} />
              </div>
              <span className="text-[9px] font-bold text-gray-800 mt-1">Traffic Police</span>
            </div>

            {/* Orbital Node 6: Fire & Rescue (Left-Center) */}
            <div className="absolute left-0 top-24 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center shadow-xs">
                <Flame size={16} />
              </div>
              <span className="text-[9px] font-bold text-gray-800 mt-1">Fire &amp; Rescue</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed max-w-[280px] mx-auto mt-2">
            RESQ is an intelligent emergency response and synchronisation platform that connects you to the right help at the right time.
          </p>
        </div>

        {/* Key Features List */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
          <h3 className="text-xs font-black uppercase text-gray-900 tracking-wider">
            Key Platform Capabilities
          </h3>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">One-Touch Emergency SOS</h4>
                <p className="text-[11px] text-gray-500 leading-tight">Instant GPS telemetry dispatch to nearest available responders.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Radio size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Real-time Tracking &amp; Updates</h4>
                <p className="text-[11px] text-gray-500 leading-tight">Live synchronized GPS telemetry between patient, driver, and trauma bay.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Route size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Smart Route Optimization</h4>
                <p className="text-[11px] text-gray-500 leading-tight">Dynamic algorithmic navigation avoiding congestion and bottlenecks.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                <Hospital size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Hospital &amp; Resource Availability</h4>
                <p className="text-[11px] text-gray-500 leading-tight">Live telemetry on ER beds, ICUs, ventilators, and surgical staff.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Traffic Police &amp; Green Corridor</h4>
                <p className="text-[11px] text-gray-500 leading-tight">Automated green-light corridors clearing urban junctions for transit.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Cpu size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">AI, ML &amp; Quantum Optimization</h4>
                <p className="text-[11px] text-gray-500 leading-tight">Instant algorithmic matching predicting fastest unit arrival times.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Modes */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">
            Emergency Modes
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                <Truck size={20} />
              </div>
              <span className="text-[11px] font-black text-gray-900">AMBULANCE RESPONSE</span>
              <span className="text-[9px] text-gray-500 mt-0.5">Medical &amp; Trauma Sync</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-1.5">
                <Flame size={20} />
              </div>
              <span className="text-[11px] font-black text-gray-900">FIRE ENGINE RESPONSE</span>
              <span className="text-[9px] text-gray-500 mt-0.5">Hazmat &amp; Heavy Rescue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Tagline */}
      <div className="p-4 bg-white border-t border-gray-100 text-center shrink-0">
        <p className="text-xs font-semibold text-gray-800">
          Every Second Optimized. Every <span className="text-red-600 font-black">Life</span> Matters.
        </p>
      </div>
    </div>
  );
}
