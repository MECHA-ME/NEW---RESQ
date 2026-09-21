import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  PhoneCall, 
  Radio, 
  ShieldAlert, 
  Bot, 
  Volume2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Truck,
  Flame,
  Zap,
  PhoneForwarded
} from 'lucide-react';
import { Incident } from '../types';

interface UnitAcceptanceMonitorProps {
  incident: Incident;
  fetchState: () => void;
}

export default function UnitAcceptanceMonitor({ incident, fetchState }: UnitAcceptanceMonitorProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const deadline = incident.acceptanceDeadline || (incident.createdAt + 120000);
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  });
  const [isEscalating, setIsEscalating] = useState<boolean>(false);
  const [callPhase, setCallPhase] = useState<'DIALING' | 'CONNECTED' | 'DISPATCHED'>('DIALING');

  const isAmbulance = incident.type === 'AMBULANCE';
  const emergencyNumber = isAmbulance ? '108' : '101';
  const serviceLabel = isAmbulance ? 'Government EMS (Ambulance)' : 'Fire & Rescue Escalation Channel';

  // Live countdown timer for the 2 minutes
  useEffect(() => {
    if (incident.status !== 'NOTIFIED' && incident.status !== 'CREATED') return;

    const timer = setInterval(() => {
      const deadline = incident.acceptanceDeadline || (incident.createdAt + 120000);
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      // When countdown reaches 0 and still not accepted, trigger auto-escalation
      if (remaining <= 0 && !isEscalating) {
        setIsEscalating(true);
        fetch(`/api/incidents/${incident.id}/escalate`, { method: 'POST' })
          .then(() => fetchState())
          .catch(err => console.error('Auto-escalation error:', err));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [incident, isEscalating]);

  // If escalated, simulate realistic automated call progression and proceed to AI-Assisted Dispatch
  useEffect(() => {
    if (incident.status === 'AUTO_ESCALATION_STARTED') {
      const t1 = setTimeout(() => setCallPhase('CONNECTED'), 2200);
      const t2 = setTimeout(() => {
        setCallPhase('DISPATCHED');
      }, 5500);

      // Transition automatically into Q-ARES flowchart next steps (AI-Assisted Dispatch & Live Tracking)
      const t3 = setTimeout(async () => {
        try {
          await fetch(`/api/incidents/${incident.id}/complete-call-dispatch`, { method: 'POST' });
          fetchState();
        } catch (err) {
          console.error('Failed to complete calling agent dispatch:', err);
        }
      }, 7500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [incident.status, incident.id]);

  const handleManualFastForward = async () => {
    setIsEscalating(true);
    try {
      await fetch(`/api/incidents/${incident.id}/escalate`, { method: 'POST' });
      fetchState();
    } catch (e) {
      console.error('Fast-forward failed:', e);
    }
  };

  const handleImmediateProceed = async () => {
    try {
      await fetch(`/api/incidents/${incident.id}/complete-call-dispatch`, { method: 'POST' });
      fetchState();
    } catch (e) {
      console.error('Immediate proceed failed:', e);
    }
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalWindow = 120; // 2 minutes in seconds
  const percentElapsed = Math.min(100, Math.max(0, ((totalWindow - secondsRemaining) / totalWindow) * 100));

  // If incident already accepted by responder
  if (incident.status !== 'NOTIFIED' && incident.status !== 'CREATED' && incident.status !== 'AUTO_ESCALATION_STARTED') {
    return null;
  }

  // SCREEN 1: AUTOMATIC CALLING AGENT ACTIVATED (when 2 minutes expire without unit acceptance)
  if (incident.status === 'AUTO_ESCALATION_STARTED') {
    return (
      <div className="bg-gradient-to-br from-red-950 via-gray-900 to-slate-900 text-white p-5 rounded-2xl border-2 border-red-500 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
        {/* Header tag */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-400">
              <Bot size={16} />
              <span>RESQ AUTOMATIC CALLING AGENT</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
            2-MIN TIMEOUT TRIGGERED
          </span>
        </div>

        {/* Dialing display */}
        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center space-y-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center animate-pulse">
              <PhoneCall size={28} className="text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>

          <div>
            <div className="text-[11px] font-mono text-gray-300 tracking-wider uppercase">
              {callPhase === 'DIALING' && 'INITIATING PRIORITY CALL...'}
              {callPhase === 'CONNECTED' && 'CALL CONNECTED • AI SYNCHRONIZING TELEMETRY'}
              {callPhase === 'DISPATCHED' && 'EMERGENCY DISPATCH CONFIRMED'}
            </div>
            <div className="text-3xl font-black tracking-tight text-white mt-0.5">
              DIALING {emergencyNumber}
            </div>
            <div className="text-xs font-bold text-red-300">
              {serviceLabel}
            </div>
          </div>
        </div>

        {/* AI Voice Agent Simulated Transmission */}
        <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between text-gray-400 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Volume2 size={14} className="animate-pulse" />
              Automated Voice Telemetry Stream
            </span>
            <span className="font-mono text-[10px] text-gray-400">Audio Synth v2.4</span>
          </div>

          <div className="font-mono text-[11px] text-gray-200 bg-white/5 p-2.5 rounded-lg border border-white/5 leading-relaxed">
            {callPhase === 'DIALING' && (
              <span className="text-gray-400 italic">"Connecting to regional {emergencyNumber} emergency switchboard..."</span>
            )}
            {callPhase === 'CONNECTED' && (
              <span className="text-amber-300">
                "Relaying verified SOS: Incident at {incident.address || '1090 Market Street, SF'}. Condition: {incident.conditionCategory || incident.condition || 'Emergency'} ({incident.conditionAcuity || 'ALS'}). No local private unit accepted in 2 minutes. Requesting central dispatch."
              </span>
            )}
            {callPhase === 'DISPATCHED' && (
              <span className="text-emerald-300 font-bold">
                "Central Control acknowledged. Government EMS Unit dispatched with green light priority. AI-Assisted Dispatch active."
              </span>
            )}
          </div>
        </div>

        {/* Outcome summary based on user flowchart */}
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2.5 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>
              <strong>AI-Assisted Dispatch Activated:</strong> QPSO Metaheuristic route optimization &amp; Traffic Green Corridor active.
            </span>
          </div>
        </div>

        {/* Immediate Flowchart Progression Action */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleImmediateProceed}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-black rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-400/40"
          >
            <Zap size={14} className="fill-current text-emerald-200" />
            <span>Proceed to AI-Assisted Dispatch &amp; Live Tracking</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 2: ACTIVE 2-MINUTE ACCEPTANCE COUNTDOWN (Matching Flowchart: "WAIT FOR UNIT ACCEPTANCE (MAX. 2 MINUTES)")
  return (
    <div className="bg-white p-5 rounded-2xl border-2 border-red-500 shadow-sm space-y-4 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-tight">
              WAIT FOR UNIT ACCEPTANCE (MAX. 2 MINUTES)
            </h3>
            <p className="text-[11px] text-gray-500">
              Searching active units within 15 km &bull; Notifying nearby responders
            </p>
          </div>
        </div>

        {/* Big Live Countdown Badge */}
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl text-right">
          <Clock size={16} className="text-red-600 animate-spin" style={{ animationDuration: '3s' }} />
          <div>
            <div className="text-[10px] uppercase font-black text-red-600 tracking-wider">
              ACCEPTANCE WINDOW
            </div>
            <div className="text-base font-black font-mono text-red-700 leading-none">
              {formattedTime}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar for the 2 Minutes */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
          <span>00:00 (SOS Sent)</span>
          <span className="text-red-600 font-mono font-black">{formattedTime} remaining</span>
          <span>02:00 (Max Limit)</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${percentElapsed}%` }}
          />
        </div>
      </div>

      {/* Flowchart Protocol Guidance */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wide">
          <span>📋 RESQ Protocol Sequence</span>
        </div>
        <div className="space-y-1.5 text-gray-600 text-[11px] leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              ✓
            </span>
            <span>
              <strong>Units Notified (15km):</strong> Live broadcast sent to all online {isAmbulance ? 'Ambulance' : 'Fire & Rescue'} units.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              ⏱️
            </span>
            <span>
              <strong>Unit Acceptance:</strong> Drivers have <strong>2 minutes</strong> to accept and proceed.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-red-100 text-red-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              🤖
            </span>
            <span>
              <strong>Fallback Escalation:</strong> If no unit accepts in 2 minutes, the <strong>Automatic Calling Agent</strong> will instantly dial <strong>{emergencyNumber} ({serviceLabel})</strong> to dispatch government emergency services.
            </span>
          </div>
        </div>
      </div>

      {/* Fast Forward button for easy testing */}
      <div className="pt-1 flex items-center justify-between gap-2">
        <span className="text-[10px] text-gray-400">
          Want to test the 2-minute fallback immediately?
        </span>
        <button
          type="button"
          onClick={handleManualFastForward}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 text-xs font-bold rounded-xl border border-gray-300 flex items-center gap-1 transition-all"
        >
          <Zap size={13} className="text-amber-500" />
          <span>Simulate 2-Min Expiry</span>
        </button>
      </div>
    </div>
  );
}
