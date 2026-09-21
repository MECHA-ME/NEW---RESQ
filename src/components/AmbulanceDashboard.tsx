import React, { useState, useEffect } from 'react';
import { AppState, Incident, User } from '../types';
import { Truck, MapPin, CheckCircle, Navigation, Clock, Radio, Bot, Download, FileText } from 'lucide-react';
import FeedbackForm from './FeedbackForm';
import StatusBadge from './StatusBadge';
import IncidentLifecycleHistory from './IncidentLifecycleHistory';
import LiveEmergencyMap from './LiveEmergencyMap';
import QaresFlowchartPipeline from './QaresFlowchartPipeline';
import { downloadAllHistoryReport, downloadAllHistoryPDF } from '../utils/downloadReport';

function DriverAcceptanceTimer({ incident }: { incident: Incident }) {
  const [seconds, setSeconds] = useState(() => {
    const deadline = incident.acceptanceDeadline || (incident.createdAt + 120000);
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const deadline = incident.acceptanceDeadline || (incident.createdAt + 120000);
      setSeconds(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [incident]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-mono font-bold rounded-lg shrink-0">
      <Clock size={13} className="text-red-600 animate-spin" style={{ animationDuration: '3s' }} />
      <span>{formatted}</span>
      <span className="text-[10px] font-sans text-red-500 font-semibold">(2m limit)</span>
    </div>
  );
}

export default function AmbulanceDashboard({ state, userId, fetchState }: any) {
  const me = state.users.find((u: User) => u.id === userId);
  const [activeTab, setActiveTab] = useState<'missions' | 'history'>('missions');
  
  // Find my active incident
  const myIncident = state.incidents.find((i: Incident) => 
    i.assignedResponderId === userId && 
    !['COMPLETED', 'CANCELLED'].includes(i.status)
  );

  const myIncidents = state.incidents.filter((i: Incident) => i.assignedResponderId === userId);
  
  // Mandatory feedback for all completed incidents without skip
  const pendingFeedbackIncidents = myIncidents.filter((i: Incident) => 
    i.status === 'COMPLETED' && 
    i.selectedHospitalId &&
    !state.feedbacks?.some((f: any) => f.incidentId === i.id && f.fromId === userId)
  );

  // If no active incident, show available ones
  const availableIncidents = state.incidents.filter((i: Incident) => 
    (i.status === 'NOTIFIED' || i.status === 'AUTO_ESCALATION_STARTED') && i.type === 'AMBULANCE'
  );

  const acceptIncident = async (id: string) => {
    await fetch(`/api/incidents/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responderId: userId })
    });
    fetchState();
  };

  // Keypad (button-phone) SOS can be ACCEPTED or REJECTED (step 8 of keypad flow).
  // After ACCEPT the exact standard driver → hospital → traffic flow takes over.
  const rejectIncident = async (id: string) => {
    await fetch(`/api/incidents/${id}/keypad-reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responderId: userId, reason: 'Unit unavailable' })
    });
    fetchState();
  };

  const distKm = (inc: Incident) => {
    try {
      const a = (me as any)?.location;
      const b = (inc as any)?.location;
      if (!a || !b) return null;
      const R = 6371;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    } catch (e) {
      return null;
    }
  };

  const requestHospitals = async (id: string) => {
    await fetch(`/api/incidents/${id}/hospital-request`, { method: 'POST' });
    fetchState();
  };

  // Driver locks the destination via "Select & Route" — ambulance starts transit
  // to the chosen hospital only AFTER this choice (Step 2 → Step 4 → Step 3).
  const selectHospital = async (incidentId: string, hospitalId: string) => {
    await fetch(`/api/incidents/${incidentId}/hospital-select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalId })
    });
    await fetch(`/api/incidents/${incidentId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_TRANSIT' })
    });
    fetchState();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/incidents/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchState();
  };

  return (
    <div className="w-full space-y-5 pb-8">
      {/* Top Tab Bar: Missions vs History */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('missions')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'missions'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Truck size={16} />
            <span>{myIncident ? 'Active Mission (1)' : 'Dispatch Radar'}</span>
            {availableIncidents.length > 0 && !myIncident && (
              <span className="px-1.5 py-0.2 bg-white text-red-600 rounded-full text-[10px] font-mono font-black">
                {availableIncidents.length}
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
            <span>Emergency History</span>
            <span className="px-1.5 py-0.2 bg-slate-700 text-white rounded-full text-[10px] font-mono font-black">
              {myIncidents.length}
            </span>
          </button>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-gray-500 block">{me?.name || 'Ambulance Unit'}</span>
          <span className="text-[9px] font-mono text-emerald-600 font-bold">● CONNECTED TO GPS</span>
        </div>
      </div>

      {/* Mandatory Feedbacks if any completed */}
      {pendingFeedbackIncidents.map(inc => {
        const hospital = state.users.find((u: any) => u.id === inc.selectedHospitalId);
        if (!hospital) return null;
        return (
          <div key={inc.id} className="relative">
            <FeedbackForm
              incidentId={inc.id}
              fromRole="AMBULANCE_DRIVER"
              toRole="HOSPITAL"
              fromId={userId}
              toId={hospital.id}
              targetName={hospital.name}
              onSubmit={fetchState}
            />
          </div>
        );
      })}

      {/* TAB 1: MISSIONS */}
      {activeTab === 'missions' && (
        <>
          {myIncident ? (
            <ActiveMissionView 
              incident={myIncident} 
              state={state} 
              requestHospitals={() => requestHospitals(myIncident.id)}
              selectHospital={(hId: string) => selectHospital(myIncident.id, hId)}
              updateStatus={(s: string) => updateStatus(myIncident.id, s)}
            />
          ) : (
            <div className="w-full space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-brand-text">Nearby Emergencies (15km)</h2>
                <span className="px-3 py-1 bg-green-50 text-brand-green font-bold rounded-full text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                  Available for Dispatch
                </span>
              </div>

              {availableIncidents.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-brand-border text-center text-brand-muted">
                  <Truck size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-base font-semibold">No active emergencies nearby.</p>
                  <p className="text-xs text-gray-400 mt-1">Standby mode engaged. Quantum GPS will alert you immediately upon SOS broadcast.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableIncidents.map((inc: Incident) => (
                    <div key={inc.id} className="bg-white p-6 rounded-2xl shadow-sm border border-brand-border space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-gray-400">
                            {(inc as any).sosNumber ? `#SOS-${(inc as any).sosNumber}` : `#REC-${inc.id.slice(0, 8).toUpperCase()}`}
                          </span>
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-black">
                            {inc.type} SOS
                          </span>
                          {(inc as any).source === 'KEYPAD_PHONE' && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-black">
                              📟 KEYPAD PHONE {(inc as any).keypadSos?.sosType === 'HIGH_EMERGENCY' ? '• HIGH EMERGENCY' : '• EMERGENCY'}
                            </span>
                          )}
                        </div>
                        <DriverAcceptanceTimer incident={inc} />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 text-sm">
                            {inc.conditionCategory || inc.condition || 'Emergency Condition'}
                          </span>
                          {inc.conditionAcuity && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-black text-[10px]">
                              {inc.conditionAcuity}
                            </span>
                          )}
                        </div>
                        {inc.conditionSubtitle && (
                          <p className="text-slate-600">{inc.conditionSubtitle}</p>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-700 pt-1">
                          <MapPin size={14} className="text-red-500 shrink-0" />
                          <span>{inc.address || '1090 Market Street, SF'}</span>
                        </div>
                        <div className="text-[11px] text-blue-700 font-semibold">
                          Reporter: {(inc as any).source === 'KEYPAD_PHONE'
                            ? `Button-phone user (${(inc as any).keypadSos?.ownerName || 'Keypad'} • ${(inc as any).keypadSos?.channel || 'SMS'} • ${(inc as any).keypadSos?.locationSource || 'CELL'} location)`
                            : inc.callerRole === 'BYSTANDER' ? `Bystander (${inc.victimCount || 1} victims)` : 'Patient (Self-reported)'}
                        </div>
                        {(inc as any).source === 'KEYPAD_PHONE' && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 pt-1 border-t border-slate-200/70">
                            <MapPin size={13} className="text-emerald-600 shrink-0" />
                            <span>Location: Available{distKm(inc) != null ? ` • Distance: ${(distKm(inc) as number).toFixed(1)} km` : ''}</span>
                          </div>
                        )}
                      </div>

                      {(inc as any).source === 'KEYPAD_PHONE' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => acceptIncident(inc.id)}
                            className="px-4 py-3.5 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm tracking-wide rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <span>[ ACCEPT ]</span>
                          </button>
                          <button
                            onClick={() => rejectIncident(inc.id)}
                            className="px-4 py-3.5 min-h-[48px] bg-white hover:bg-red-50 active:scale-[0.99] text-red-600 border-2 border-red-300 font-black text-sm tracking-wide rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                          >
                            <span>[ REJECT ]</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => acceptIncident(inc.id)}
                          className="w-full px-6 py-3.5 min-h-[48px] bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-black text-sm tracking-wide rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <span>ACCEPT DISPATCH &amp; RESPOND &bull; ⚡ ACTIVATES GREEN CORRIDOR</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <Clock size={18} className="text-red-400" />
                <span>Ambulance Mission History &amp; Multi-Node Responses</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Complete audit records of patient/bystander details, hospital coordination, green corridor timestamps, and arrival handoffs.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                {myIncidents.length} Records
              </span>

              {myIncidents.length > 0 && (
                <>
                  <button
                    onClick={() => downloadAllHistoryPDF(myIncidents, state, 'Ambulance-Unit')}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-red-600/30 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export All (.pdf)</span>
                  </button>

                  <button
                    onClick={() => downloadAllHistoryReport(myIncidents, state, 'Ambulance-Unit')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>.txt</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {myIncidents.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-400 space-y-2">
              <Clock size={40} className="mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No past emergency missions recorded.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Completed missions will be cataloged here with full patient triage, hospital bed allocation, and green corridor timestamps.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myIncidents.map((inc: Incident) => (
                <IncidentLifecycleHistory
                  key={inc.id}
                  incident={inc}
                  state={state}
                  currentRole="AMBULANCE_DRIVER"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActiveMissionView({ incident, state, requestHospitals, selectHospital, updateStatus }: any) {
  const triageSent = (incident.notifiedHospitals?.length || 0) > 0;
  const needsHospitals = incident.status === 'RESPONDER_EN_ROUTE' && !triageSent;
  // Strict order: triage SOS first, then the driver may pick the patient
  // (en route, triage sent awaiting replies, or hospital already chosen)
  const canPickup = triageSent && ['RESPONDER_EN_ROUTE', 'HOSPITAL_COORDINATION', 'HOSPITAL_SELECTED'].includes(incident.status);
  // Hospital Select & Route unlocks only after the patient is picked (Step 2 → Step 4)
  const tlHas = (s: string) => (incident.timeline || []).some((t: any) => t.status === s);
  const pickedDone = tlHas('PATIENT_PICKED') || ['PATIENT_PICKED', 'IN_TRANSIT', 'REACHED_DESTINATION', 'COMPLETED'].includes(incident.status);
  // Reached Hospital unlocks only after the driver chose a destination via
  // Select & Route (Step 4 → Step 3) — never with an unselected destination.
  const canReach = !!incident.selectedHospitalId &&
    (incident.status === 'PATIENT_PICKED' || incident.status === 'IN_TRANSIT');

  const hospitalList = state.users.filter((u: User) => u.role === 'HOSPITAL');
  const acceptedHospitalsData = hospitalList.filter((h: User) => incident.acceptedHospitals.includes(h.id));

  return (
    <div className="w-full space-y-6">
      {/* Q-ARES Project Flowchart Synchronisation Engine Bar */}
      <QaresFlowchartPipeline incident={incident} defaultExpanded={false} />

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-blue">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Navigation className="text-blue-500" />
            Active Mission
          </h2>
          <StatusBadge status={incident.status} size="lg" showSublabel />
        </div>

        {/* MANDATORY GREEN CORRIDOR BANNER (Situation 1: Driver -> Patient, Situation 2: Patient -> Hospital) */}
        <div className="p-4 mb-4 rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-tight text-emerald-950">
                {incident.status === 'IN_TRANSIT' || incident.status === 'PATIENT_PICKED'
                  ? 'SITUATION 2: MANDATORY GREEN CORRIDOR (HOSPITAL TRANSIT)'
                  : 'SITUATION 1: MANDATORY GREEN CORRIDOR (OUTBOUND TO PATIENT)'}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-wider">
              POLICE NOTIFIED
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-emerald-900 font-semibold pt-1 border-t border-emerald-200/80">
            <div className="flex items-center gap-1.5">
              <Radio size={14} className="text-emerald-700 animate-pulse shrink-0" />
              <span className="truncate">
                {incident.status === 'IN_TRANSIT' || incident.status === 'PATIENT_PICKED'
                  ? `Corridor: Patient Site ➔ ${state.users.find((u: any) => u.id === incident.selectedHospitalId)?.name || 'Emergency Trauma Bay'}`
                  : `Corridor: Station Base ➔ ${incident.address || 'Patient Location'}`}
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-800 font-black shrink-0">
              Signals 🟢 Green Wave
            </span>
          </div>
        </div>

        {/* Live GPS Navigation Map for Driver */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Navigation size={15} className="text-blue-600" />
              <span className="text-xs font-black uppercase text-gray-900 tracking-wide">
                Live GPS Dispatch Navigation &amp; Turn-by-Turn Route
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              LIVE TELEMETRY
            </span>
          </div>

          <p className="text-[11px] text-gray-500">
            {incident.status === 'IN_TRANSIT' || incident.status === 'PATIENT_PICKED'
              ? 'Phase 2 Navigation: Proceed to selected emergency trauma bay with preempted corridor signals.'
              : 'Phase 1 Navigation: Outbound transit to patient pickup address with preempted green corridor.'}
          </p>

          <LiveEmergencyMap
            incident={incident}
            role="AMBULANCE_DRIVER"
            users={state.users}
            height="290px"
          />
        </div>

        <div className="p-5 bg-slate-50 rounded-2xl mb-6 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <span>🩺</span>
              <span>Patient Triage &amp; Clinical Manifest</span>
            </h3>
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

          <div className="space-y-1">
            <p className="text-sm font-black text-slate-900">
              {incident.conditionCategory || incident.condition || 'Emergency Triage'}
            </p>
            {incident.conditionSubtitle && (
              <p className="text-xs text-slate-600">{incident.conditionSubtitle}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-red-500 shrink-0" />
              <span className="truncate">
                <strong>Address: </strong>{incident.address || '1090 Market Street, SF'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 font-bold shrink-0">👤</span>
              <span className="truncate">
                <strong>Caller: </strong>
                {incident.callerRole === 'PATIENT' ? 'Patient (Self)' : `Bystander (${incident.victimCount || 1} victims)`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 col-span-full pt-1 border-t border-slate-200/60">
              <span className="text-emerald-600 font-bold shrink-0">🏥</span>
              <span className="truncate">
                <strong>Hospital Preference: </strong>
                {incident.hospitalPreference === 'PREFERRED_HOSPITAL' && incident.preferredHospitalName
                  ? `Patient Requested: ${incident.preferredHospitalName}`
                  : 'Ambulance Driver Decision (Dynamic Routing by ER/ICU availability)'}
              </span>
            </div>
          </div>
        </div>

        {/* DRIVER ACTION SEQUENCE — fixed order */}
        <div className="space-y-4 mt-6 border-t border-brand-border pt-6">
          <h3 className="font-bold text-brand-text">Mission Progress</h3>

          {/* STEP 1: SEND TRIAGE SOS TO HOSPITALS (25km) — first tap after accepting */}
          {triageSent ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs font-bold text-blue-800">
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-black tracking-wider shrink-0">STEP 1 ✓</span>
              <span>Triage SOS transmitted to {incident.notifiedHospitals.length} hospital{incident.notifiedHospitals.length === 1 ? '' : 's'} (25km)</span>
            </div>
          ) : needsHospitals ? (
            <div className="text-center p-6 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-black tracking-wider mb-2">STEP 1</span>
                <h4 className="text-sm font-black text-blue-900">Transmit Clinical Triage to Area Trauma Centers</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Transmits condition ({incident.conditionCategory || incident.condition || 'Emergency'}), acuity, and vital needs to all available hospitals (25km) to reserve an intake bay.
                </p>
              </div>
              <button
                onClick={requestHospitals}
                className="px-6 py-3.5 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm tracking-wide rounded-xl transition-all shadow-md inline-flex items-center gap-2"
              >
                <span>🚨 SEND TRIAGE SOS TO HOSPITALS (25km)</span>
              </button>
            </div>
          ) : null}

          {/* STEP 2: PATIENT PICKED */}
          <div>
            <span className="inline-block px-2.5 py-0.5 bg-brand-blue text-white rounded-full text-[10px] font-black tracking-wider mb-2">STEP 2</span>
            {pickedDone ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs font-bold text-blue-800">
                <span className="px-2 py-0.5 bg-brand-blue text-white rounded-full text-[10px] font-black tracking-wider shrink-0">STEP 2 ✓</span>
                <span>Patient on board — choose destination (Step 4)</span>
              </div>
            ) : (
              <>
                <button
                  disabled={!canPickup}
                  onClick={() => {
                    // Stay on PATIENT_PICKED so the driver must choose
                    // Select & Route (Step 4) before transit begins.
                    updateStatus('PATIENT_PICKED');
                  }}
                  className={`w-full min-h-[48px] py-4 rounded-xl font-semibold flex flex-col items-center justify-center gap-2 transition-colors ${canPickup ? 'bg-brand-blue hover:opacity-90 text-white' : 'bg-gray-100 text-gray-400 border border-brand-border'}`}
                >
                  <CheckCircle size={24} />
                  PATIENT PICKED
                </button>
                {!canPickup && (
                  <p className="text-[11px] text-gray-400 mt-1.5 text-center">Complete Step 1 (triage SOS) first — then tap when the patient is on board.</p>
                )}
              </>
            )}
          </div>

          {/* STEP 3: REACHED HOSPITAL */}
          <div>
            <span className="inline-block px-2.5 py-0.5 bg-brand-green text-white rounded-full text-[10px] font-black tracking-wider mb-2">STEP 3</span>
            <button
              disabled={!canReach}
              onClick={() => {
                updateStatus('REACHED_DESTINATION');
                setTimeout(() => updateStatus('COMPLETED'), 2000);
              }}
              className={`w-full min-h-[48px] py-4 rounded-xl font-semibold flex flex-col items-center justify-center gap-2 transition-colors ${canReach ? 'bg-brand-green hover:opacity-90 text-white' : 'bg-gray-100 text-gray-400 border border-brand-border'}`}
            >
              <MapPin size={24} />
              REACHED HOSPITAL
            </button>
            {!canReach && (
              <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                {pickedDone && !incident.selectedHospitalId
                  ? '🔒 Choose Select & Route for a hospital (Step 4) first — then tap on arrival at the hospital gate.'
                  : 'Available after Step 2 — tap on arrival at the hospital gate.'}
              </p>
            )}
          </div>

          {/* STEP 4: Hospital selecting options — unlocked only after Patient Picked */}
          {incident.notifiedHospitals.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-brand-text">
                <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white rounded-full text-[10px] font-black tracking-wider mr-2">STEP 4</span>
                Hospital Responses — Select Destination
              </h3>
              {!pickedDone ? (
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
                  🔒 Select & Route unlocks after Step 2 — tap PATIENT PICKED once the patient is on board.
                </p>
              ) : (
                <>
                  {acceptedHospitalsData.length === 0 && (
                    <p className="text-brand-muted animate-pulse text-sm">Waiting for hospitals to accept...</p>
                  )}

                  <div className="space-y-3">
                    {acceptedHospitalsData.map((h: User) => {
                      const isSelected = incident.selectedHospitalId === h.id;
                      return (
                        <div key={h.id} className={`p-4 border rounded-xl flex items-center justify-between ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white shadow-md' : 'border-brand-green bg-green-50'}`}>
                          <div>
                            <p className={`font-bold ${isSelected ? 'text-white' : 'text-brand-green'}`}>{h.name}</p>
                            <p className={`text-sm ${isSelected ? 'text-emerald-100' : 'text-brand-green'}`}>
                              {isSelected ? 'Destination locked — routing' : 'Ready for intake'}
                            </p>
                          </div>
                          {isSelected ? (
                            <span className="px-4 py-2 bg-white text-emerald-700 font-black rounded-xl text-sm">
                              ✓ Selected
                            </span>
                          ) : (
                            <button
                              onClick={() => selectHospital(h.id)}
                              className="px-4 py-2 min-h-[48px] bg-brand-green hover:opacity-90 text-white font-semibold rounded-xl text-sm transition-colors"
                            >
                              Select & Route
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
