import React, { useState, useEffect } from 'react';
import { AppState, Incident, TrafficPoliceNotification } from '../types';
import { 
  ShieldAlert, 
  Navigation, 
  MapPin, 
  Radio, 
  CheckCircle2, 
  Bell, 
  Volume2, 
  VolumeX, 
  Zap, 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  Activity, 
  Eye, 
  RotateCw,
  Bike,
  Download,
  FileText
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import FeedbackForm from './FeedbackForm';
import IncidentLifecycleHistory from './IncidentLifecycleHistory';
import LiveEmergencyMap from './LiveEmergencyMap';
import { downloadAllHistoryReport, downloadAllHistoryPDF } from '../utils/downloadReport';

// Web Audio API emergency chime
function playTrafficAlertChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc1.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.15); // D6

    osc2.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc2.frequency.setValueAtTime(587.33, audioCtx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.35);
    osc2.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    // AudioContext blocked or not supported
  }
}

export default function TrafficPoliceDashboard({ state, userId, fetchState }: any) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'corridors' | 'notifications' | 'history'>('corridors');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastNotifCount, setLastNotifCount] = useState<number>(() => state.trafficNotifications?.length || 0);

  const notifications: TrafficPoliceNotification[] = state.trafficNotifications || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  // Active Green Corridor Incidents
  // Both Situation 1 (Driver en route to patient) and Situation 2 (Driver in transit with patient to hospital)
  const activeCorridors = state.incidents.filter((i: Incident) => 
    i.greenCorridor && 
    (i.status === 'RESPONDER_EN_ROUTE' || i.status === 'HOSPITAL_COORDINATION' || i.status === 'HOSPITAL_SELECTED' || i.status === 'PATIENT_PICKED' || i.status === 'IN_TRANSIT')
  );

  // All historical corridor incidents
  const allCorridorIncidents = state.incidents.filter((i: Incident) => 
    i.greenCorridor || i.timeline.some((t: any) => t.status === 'IN_TRANSIT' || t.status === 'RESPONDER_EN_ROUTE')
  );

  // Mandatory feedbacks for completed emergencies
  const pendingFeedbackIncidents = state.incidents.filter((i: Incident) => 
    i.status === 'COMPLETED' && 
    i.assignedResponderId &&
    !state.feedbacks?.some((f: any) => f.incidentId === i.id && f.fromRole === 'TRAFFIC_POLICE')
  );

  // Play audio chime when new notifications arrive
  useEffect(() => {
    if (notifications.length > lastNotifCount) {
      if (soundEnabled) {
        playTrafficAlertChime();
      }
      setLastNotifCount(notifications.length);
    }
  }, [notifications.length, lastNotifCount, soundEnabled]);

  const handleCorridorAction = async (incidentId: string, action: 'ACKNOWLEDGE' | 'SYNC_ALL_GREEN' | 'DISPATCH_ESCORT') => {
    setActionLoading(`${incidentId}-${action}`);
    try {
      await fetch(`/api/incidents/${incidentId}/corridor-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (fetchState) fetchState();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/traffic-notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (fetchState) fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-4 pb-6">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">TRAFFIC COMMAND & CONTROL</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-300">Mandatory Green Corridor Clearance Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Alert sounds active' : 'Alert sounds muted'}
              className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                soundEnabled 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => fetchState && fetchState()}
              title="Refresh telemetry"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </div>

        {/* Live Broadcast Ticker if Corridors Active */}
        {activeCorridors.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-emerald-400 font-bold animate-pulse">
            <Zap size={14} className="shrink-0 text-emerald-400" />
            <span className="truncate">
              MANDATORY GREEN CORRIDOR ACTIVE: {activeCorridors.length} emergency unit(s) requiring immediate junction clearance.
            </span>
          </div>
        )}
      </div>

      {/* Mandatory Feedbacks for completed corridor missions */}
      {pendingFeedbackIncidents.length > 0 && (
        <div className="space-y-3">
          {pendingFeedbackIncidents.map((inc: Incident) => {
            const responder = state.users.find((u: any) => u.id === inc.assignedResponderId);
            if (!responder) return null;
            return (
              <div key={inc.id} className="relative">
                <FeedbackForm
                  incidentId={inc.id}
                  fromRole="TRAFFIC_POLICE"
                  toRole={responder.role}
                  fromId={userId || 'traffic-police'}
                  toId={responder.id}
                  targetName={responder.name}
                  onSubmit={fetchState}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
        <button
          onClick={() => setActiveTab('corridors')}
          className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'corridors' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Navigation size={14} className="text-emerald-600" />
          <span>Active Corridors ({activeCorridors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center gap-1.5 transition-all relative ${
            activeTab === 'notifications' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell size={14} className="text-amber-600" />
          <span>Dispatch Alerts</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center gap-1.5 transition-all relative ${
            activeTab === 'history' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock size={14} className="text-blue-600" />
          <span>History &amp; Timing ({allCorridorIncidents.length})</span>
        </button>
      </div>

      {/* VIEW 1: ACTIVE CORRIDORS */}
      {activeTab === 'corridors' && (
        <div className="space-y-4">
          {activeCorridors.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Navigation size={26} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No Active Emergency Corridors</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  When an Ambulance or Fire unit accepts an incident, a <strong>Mandatory Green Corridor</strong> will immediately trigger here for both:
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold shrink-0">Phase 1</span>
                  <span>Driver outbound to patient location</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">Phase 2</span>
                  <span>Driver in transit with patient to hospital bay</span>
                </div>
              </div>
            </div>
          ) : (
            activeCorridors.map((inc: Incident) => {
              const responder = state.users.find((u: any) => u.id === inc.assignedResponderId);
              const hospital = state.users.find((u: any) => u.id === inc.selectedHospitalId);
              const corridor = inc.greenCorridor!;
              const isPhase1 = corridor.phase === 'EN_ROUTE_TO_PATIENT';
              const isPhase2 = corridor.phase === 'IN_TRANSIT_TO_HOSPITAL' || inc.status === 'IN_TRANSIT' || inc.status === 'PATIENT_PICKED';

              return (
                <div 
                  key={inc.id} 
                  className="bg-white rounded-2xl border-2 border-emerald-500/80 shadow-md overflow-hidden transition-all"
                >
                  {/* Phase & Urgency Banner */}
                  <div className={`p-3 text-white flex items-center justify-between ${
                    isPhase1 ? 'bg-gradient-to-r from-blue-700 to-indigo-800' : 'bg-gradient-to-r from-emerald-700 to-teal-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-white/20">
                        <Zap size={15} className="text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                      </div>
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wider text-yellow-300">
                          {isPhase1 ? '🚨 SITUATION 1: MANDATORY GREEN CORRIDOR' : '🚨 SITUATION 2: MANDATORY MEDICAL CORRIDOR'}
                        </div>
                        <div className="text-xs font-bold">
                          {isPhase1 ? 'Ambulance Outbound to Patient Location' : 'Ambulance Transporting Patient to Hospital'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 bg-white text-slate-900 text-[10px] font-black rounded uppercase tracking-wide">
                        {inc.conditionAcuity || 'ALS'} PRIORITY
                      </span>
                    </div>
                  </div>

                  {/* Route & Unit Overview */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">{responder?.name || 'Emergency Unit'}</span>
                          <span className="text-xs font-semibold text-slate-500">• Speed: ~{corridor.speedKmH} km/h</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Condition: <strong className="text-red-700">{inc.conditionCategory || inc.condition || 'Critical Emergency'}</strong>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-black text-emerald-700 flex items-center gap-1 justify-end">
                          <Clock size={12} />
                          ETA: ~{corridor.estimatedArrivalMinutes} mins
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          Notified {Math.max(0, Math.floor((Date.now() - corridor.notifiedAt) / 1000))}s ago
                        </span>
                      </div>
                    </div>

                    {/* Corridor Trajectory Details */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-600">Corridor Route:</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          🟢 GREEN WAVE PREEMPTION ACTIVE
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <div className="shrink-0 flex items-center gap-1 text-slate-500">
                          <MapPin size={13} className="text-blue-600" />
                          <span className="truncate max-w-[120px]">{corridor.source}</span>
                        </div>
                        <ArrowRight size={14} className="shrink-0 text-slate-400" />
                        <div className="shrink-0 flex items-center gap-1 text-slate-900 font-bold">
                          <MapPin size={13} className="text-red-600" />
                          <span className="truncate max-w-[150px]">{corridor.destination}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Tactical Green Corridor Map with Approaching Ambulance */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                          <Navigation size={14} className="text-emerald-600" />
                          Live Tactical Route &amp; Signal Preemption Map
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          RADAR TRACKING
                        </span>
                      </div>
                      <LiveEmergencyMap
                        incident={inc}
                        role="TRAFFIC_POLICE"
                        users={state.users}
                        height="280px"
                        onCorridorAction={handleCorridorAction}
                      />
                    </div>

                    {/* Preempted Intersections / Junctions List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <Navigation size={13} className="text-emerald-600" />
                          Synchronized Signal Junctions
                        </h4>
                        <span className="text-[11px] font-bold text-emerald-600">
                          {corridor.junctions?.filter(j => j.status === 'GREEN').length || 4} of {corridor.junctions?.length || 4} Clear
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {(corridor.junctions || [
                          { id: 'j1', name: '5th St & Market St', status: 'GREEN', etaSeconds: 45 },
                          { id: 'j2', name: '7th St & Market St', status: 'GREEN', etaSeconds: 95 },
                          { id: 'j3', name: '8th St & Hyde St', status: 'GREEN', etaSeconds: 150 },
                          { id: 'j4', name: 'Civic Center West Gate', status: 'CLEARING', etaSeconds: 210 }
                        ]).map((junction, idx) => (
                          <div 
                            key={junction.id || idx}
                            className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${junction.status === 'GREEN' ? 'bg-emerald-500 shadow-xs shadow-emerald-400' : 'bg-amber-500 animate-pulse'}`} />
                              <span className="font-semibold text-slate-800">{junction.name}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${junction.status === 'GREEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {junction.status === 'GREEN' ? 'ALL GREEN' : 'CLEARING'}
                              </span>
                              <span className="text-slate-400">{junction.etaSeconds}s ETA</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Traffic Escort Status */}
                    {corridor.escortDispatched && (
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-bold flex items-center gap-2">
                        <Bike size={16} className="text-blue-600 shrink-0" />
                        <span>Motorcycle Outrider Escort dispatched to lead corridor preemption.</span>
                      </div>
                    )}

                    {/* Police Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        disabled={actionLoading === `${inc.id}-SYNC_ALL_GREEN`}
                        onClick={() => handleCorridorAction(inc.id, 'SYNC_ALL_GREEN')}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                      >
                        <Zap size={14} />
                        <span>Force All Green Wave</span>
                      </button>

                      <button
                        disabled={actionLoading === `${inc.id}-DISPATCH_ESCORT` || corridor.escortDispatched}
                        onClick={() => handleCorridorAction(inc.id, 'DISPATCH_ESCORT')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all border ${
                          corridor.escortDispatched
                            ? 'bg-blue-100 border-blue-300 text-blue-800 cursor-default'
                            : 'bg-slate-900 hover:bg-black text-white border-transparent active:scale-[0.98]'
                        }`}
                      >
                        <Bike size={14} />
                        <span>{corridor.escortDispatched ? 'Escort Deployed' : 'Deploy Escort'}</span>
                      </button>
                    </div>

                    {/* Officer Acknowledgment */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={13} className={corridor.acknowledgedAt ? 'text-emerald-600' : 'text-slate-300'} />
                        {corridor.acknowledgedAt 
                          ? `Acknowledged at ${new Date(corridor.acknowledgedAt).toLocaleTimeString()}`
                          : 'Awaiting officer sign-off'}
                      </span>
                      {!corridor.acknowledgedAt && (
                        <button
                          onClick={() => handleCorridorAction(inc.id, 'ACKNOWLEDGE')}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          Sign-off Corridor
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: DISPATCH ALERTS & NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Traffic Police Notification Feed ({notifications.length})
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 shadow-sm">
              <Bell size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold">No dispatch notifications logged yet.</p>
            </div>
          ) : (
            notifications.map((notif: TrafficPoliceNotification) => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border text-xs space-y-1.5 transition-all shadow-xs ${
                  notif.read 
                    ? 'bg-white border-slate-200 text-slate-700' 
                    : 'bg-emerald-50/70 border-emerald-300 text-slate-900 ring-1 ring-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${notif.read ? 'bg-slate-300' : 'bg-red-600 animate-ping'}`} />
                    <span className="font-black text-xs text-slate-900">{notif.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed font-medium">
                  {notif.message}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px]">
                    Unit: {notif.responderName}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                    Dest: {notif.destinationName}
                  </span>
                  {notif.acuity && (
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                      {notif.acuity}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 3: CORRIDOR HISTORY & TIMING AUDIT */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <Clock size={18} className="text-emerald-400" />
                <span>Green Corridor Mission History &amp; Street Preemption Logs</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Audit records showing patient/bystander details, condition, route &amp; streets, and exact Green Corridor timings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                {allCorridorIncidents.length} Corridors
              </span>

              {allCorridorIncidents.length > 0 && (
                <>
                  <button
                    onClick={() => downloadAllHistoryPDF(allCorridorIncidents, state, 'Traffic-Police-Clearance')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export All (.pdf)</span>
                  </button>

                  <button
                    onClick={() => downloadAllHistoryReport(allCorridorIncidents, state, 'Traffic-Police-Clearance')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>.txt</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {allCorridorIncidents.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
              <Clock size={40} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No emergency corridors recorded yet.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All dispatched emergency runs with street preemption and multi-node timing will be archived here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allCorridorIncidents.map((inc: Incident) => (
                <IncidentLifecycleHistory
                  key={inc.id}
                  incident={inc}
                  state={state}
                  currentRole="TRAFFIC_POLICE"
                  showPoliceRouteDetails={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
