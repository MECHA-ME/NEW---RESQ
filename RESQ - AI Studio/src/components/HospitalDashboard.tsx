import React, { useState, useEffect } from 'react';
import { AppState, Incident, User } from '../types';
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  Bed, 
  Plus, 
  Minus, 
  Check, 
  Sparkles, 
  Hospital as HospitalIcon,
  AlertCircle,
  Clock,
  Download,
  FileText,
  Navigation
} from 'lucide-react';
import FeedbackForm from './FeedbackForm';
import StatusBadge from './StatusBadge';
import IncidentLifecycleHistory from './IncidentLifecycleHistory';
import LiveEmergencyMap from './LiveEmergencyMap';
import { downloadAllHistoryReport, downloadAllHistoryPDF } from '../utils/downloadReport';

export default function HospitalDashboard({ state, userId, fetchState }: any) {
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  
  // Current hospital profile
  const currentHospital: User | undefined = state.users.find((u: any) => u.id === userId);

  // Capacity states (editable by hospital)
  const initialEr = currentHospital?.capacity?.erBeds ?? 28;
  const initialIcu = currentHospital?.capacity?.icuBeds ?? 6;
  const initialVent = currentHospital?.capacity?.ventilators ?? 11;

  const [erBeds, setErBeds] = useState<number>(initialEr);
  const [icuBeds, setIcuBeds] = useState<number>(initialIcu);
  const [ventilators, setVentilators] = useState<number>(initialVent);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);

  // Synchronize when state updates from server
  useEffect(() => {
    if (currentHospital?.capacity) {
      setErBeds(currentHospital.capacity.erBeds);
      setIcuBeds(currentHospital.capacity.icuBeds);
      setVentilators(currentHospital.capacity.ventilators);
    }
  }, [currentHospital?.capacity?.lastUpdated]);

  const handlePublishCapacity = async () => {
    setIsUpdating(true);
    try {
      await fetch(`/api/hospitals/${userId}/capacity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erBeds,
          icuBeds,
          ventilators
        })
      });
      fetchState();
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to update capacity', e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Incidents that notified this hospital and are waiting for a response
  const pendingRequests = state.incidents.filter((i: Incident) => 
    i.status === 'HOSPITAL_COORDINATION' &&
    i.notifiedHospitals.includes(userId) &&
    !i.acceptedHospitals.includes(userId) &&
    !i.rejectedHospitals.includes(userId)
  );

  // Incidents this hospital accepted, waiting for ambulance
  const incomingPatients = state.incidents.filter((i: Incident) =>
    i.selectedHospitalId === userId &&
    !['REACHED_DESTINATION', 'COMPLETED', 'CANCELLED'].includes(i.status)
  );

  // All historical incidents involving this hospital
  const hospitalIncidents = state.incidents.filter((i: Incident) => 
    i.selectedHospitalId === userId || 
    i.acceptedHospitals.includes(userId) ||
    i.notifiedHospitals.includes(userId)
  );

  // Mandatory feedbacks for all completed incidents without skip
  const pendingFeedbackIncidents = state.incidents.filter((i: Incident) => 
    i.status === 'COMPLETED' && 
    i.selectedHospitalId === userId &&
    i.assignedResponderId &&
    !state.feedbacks?.some((f: any) => f.incidentId === i.id && f.fromId === userId)
  );

  const respond = async (incidentId: string, response: 'ACCEPT' | 'REJECT') => {
    await fetch(`/api/incidents/${incidentId}/hospital-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalId: userId, response })
    });
    fetchState();
  };

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Top Tab Switcher */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'live'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Building2 size={16} />
            <span>Live ER Intake</span>
            {(incomingPatients.length > 0 || pendingRequests.length > 0) && (
              <span className="px-1.5 py-0.2 bg-white text-emerald-700 rounded-full text-[10px] font-mono font-black">
                {incomingPatients.length + pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Clock size={16} />
            <span>Emergency History &amp; Audit Trail</span>
            <span className="px-1.5 py-0.2 bg-slate-700 text-white rounded-full text-[10px] font-mono font-black">
              {hospitalIncidents.length}
            </span>
          </button>
        </div>

        <span className="text-[10px] font-mono text-emerald-700 font-bold">
          🏥 TRAUMA NETWORK ONLINE
        </span>
      </div>

      {/* Mandatory Feedbacks from past completed runs - NO SKIP BUTTON */}
      {pendingFeedbackIncidents.length > 0 && (
        <div className="pt-1">
          {pendingFeedbackIncidents.map((inc: Incident) => {
            const responder = state.users.find((u: any) => u.id === inc.assignedResponderId);
            if (!responder) return null;
            return (
              <div key={inc.id} className="relative mb-4">
                <FeedbackForm
                  incidentId={inc.id}
                  fromRole="HOSPITAL"
                  toRole={responder.role}
                  fromId={userId}
                  toId={responder.id}
                  targetName={responder.name}
                  onSubmit={fetchState}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 1: LIVE ER INTAKE */}
      {activeTab === 'live' && (
        <div className="space-y-3.5">
          {/* 1. Hospital Header Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Building2 size={22} className="stroke-[2.2]" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-gray-900 tracking-tight leading-tight">
                      {currentHospital?.name || 'San Francisco General Trauma Center'}
                    </h2>
                    <span className="px-1.5 py-0.5 border border-emerald-300 text-emerald-700 bg-emerald-50/70 text-[9px] font-black rounded-md tracking-wider leading-none">
                      {currentHospital?.hospitalLevel || 'LEVEL 1'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-1 leading-snug">
                    {currentHospital?.commandTitle || 'Emergency Department Command • Dr. Sarah Lin, MD (Attending)'}
                  </p>
                </div>
              </div>

              {/* Quick Metrics in Header: ER Available / Beds / ICU */}
              <div className="text-right shrink-0">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
                  ER Available
                </span>
                <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                  <span className="text-xs font-black text-emerald-600">
                    {erBeds} <span className="text-[10px] font-bold text-emerald-700">Beds</span>
                  </span>
                  <span className="text-[10px] text-gray-300">•</span>
                  <span className="text-xs font-black text-emerald-600">
                    {icuBeds} <span className="text-[10px] font-bold text-emerald-700">ICU</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

      {/* 2. Trauma Intake Standby / Live Incoming Transports Card (Middle of User Image) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs text-center flex flex-col items-center justify-center min-h-[140px]">
        {incomingPatients.length === 0 && pendingRequests.length === 0 ? (
          <div className="space-y-2 animate-in fade-in duration-200">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center">
              <Building2 size={24} className="stroke-[1.7]" />
            </div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              Trauma Intake Standby
            </h3>
            <p className="text-[11px] text-gray-500 max-w-[300px] mx-auto leading-relaxed">
              No incoming ambulance transports at this moment. ER readiness is synchronized with the Quantum Optimization Network.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-3 text-left">
            {/* Active pending triage alerts */}
            {pendingRequests.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-wider text-rose-600 uppercase flex items-center gap-1">
                    <AlertCircle size={13} className="animate-pulse" />
                    Incoming Ambulance Triage SOS ({pendingRequests.length})
                  </span>
                  <span className="text-[9px] font-mono text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    ACTION REQUIRED
                  </span>
                </div>

                {pendingRequests.map((inc: Incident) => {
                  const assignedDriver = state.users.find((u: any) => u.id === inc.assignedResponderId);

                  return (
                    <div key={inc.id} className="p-3.5 rounded-2xl border-2 border-rose-300 bg-rose-50/50 shadow-2xs space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-rose-950">
                            {inc.conditionCategory || inc.condition || 'Emergency Condition'}
                          </span>
                          {inc.conditionAcuity && (
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black tracking-wider ${
                              inc.conditionAcuity === 'ALS' ? 'bg-red-100 text-red-800 border-red-300' :
                              inc.conditionAcuity === 'NEO' ? 'bg-pink-100 text-pink-800 border-pink-300' :
                              inc.conditionAcuity === 'MICU' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                              'bg-blue-100 text-blue-800 border-blue-300'
                            }`}>
                              {inc.conditionAcuity} {inc.conditionAcuity === 'ALS' ? '🔴' : ''}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-rose-700 font-bold">
                          Transmitted {new Date(inc.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {inc.conditionSubtitle && (
                        <p className="text-xs text-gray-700 font-medium">
                          {inc.conditionSubtitle}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-600 bg-white/80 p-2.5 rounded-xl border border-rose-200/60">
                        <div className="truncate">
                          <strong>Caller: </strong>
                          {inc.callerRole === 'PATIENT' ? 'Patient (Self)' : `Bystander (${inc.victimCount || 1} victims)`}
                        </div>
                        <div className="truncate">
                          <strong>Unit: </strong>
                          {assignedDriver?.name || 'Ambulance Unit 1'}
                        </div>
                        <div className="col-span-full truncate pt-1 border-t border-gray-100">
                          <strong>Routing: </strong>
                          {inc.hospitalPreference === 'PREFERRED_HOSPITAL' && inc.preferredHospitalName
                            ? `Patient Requested: ${inc.preferredHospitalName}`
                            : 'Driver Discretion (Real-time ER/ICU match)'}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => respond(inc.id, 'REJECT')}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-xl transition-all active:scale-95"
                        >
                          Reject / Divert
                        </button>
                        <button
                          onClick={() => respond(inc.id, 'ACCEPT')}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          <span>Accept &amp; Reserve Intake Bay</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirmed inbound patients */}
            {incomingPatients.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[10px] font-black tracking-wider text-blue-600 uppercase flex items-center gap-1">
                  Inbound Confirmed Transports ({incomingPatients.length})
                </span>
                {incomingPatients.map((inc: Incident) => {
                  const assignedDriver = state.users.find((u: any) => u.id === inc.assignedResponderId);

                  return (
                    <div key={inc.id} className="p-3.5 rounded-2xl border-2 border-blue-200 bg-blue-50/40 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-gray-900">
                            {inc.conditionCategory || inc.condition || 'Inbound Patient'}
                          </p>
                          {inc.conditionAcuity && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">
                              {inc.conditionAcuity}
                            </span>
                          )}
                          <StatusBadge status={inc.status} size="sm" />
                        </div>
                        <span className="text-xs font-black text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                          ETA ~6 min
                        </span>
                      </div>

                      {inc.conditionSubtitle && (
                        <p className="text-[11px] text-gray-600">{inc.conditionSubtitle}</p>
                      )}

                      {/* Live Inbound Ambulance Tracker Map */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase text-gray-700 tracking-wide flex items-center gap-1">
                            <Navigation size={12} className="text-blue-600" />
                            Live Driver &amp; Route Telemetry
                          </span>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            APPROACHING TRAUMA BAY
                          </span>
                        </div>
                        <LiveEmergencyMap
                          incident={inc}
                          role="HOSPITAL"
                          users={state.users}
                          height="240px"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-blue-100">
                        <span>Unit: {assignedDriver?.name || 'Ambulance Unit 1'}</span>
                        <span className="font-semibold text-emerald-700">Trauma Bay Reserved</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. LIVE ER & ICU CAPACITY MANAGEMENT (Bottom of User Image) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3.5">
        {/* Header & QUBO note */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bed size={16} className="text-blue-600 shrink-0" />
            <span className="text-xs font-black text-gray-900 tracking-tight uppercase">
              LIVE ER &amp; ICU CAPACITY MANAGEMENT
            </span>
          </div>
          <span className="text-[9px] font-mono text-gray-400 text-right shrink-0 leading-tight">
            Directly impacts Quantum<br />QUBO weights
          </span>
        </div>

        {/* 3 Metric Adjuster Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Card 1: Available ER Beds */}
          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-gray-200/80 flex flex-col items-center justify-between gap-2">
            <span className="text-[9px] font-bold text-gray-500 text-center uppercase tracking-wider leading-tight">
              AVAILABLE ER BEDS
            </span>
            <div className="flex items-center justify-center gap-2 w-full">
              <button
                onClick={() => setErBeds((prev) => Math.max(0, prev - 1))}
                className="w-7 h-7 bg-white border border-gray-300 hover:bg-gray-100 active:scale-95 text-gray-700 font-black text-sm rounded-lg flex items-center justify-center shadow-2xs transition-all"
                title="Decrease ER Beds"
              >
                <Minus size={13} strokeWidth={3} />
              </button>

              <span className="text-lg font-black text-gray-900 min-w-[28px] text-center">
                {erBeds}
              </span>

              <button
                onClick={() => setErBeds((prev) => prev + 1)}
                className="w-7 h-7 bg-white border border-gray-300 hover:bg-gray-100 active:scale-95 text-gray-700 font-black text-sm rounded-lg flex items-center justify-center shadow-2xs transition-all"
                title="Increase ER Beds"
              >
                <Plus size={13} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Card 2: ICU Beds Available */}
          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-gray-200/80 flex flex-col items-center justify-between gap-2">
            <span className="text-[9px] font-bold text-gray-500 text-center uppercase tracking-wider leading-tight">
              ICU BEDS AVAILABLE
            </span>
            <div className="flex items-center justify-center gap-2 w-full">
              <button
                onClick={() => setIcuBeds((prev) => Math.max(0, prev - 1))}
                className="w-7 h-7 bg-white border border-gray-300 hover:bg-gray-100 active:scale-95 text-gray-700 font-black text-sm rounded-lg flex items-center justify-center shadow-2xs transition-all"
                title="Decrease ICU Beds"
              >
                <Minus size={13} strokeWidth={3} />
              </button>

              <span className="text-lg font-black text-blue-600 min-w-[24px] text-center">
                {icuBeds}
              </span>

              <button
                onClick={() => setIcuBeds((prev) => prev + 1)}
                className="w-7 h-7 bg-white border border-gray-300 hover:bg-gray-100 active:scale-95 text-gray-700 font-black text-sm rounded-lg flex items-center justify-center shadow-2xs transition-all"
                title="Increase ICU Beds"
              >
                <Plus size={13} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Card 3: Ventilators Ready */}
          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-gray-200/80 flex flex-col items-center justify-between gap-2">
            <span className="text-[9px] font-bold text-gray-500 text-center uppercase tracking-wider leading-tight">
              VENTILATORS READY
            </span>
            <div className="flex items-center justify-center gap-2 w-full">
              <button
                onClick={() => setVentilators((prev) => Math.max(0, prev - 1))}
                className="w-7 h-7 bg-white border border-gray-300 hover:bg-gray-100 active:scale-95 text-gray-700 font-black text-sm rounded-lg flex items-center justify-center shadow-2xs transition-all"
                title="Decrease Ventilators"
              >
                <Minus size={13} strokeWidth={3} />
              </button>

              <span className="text-lg font-black text-emerald-600 min-w-[24px] text-center">
                {ventilators}
              </span>

              <button
                onClick={() => setVentilators((prev) => prev + 1)}
                className="w-7 h-7 bg-white border border-gray-300 hover:bg-gray-100 active:scale-95 text-gray-700 font-black text-sm rounded-lg flex items-center justify-center shadow-2xs transition-all"
                title="Increase Ventilators"
              >
                <Plus size={13} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* Publish Button */}
        <button
          onClick={handlePublishCapacity}
          disabled={isUpdating}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs ${
            updateSuccess 
              ? 'bg-emerald-600 text-white' 
              : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 hover:border-gray-400 active:scale-[0.99]'
          }`}
        >
          {updateSuccess ? (
            <>
              <Check size={14} className="stroke-[3]" />
              <span>Published to RESQ Network!</span>
            </>
          ) : isUpdating ? (
            <span>Publishing Updates...</span>
          ) : (
            <span>Publish Capacity Update to RESQ Network</span>
          )}
        </button>
      </div>
      </div>
      )}

      {/* TAB 2: EMERGENCY HISTORY & AUDIT TRAIL */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <Clock size={18} className="text-emerald-400" />
                <span>Hospital Trauma Admission History &amp; Multi-Node Responses</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Full chronological audit of incoming patients/bystanders, acuity triage, ambulance dispatch, and arrival handoffs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                {hospitalIncidents.length} Records
              </span>

              {hospitalIncidents.length > 0 && (
                <>
                  <button
                    onClick={() => downloadAllHistoryPDF(hospitalIncidents, state, 'Hospital-Trauma-Center')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export All (.pdf)</span>
                  </button>

                  <button
                    onClick={() => downloadAllHistoryReport(hospitalIncidents, state, 'Hospital-Trauma-Center')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>.txt</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {hospitalIncidents.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-400 space-y-2">
              <Building2 size={40} className="mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No emergency admissions logged yet.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Completed patient transfers coordinated with this hospital will be permanently recorded here with multi-node timing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {hospitalIncidents.map((inc: Incident) => (
                <IncidentLifecycleHistory
                  key={inc.id}
                  incident={inc}
                  state={state}
                  currentRole="HOSPITAL"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
