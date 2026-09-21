import React, { useState, useRef, useEffect } from 'react';
import { AppState, Incident } from '../types';
import { 
  Activity, 
  Truck, 
  Flame, 
  ShieldAlert, 
  Check, 
  MapPin, 
  User, 
  Heart, 
  ChevronRight, 
  ChevronLeft, 
  ArrowLeft, 
  Radio, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Hospital as HospitalIcon,
  Navigation,
  FileEdit,
  ShieldPlus
} from 'lucide-react';
import FeedbackForm from './FeedbackForm';
import StatusBadge from './StatusBadge';
import AdditionalInfoView from './AdditionalInfoView';
import UnitAcceptanceMonitor from './UnitAcceptanceMonitor';
import IncidentLifecycleHistory from './IncidentLifecycleHistory';
import LiveEmergencyMap from './LiveEmergencyMap';
import QaresFlowchartPipeline from './QaresFlowchartPipeline';
import { downloadAllHistoryReport, downloadAllHistoryPDF } from '../utils/downloadReport';
import { Download, FileText, Cpu, Bot, Sparkles } from 'lucide-react';

export default function PatientDashboard({ state, userId, fetchState }: any) {
  // Navigation view: 'service_selection' (Image 1), 'ambulance_setup' (Image 2/3), 'additional_info', 'active_incident', or 'history'
  const [currentView, setCurrentView] = useState<'service_selection' | 'ambulance_setup' | 'additional_info' | 'active_incident' | 'history'>('service_selection');
  const [callerRole, setCallerRole] = useState<'PATIENT' | 'BYSTANDER'>('PATIENT');
  const [victimCount, setVictimCount] = useState<'1 Person' | '2 Person' | '3+ MCI'>('1 Person');
  const [condition, setCondition] = useState('');
  
  // Hold-to-trigger state
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<any>(null);

  const myIncidents = state.incidents.filter((i: Incident) => i.patientId === userId);
  const activeIncident = myIncidents.find((i: Incident) => !['COMPLETED', 'CANCELLED'].includes(i.status));
  
  // Mandatory feedback for all completed incidents without skip
  const pendingFeedbackIncidents = myIncidents.filter((i: Incident) => 
    i.status === 'COMPLETED' && 
    i.assignedResponderId &&
    !state.feedbacks?.some((f: any) => f.incidentId === i.id && f.fromId === userId)
  );

  const triggerEmergency = async (type: 'AMBULANCE' | 'FIRE_RESCUE') => {
    try {
      const numericVictims = victimCount === '1 Person' ? 1 : victimCount === '2 Person' ? 2 : 3;
      await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          location: { lat: 37.7793, lng: -122.4162 },
          address: '1090 Market Street, Civic Center, SF',
          condition: 'Cardiac / Chest Pain',
          conditionCategory: 'Cardiac / Chest Pain',
          conditionAcuity: 'ALS',
          conditionSubtitle: 'Heart attack symptoms, chest pressure',
          hospitalPreference: 'DRIVER_DISCRETION',
          callerRole,
          victimCount: numericVictims,
          patientId: userId
        })
      });
      await fetchState();
      if (type === 'AMBULANCE') {
        setCurrentView('additional_info');
      } else {
        setCurrentView('active_incident');
      }
    } catch (e) {
      console.error('Failed to trigger emergency', e);
    }
  };

  // Hold-to-trigger effect
  useEffect(() => {
    if (isHolding) {
      holdIntervalRef.current = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            clearInterval(holdIntervalRef.current);
            setIsHolding(false);
            triggerEmergency('AMBULANCE');
            return 0;
          }
          return prev + 5; // Reaches 100 in ~1 second (20 steps * 50ms)
        });
      }, 50);
    } else {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      setHoldProgress(0);
    }
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [isHolding]);

  // If viewing additional info screen (Section 1 & Section 2 from User's uploaded Image)
  if (currentView === 'additional_info' && activeIncident) {
    const hospitals = state.users.filter((u: any) => u.role === 'HOSPITAL');
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <button
            onClick={() => setCurrentView('service_selection')}
            className="text-xs font-semibold text-gray-600 flex items-center gap-1 hover:text-gray-900"
          >
            <ChevronLeft size={16} /> Back to Overview
          </button>
          <button
            onClick={() => setCurrentView('active_incident')}
            className="text-xs font-bold text-red-600 flex items-center gap-1 hover:underline"
          >
            <span>Skip to Live Tracking</span>
            <ChevronRight size={14} />
          </button>
        </div>
        <AdditionalInfoView
          incident={activeIncident}
          hospitals={hospitals}
          onProceed={() => setCurrentView('active_incident')}
          fetchState={fetchState}
        />
      </div>
    );
  }

  // If viewing active incident
  if (currentView === 'active_incident' && activeIncident) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <button
            onClick={() => setCurrentView('service_selection')}
            className="text-xs font-semibold text-brand-blue flex items-center gap-1 hover:underline"
          >
            <ChevronLeft size={16} /> Back to Portal Overview
          </button>
          <button
            onClick={() => setCurrentView('additional_info')}
            className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-red-100 transition-colors"
          >
            <FileEdit size={13} />
            <span>Edit Medical Condition</span>
          </button>
        </div>
        <ActiveIncidentView 
          incident={activeIncident} 
          users={state.users} 
          onBack={() => setCurrentView('service_selection')}
          onEditInfo={() => setCurrentView('additional_info')}
          fetchState={fetchState}
        />
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      {/* Pending Feedbacks if any completed - MANDATORY: NO SKIP BUTTON */}
      {pendingFeedbackIncidents.map(inc => {
        const responder = state.users.find((u: any) => u.id === inc.assignedResponderId);
        if (!responder) return null;
        return (
          <div key={inc.id} className="relative mb-4">
            <FeedbackForm
              incidentId={inc.id}
              fromRole="PATIENT"
              toRole={responder.role}
              fromId={userId}
              toId={responder.id}
              targetName={responder.name}
              onSubmit={fetchState}
            />
          </div>
        );
      })}

      {/* Active Incident Floating Alert if running in background */}
      {activeIncident && currentView !== 'active_incident' && (
        <div 
          onClick={() => setCurrentView('active_incident')}
          className="mb-4 p-3 bg-red-500 text-white rounded-xl shadow-md flex items-center justify-between cursor-pointer hover:bg-red-600 transition-all animate-pulse"
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <Radio size={16} className="animate-spin" />
            <span>Active SOS Dispatched ({activeIncident.status.replace(/_/g, ' ')})</span>
          </div>
          <span className="text-xs underline flex items-center">View Live Track &rarr;</span>
        </div>
      )}

      {/* VIEW 1: Service Selection (Image 1) */}
      {currentView === 'service_selection' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* RESQ Brand Header */}
          <div className="text-center pt-1 pb-2">
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">RESQ</h1>
              <div className="flex items-center text-red-500">
                <svg className="w-7 h-6 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                  <path d="M2 12h4l2-6 4 13 3-9 2 4h5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              Rapid Emergency Synchronisation &amp; Quick Response
            </p>
            
            {/* Heart Divider */}
            <div className="flex items-center justify-center gap-3 my-1.5">
              <div className="w-12 h-px bg-red-300" />
              <span className="text-xs text-red-500">&#10084;&#65039;</span>
              <div className="w-12 h-px bg-red-300" />
            </div>

            <p className="text-xs text-gray-600">
              Every Second <span className="font-bold text-red-600">Optimized</span>. Every{' '}
              <span className="font-bold text-red-600">Life</span> Matters.
            </p>
          </div>

          {/* Hero Image Section with Quantum HUD overlay */}
          <div className="relative rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-gray-900 h-64 sm:h-72">
            <img
              src="/ambulance_hero.jpg"
              alt="Quantum GPS Emergency Response"
              className="w-full h-full object-cover object-center"
            />
            {/* Quantum Map & Dispatch HUD Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

            {/* Floating City Pins */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-sky-200 shadow-sm flex items-center gap-1.5 pointer-events-none">
              <HospitalIcon size={13} className="text-sky-600" />
              <div className="text-[10px] leading-tight">
                <span className="font-bold text-gray-900 block">HOSPITAL</span>
                <span className="text-gray-500">1.2 M</span>
              </div>
            </div>

            <div className="absolute top-5 right-4 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm flex items-center gap-1.5 pointer-events-none">
              <AlertCircle size={13} className="text-amber-600" />
              <div className="text-[10px] leading-tight">
                <span className="font-bold text-gray-900 block">INCIDENT</span>
                <span className="text-gray-500">70 M</span>
              </div>
            </div>

            <div className="absolute top-20 left-10 bg-black/75 text-white backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-mono border border-white/20 flex items-center gap-1">
              <Navigation size={10} className="text-sky-400" />
              <span>4 min ETA</span>
            </div>

            <div className="absolute top-24 right-10 bg-black/75 text-white backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-mono border border-white/20 flex items-center gap-1">
              <Navigation size={10} className="text-emerald-400" />
              <span>4 min ETA</span>
            </div>

            {/* Center Pill: Quantum GPS Dispatch Active */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-400 shadow-lg flex items-center gap-2 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-black text-gray-900 tracking-wider">
                QUANTUM GPS DISPATCH &bull; ACTIVE
              </span>
            </div>
          </div>

          {/* Two Service Selection Action Cards */}
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            {/* Card 1: Ambulance */}
            <button
              onClick={() => {
                setCallerRole('PATIENT');
                setCurrentView('ambulance_setup');
              }}
              className="bg-white p-4 rounded-2xl border border-gray-200 border-b-4 border-b-red-500 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Truck size={28} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">Ambulance</h3>
                <p className="text-xs font-bold text-red-600">Medical SOS</p>
              </div>
              <span className="text-[11px] text-gray-400 font-medium group-hover:text-red-600 transition-colors flex items-center gap-1">
                Select &amp; Proceed &rarr;
              </span>
            </button>

            {/* Card 2: Fire Rescue */}
            <button
              onClick={() => {
                triggerEmergency('FIRE_RESCUE');
              }}
              className="bg-white p-4 rounded-2xl border border-gray-200 border-b-4 border-b-amber-500 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Flame size={28} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">Fire Rescue</h3>
                <p className="text-xs font-bold text-amber-600">Fire &amp; Hazards</p>
              </div>
              <span className="text-[11px] text-gray-400 font-medium group-hover:text-amber-600 transition-colors flex items-center gap-1">
                Select &amp; Proceed &rarr;
              </span>
            </button>
          </div>

          {/* Centered History Tab under Ambulance and Fire Rescue */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setCurrentView('history')}
              className="w-full sm:w-auto px-6 py-3 min-h-[46px] bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-2xl font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2.5 border border-slate-700 group"
            >
              <Clock size={16} className="text-red-400 group-hover:rotate-12 transition-transform" />
              <span>Emergency Response History &amp; Audit Logs</span>
              <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-mono font-bold">
                {myIncidents.length}
              </span>
            </button>
          </div>

          {/* Footer Motto */}
          <div className="text-center pt-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-black">
                +
              </span>
              <span>Together, We Save Lives.</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Emergency History */}
      {currentView === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <button
              onClick={() => setCurrentView('service_selection')}
              className="text-xs font-bold text-gray-700 flex items-center gap-1 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={16} /> Back to Emergency Services
            </button>
            <span className="text-xs font-semibold text-slate-500">
              {myIncidents.length} Emergency {myIncidents.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <Clock size={18} className="text-red-400" />
                <span>My Emergency Response History</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Complete chronological log of emergency triggers, bystander/patient roles, unit responses, and multi-node timings.
              </p>
            </div>

            {myIncidents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => downloadAllHistoryPDF(myIncidents, state, 'Patient')}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-red-600/30 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Export All (.pdf)</span>
                </button>

                <button
                  onClick={() => downloadAllHistoryReport(myIncidents, state, 'Patient')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileText size={14} />
                  <span>Text (.txt)</span>
                </button>
              </div>
            )}
          </div>

          {myIncidents.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-400 space-y-2">
              <Clock size={40} className="mx-auto text-gray-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-gray-700">No emergency records logged yet.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Whenever you trigger an Ambulance or Fire SOS, the complete lifecycle audit log with timings and clinical triage will be archived here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myIncidents.map((inc: Incident) => (
                <IncidentLifecycleHistory
                  key={inc.id}
                  incident={inc}
                  state={state}
                  currentRole="PATIENT"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2 & 3: Ambulance SOS Setup (Image 2 when callerRole === 'PATIENT', Image 3 when callerRole === 'BYSTANDER') */}
      {currentView === 'ambulance_setup' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Top Bar: Back to Service Choice & Gateway Pill */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setCurrentView('service_selection')}
              className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs hover:bg-gray-50 active:scale-95 transition-all"
            >
              <ArrowLeft size={14} />
              <span>Back to Service Choice</span>
            </button>

            <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs">
              <Heart size={13} className="text-rose-600 fill-current" />
              <span>Ambulance Dispatch Gateway</span>
            </div>
          </div>


          {/* WHO IS REQUESTING SOS? (CHOOSE ROLE) CARD */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 font-bold">&#128101;</span>
                <span className="text-xs font-black tracking-wide text-gray-800 uppercase">
                  WHO IS REQUESTING SOS? (CHOOSE ROLE)
                </span>
              </div>
              <span className="text-xs font-bold text-gray-500">
                {callerRole === 'PATIENT' ? 'Patient: Self' : 'Bystander: Helper'}
              </span>
            </div>

            {/* Two Side-by-Side Role Selectors */}
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: I am the Patient */}
              <button
                onClick={() => setCallerRole('PATIENT')}
                className={`p-3 rounded-2xl text-left border-2 transition-all flex items-start gap-2.5 relative ${
                  callerRole === 'PATIENT'
                    ? 'border-red-500 bg-red-50/40 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300 opacity-70'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    callerRole === 'PATIENT' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-xs font-black text-gray-900 leading-tight">I am the Patient</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Self</p>
                </div>
                {callerRole === 'PATIENT' && (
                  <span className="absolute top-3 right-3 text-red-600">
                    <Check size={16} className="stroke-[3]" />
                  </span>
                )}
              </button>

              {/* Option 2: I am a Bystander */}
              <button
                onClick={() => setCallerRole('BYSTANDER')}
                className={`p-3 rounded-2xl text-left border-2 transition-all flex items-start gap-2.5 relative ${
                  callerRole === 'BYSTANDER'
                    ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300 opacity-70'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    callerRole === 'BYSTANDER' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Heart size={18} />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-xs font-black text-gray-900 leading-tight">I am a Bystander</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Helper / Witness</p>
                </div>
                {callerRole === 'BYSTANDER' && (
                  <span className="absolute top-3 right-3 text-amber-600">
                    <Check size={16} className="stroke-[3]" />
                  </span>
                )}
              </button>
            </div>

            {/* EXCLUSIVE SECTION FOR BYSTANDER (Image 3): VICTIMS / PATIENTS ON SCENE */}
            {callerRole === 'BYSTANDER' && (
              <div className="pt-2 border-t border-gray-100 animate-in fade-in duration-200">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-2">
                  VICTIMS / PATIENTS ON SCENE
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['1 Person', '2 Person', '3+ MCI'] as const).map((count) => (
                    <button
                      key={count}
                      onClick={() => setVictimCount(count)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                        victimCount === count
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Triggering Role Status Chip */}
          <div className="flex justify-center">
            {callerRole === 'PATIENT' ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full border border-red-300 bg-red-50 text-red-700 text-xs font-bold shadow-2xs">
                <span>&#128100;</span>
                <span>Triggering as: &#128680; Patient (Self-Emergency)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-xs font-bold shadow-2xs">
                <span>&#129505;</span>
                <span>Triggering as: &#129505; Bystander (Helping Victim)</span>
              </div>
            )}
          </div>

          {/* Central Circular SOS Button Area */}
          <div className="text-center py-2 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div
                className={`absolute -inset-4 rounded-full opacity-30 animate-pulse ${
                  callerRole === 'PATIENT' ? 'bg-red-400' : 'bg-amber-400'
                }`}
              />

              {/* Progress Ring for hold */}
              {isHolding && (
                <svg className="absolute -inset-2 w-[164px] h-[164px] -rotate-90 pointer-events-none">
                  <circle
                    cx="82"
                    cy="82"
                    r="76"
                    className="stroke-gray-200 fill-none stroke-4"
                  />
                  <circle
                    cx="82"
                    cy="82"
                    r="76"
                    className={`fill-none stroke-4 ${
                      callerRole === 'PATIENT' ? 'stroke-red-600' : 'stroke-amber-600'
                    }`}
                    strokeDasharray={477}
                    strokeDashoffset={477 - (477 * holdProgress) / 100}
                    strokeLinecap="round"
                  />
                </svg>
              )}

              {/* Main Button */}
              <button
                onMouseDown={() => setIsHolding(true)}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={() => setIsHolding(true)}
                onTouchEnd={() => setIsHolding(false)}
                onClick={() => triggerEmergency('AMBULANCE')}
                className={`relative w-36 h-36 rounded-full text-white shadow-2xl flex flex-col items-center justify-center transition-transform active:scale-95 select-none ${
                  callerRole === 'PATIENT'
                    ? 'bg-gradient-to-b from-red-500 to-red-700 shadow-red-500/40'
                    : 'bg-gradient-to-b from-amber-500 to-orange-600 shadow-amber-500/40'
                }`}
              >
                <ShieldAlert size={36} className="mb-0.5 drop-shadow" />
                <span className="text-2xl font-black tracking-tight leading-none">SOS</span>
                <span className="text-[10px] font-bold tracking-widest opacity-90 mt-1">HOLD 1S</span>
              </button>
            </div>

            <p className="text-[11px] text-gray-500 mt-4 max-w-[280px] leading-relaxed">
              Hold the button for 1 second or use the direct buttons below to immediately dispatch the nearest ambulance.
            </p>
          </div>

          {/* Instant 1-Tap Dispatch Button */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2">
            <span className="text-[10px] font-black tracking-wider text-gray-500 uppercase block">
              INSTANT 1-TAP DISPATCH BUTTON
            </span>

            {callerRole === 'PATIENT' ? (
              <button
                onClick={() => triggerEmergency('AMBULANCE')}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
              >
                <User size={18} />
                <span>1-Tap SOS for Patient (Self)</span>
              </button>
            ) : (
              <button
                onClick={() => triggerEmergency('AMBULANCE')}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
              >
                <Heart size={18} />
                <span>1-Tap SOS as Bystander (Helper)</span>
              </button>
            )}
          </div>

          {/* Live GPS Captured Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-red-500 flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-rose-500 tracking-wider uppercase block">
                  LIVE GPS CAPTURED
                </span>
                <p className="text-xs font-black text-gray-900 truncate">
                  1090 Market Street, Civic Center, SF
                </p>
                <p className="text-[11px] text-gray-500 truncate">Outside BART Entrance</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-700 text-[10px] font-black rounded-lg shrink-0">
              HIGH ACC
            </span>
          </div>

        </div>
      )}
    </div>
  );
}

function ActiveIncidentView({ incident, users, onBack, onEditInfo, fetchState }: any) {
  const responder = users.find((u: any) => u.id === incident.assignedResponderId);
  const hospital = users.find((u: any) => u.id === incident.selectedHospitalId);

  const getFirstAidTips = (condition?: string) => {
    switch (condition) {
      case 'Cardiac / Chest Pain':
        return [
          'Rest in a comfortable position (semi-seated, back supported).',
          'Loosen all tight clothing around the neck, chest, and waist.',
          'Breathe slowly and deeply; avoid any physical exertion or walking.',
          'Be prepared for CPR if responsiveness is lost (100-120 compressions/min).'
        ];
      case 'Severe Accident / Trauma':
        return [
          'Apply direct, continuous pressure to bleeding wounds using a clean cloth.',
          'Do NOT move the patient unless there is immediate danger (fire/traffic).',
          'Keep patient warm with a jacket or blanket to prevent trauma shock.',
          'Keep airway clear and do not attempt to align fractured bones.'
        ];
      case 'Acute Stroke (FAST)':
        return [
          'Note the EXACT time that facial, arm, or speech symptoms first appeared.',
          'Keep the patient laying slightly elevated; do not give food, water, or aspirin.',
          'Speak calmly to reduce anxiety; keep airways completely unobstructed.'
        ];
      case 'Respiratory Distress':
        return [
          'Help patient sit upright or lean forward with hands on knees (tripod position).',
          'Ensure fresh airflow and loosen tight collars.',
          'Assist with their prescribed rescue inhaler/bronchodilator if available.'
        ];
      case 'Pediatric Emergency':
        return [
          'Keep the child calm in a caregiver’s arms in a comfortable posture.',
          'Monitor breathing rhythm closely and keep airways clear.',
          'Do not give oral medication or fluids without medical direction.'
        ];
      case 'Fire & Severe Burns':
        return [
          'Cool the burn immediately with clean, cool running water for 10-15 minutes.',
          'Do NOT apply ice, butter, or ointments to raw burns.',
          'Cover loosely with a clean, dry, non-stick dressing or clean cloth.'
        ];
      case 'Maternal / Emergency Delivery':
        return [
          'Have mother lie on her left side or assume the most comfortable resting posture.',
          'Prepare clean towels, warm blankets, and maintain calm breathing.',
          'If baby crowns, support gently without pulling.'
        ];
      default:
        return [
          'Ensure patient is in a safe, quiet location lying down or seated comfortably.',
          'Check breathing and consciousness continuously until EMT crew arrives.',
          'Have medical history or ongoing medications accessible for the paramedic.'
        ];
    }
  };

  const firstAidTips = getFirstAidTips(incident.conditionCategory || incident.condition);

  const steps = incident.type === 'AMBULANCE' ? [
    { label: 'SOS Sent' },
    { label: 'Searching Units' },
    { label: 'Responder Accepted' },
    { label: 'Hospital Selected' },
    { label: 'Patient Picked' },
    { label: 'In Transit' },
    { label: 'Reached Hospital' }
  ] : [
    { label: 'SOS Sent' },
    { label: 'Searching Units' },
    { label: 'Responder Accepted' },
    { label: 'En Route to Scene' },
    { label: 'Rescue Completed' }
  ];

  const getActiveIndex = (status: string, type: string) => {
    if (type === 'AMBULANCE') {
      switch (status) {
        case 'CREATED': return 0;
        case 'NOTIFIED': return 1;
        case 'AUTO_ESCALATION_STARTED': return 1;
        case 'RESPONDER_EN_ROUTE': return 2;
        case 'HOSPITAL_COORDINATION': return 2;
        case 'HOSPITAL_SELECTED': return 3;
        case 'PATIENT_PICKED': return 4;
        case 'IN_TRANSIT': return 5;
        case 'REACHED_DESTINATION': return 6;
        case 'COMPLETED': return 7;
        default: return 0;
      }
    } else {
      switch (status) {
        case 'CREATED': return 0;
        case 'NOTIFIED': return 1;
        case 'AUTO_ESCALATION_STARTED': return 1;
        case 'RESPONDER_EN_ROUTE': return 2;
        case 'IN_TRANSIT': return 3;
        case 'COMPLETED': return 4;
        default: return 0;
      }
    }
  };

  const activeIdx = getActiveIndex(incident.status, incident.type);
  const isEscalated = incident.status === 'AUTO_ESCALATION_STARTED';

  return (
    <div className="w-full space-y-5">
      {/* Q-ARES Project Flowchart Synchronisation Engine Bar */}
      <QaresFlowchartPipeline incident={incident} defaultExpanded={false} />

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-red">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <AlertCircle className="text-brand-red" />
            Active Emergency
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-red-50 text-brand-red font-bold rounded-full text-xs uppercase tracking-wider border border-red-100">
              {incident.type}
            </span>
            <StatusBadge status={incident.status} size="md" showSublabel />
          </div>
        </div>

        {/* AI-Assisted Dispatch & QPSO Metaheuristics Telemetry Badge */}
        {incident.aiDispatch && (
          <div className="p-3.5 mb-6 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-blue-400/40 text-white space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wide text-blue-200 flex items-center gap-1.5">
                  <Cpu size={14} className="text-blue-400" />
                  AI-Assisted Dispatch Active (QPSO Metaheuristics)
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                {incident.aiDispatch.routeEfficiencyGain}
              </span>
            </div>

            <div className="text-[11px] text-gray-200 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
              <span>
                <strong>Source: </strong>
                <span className={incident.aiDispatch.sourceType.includes('AUTOMATIC_CALLING_AGENT') ? 'text-amber-300 font-bold' : 'text-emerald-300 font-bold'}>
                  {incident.aiDispatch.sourceLabel}
                </span>
              </span>
              <span className="font-mono text-[10px] text-gray-400">
                Unit: <strong className="text-white">{incident.aiDispatch.assignedUnitName}</strong>
              </span>
            </div>
          </div>
        )}

        {incident.callerRole && (
          <div className="mb-4 text-xs font-semibold text-gray-500 flex items-center gap-2">
            <span>Requested by: <strong className="text-gray-900">{incident.callerRole === 'PATIENT' ? 'Patient (Self)' : `Bystander (${incident.victimCount || 1} victims)`}</strong></span>
          </div>
        )}

        {/* Clinical Condition & Destination Preference Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 mb-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-bold">🩺</span>
              <span className="text-xs font-black uppercase text-gray-800 tracking-wide">
                Reported Medical Condition
              </span>
            </div>
            {incident.conditionAcuity && (
              <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black tracking-wider ${
                incident.conditionAcuity === 'ALS' ? 'bg-red-50 text-red-700 border-red-200' :
                incident.conditionAcuity === 'NEO' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                incident.conditionAcuity === 'MICU' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {incident.conditionAcuity} {incident.conditionAcuity === 'ALS' ? '🔴' : ''}
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-gray-900">
                {incident.conditionCategory || incident.condition || 'Emergency Triage'}
              </p>
              {incident.conditionSubtitle && (
                <p className="text-xs text-gray-500 mt-0.5">{incident.conditionSubtitle}</p>
              )}
              <div className="mt-2 text-xs text-gray-600 flex items-center gap-1.5">
                <Building2 size={13} className="text-blue-600 shrink-0" />
                <span>
                  <strong>Destination: </strong>
                  {incident.hospitalPreference === 'PREFERRED_HOSPITAL' && incident.preferredHospitalName
                    ? `Patient Requested: ${incident.preferredHospitalName}`
                    : 'Ambulance Crew Dynamic Route (Optimal ER Beds)'}
                </span>
              </div>
            </div>

            <button
              onClick={onEditInfo}
              className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs shrink-0 transition-all active:scale-95"
            >
              <FileEdit size={12} />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* First Aid Protocol Guide */}
        <div className="bg-red-50/60 p-4 rounded-2xl border border-red-200 mb-6 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-red-800 uppercase tracking-tight">
              <ShieldPlus size={15} className="text-red-600" />
              <span>Immediate First Aid Protocol ({incident.conditionCategory || incident.condition || 'Emergency'})</span>
            </div>
            <span className="text-[10px] font-bold text-red-600 bg-white px-2 py-0.5 rounded-full border border-red-200">
              Paramedic Verified
            </span>
          </div>

          <ul className="space-y-1.5 text-xs text-gray-800">
            {firstAidTips.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-snug">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Live GPS Ambulance & Hospital Route Map */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Navigation size={15} className="text-blue-600" />
              <span className="text-xs font-black uppercase text-gray-900 tracking-wide">
                Live Ambulance & Hospital Route Map
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              GPS RADAR ACTIVE
            </span>
          </div>

          <p className="text-[11px] text-gray-500">
            {incident.status === 'IN_TRANSIT' || incident.status === 'PATIENT_PICKED'
              ? 'Tracking ambulance en route to hospital with preempted green corridor signals.'
              : 'Tracking approaching ambulance location, route path, and live estimated arrival.'}
          </p>

          <LiveEmergencyMap
            incident={incident}
            role="PATIENT"
            users={users}
            height="260px"
          />
        </div>

        {responder && (
          <div className="space-y-3 mb-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-4">
              <div className="p-3 bg-brand-blue text-white rounded-lg">
                <Truck size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-blue">Responder Assigned</p>
                <p className="text-lg font-bold text-brand-text">{responder.name}</p>
                {hospital && (
                  <p className="text-sm text-brand-muted mt-1 flex items-center gap-1">
                    <MapPin size={14} /> Destination: {hospital.name}
                  </p>
                )}
              </div>
            </div>

            {/* Reassuring Traffic Police Green Corridor Banner */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-black uppercase tracking-tight">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Traffic Police Green Corridor Active</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[9px] uppercase tracking-wider">
                  Mandatory Preemption
                </span>
              </div>
              <p className="text-emerald-950 font-semibold leading-relaxed">
                {incident.status === 'IN_TRANSIT' || incident.status === 'PATIENT_PICKED'
                  ? 'Situation 2: Priority medical green wave active — all signals to emergency hospital bay cleared.'
                  : 'Situation 1: Traffic Police notified — all intersection signals along route are cleared green for incoming unit.'}
              </p>
            </div>
          </div>
        )}

        {/* 2-Minute Unit Acceptance Waiting Monitor & Automatic Calling Agent (RESQ Flowchart) */}
        {(!responder || isEscalated) && (
          <div className="mb-6">
            <UnitAcceptanceMonitor incident={incident} fetchState={fetchState} />
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-semibold text-brand-text">Live Status</h3>
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-brand-border"></div>
            <div className="space-y-6 relative z-10">
              {steps.map((step, idx) => {
                const isPast = activeIdx > idx && !isEscalated;
                const isCurrent = activeIdx === idx && !isEscalated;

                return (
                  <div key={idx} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isCurrent ? 'bg-white border-brand-blue text-brand-blue' : isPast ? 'bg-brand-green border-brand-green text-white' : 'bg-brand-bg border-brand-border text-brand-muted'}`}>
                      {isPast ? <CheckCircle2 size={16} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    <span className={`font-medium ${isCurrent ? 'text-brand-blue font-bold' : isPast ? 'text-brand-text' : 'text-brand-muted'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
