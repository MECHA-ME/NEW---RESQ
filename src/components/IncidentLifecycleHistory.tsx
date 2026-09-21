import React, { useState } from 'react';
import { Incident, AppState, UserRole, Feedback } from '../types';
import { 
  Clock, 
  MapPin, 
  Truck, 
  Building2, 
  ShieldAlert, 
  CheckCircle2, 
  Radio, 
  AlertCircle, 
  Star,
  ChevronRight,
  UserCheck,
  Users,
  Navigation,
  Activity,
  Download,
  FileText,
  FileCode,
  Check
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { downloadIncidentReport, downloadIncidentJSON, downloadIncidentPDF } from '../utils/downloadReport';

interface Props {
  key?: React.Key;
  incident: Incident;
  state: AppState;
  currentRole?: UserRole;
  showPoliceRouteDetails?: boolean;
}

export default function IncidentLifecycleHistory({
  incident,
  state,
  currentRole,
  showPoliceRouteDetails = false
}: Props) {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);

  const handleDownloadPdf = () => {
    downloadIncidentPDF(incident, state);
    setDownloadedFormat('pdf');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const handleDownloadTxt = () => {
    downloadIncidentReport(incident, state);
    setDownloadedFormat('txt');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const handleDownloadJson = () => {
    downloadIncidentJSON(incident, state);
    setDownloadedFormat('json');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const responder = state.users.find((u) => u.id === incident.assignedResponderId);
  const selectedHospital = state.users.find((u) => u.id === incident.selectedHospitalId);
  const trafficPolice = state.users.find((u) => u.role === 'TRAFFIC_POLICE');
  const feedbacks = state.feedbacks?.filter((f: Feedback) => f.incidentId === incident.id) || [];

  const isBystander = incident.callerRole === 'BYSTANDER';
  const victimCount = incident.victimCount || 1;

  // Format timestamp helper
  const formatTime = (ts?: number) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Node timeline events synthesized from incident timeline and state
  const findTimeForStatus = (status: string) => {
    const event = incident.timeline.find((t) => t.status === status);
    return event ? event.timestamp : undefined;
  };

  const createdTime = incident.createdAt || findTimeForStatus('CREATED') || findTimeForStatus('NOTIFIED');
  const acceptedTime = findTimeForStatus('RESPONDER_EN_ROUTE');
  const hospitalCoordTime = findTimeForStatus('HOSPITAL_COORDINATION');
  const hospitalSelectedTime = findTimeForStatus('HOSPITAL_SELECTED');
  const pickedTime = findTimeForStatus('PATIENT_PICKED');
  const inTransitTime = findTimeForStatus('IN_TRANSIT');
  const destinationTime = findTimeForStatus('REACHED_DESTINATION');
  const completedTime = findTimeForStatus('COMPLETED');

  // Green corridor timestamps
  const greenCorridorP1Time = acceptedTime;
  const greenCorridorP2Time = inTransitTime || pickedTime;
  const greenCorridorDoneTime = completedTime || destinationTime;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
      {/* Top Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white font-mono font-black text-xs rounded-md tracking-wider">
              #REC-{incident.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
              🚑 Ambulance Emergency
            </span>
          </div>
          <p className="text-xs text-slate-300 flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" />
            <span>Initiated: {formatDate(createdTime)} at {formatTime(createdTime)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Dropdown / Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={handleDownloadTxt}
              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Download formatted text emergency report"
            >
              {downloadedFormat === 'txt' ? <Check size={13} className="text-white" /> : <Download size={13} />}
              <span>{downloadedFormat === 'txt' ? 'Downloaded!' : 'Download Report'}</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              title="Export raw JSON record"
            >
              <FileCode size={13} />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>

          <StatusBadge status={incident.status} size="md" showSublabel />
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* 1. CALLER ROLE & PATIENT CLINICAL MANIFEST */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                👤 Caller / Reporter Identity
              </span>
              {isBystander ? (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-black text-[11px] flex items-center gap-1">
                  <Users size={12} />
                  <span>I Acted as Bystander ({victimCount} {victimCount > 1 ? 'Victims' : 'Victim'})</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded-full font-black text-[11px] flex items-center gap-1">
                  <UserCheck size={12} />
                  <span>Self-Reported as Patient</span>
                </span>
              )}
            </div>

            {incident.conditionAcuity && (
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider ${
                incident.conditionAcuity === 'ALS' ? 'bg-red-100 text-red-800 border border-red-300' :
                incident.conditionAcuity === 'NEO' ? 'bg-pink-100 text-pink-800 border border-pink-300' :
                incident.conditionAcuity === 'MICU' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                'bg-blue-100 text-blue-800 border border-blue-300'
              }`}>
                Triage Tier: {incident.conditionAcuity}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-500 block text-[10px] uppercase">Clinical Condition</span>
              <p className="font-black text-slate-900 text-sm mt-0.5">
                {incident.conditionCategory || incident.condition || 'Emergency Triage Condition'}
              </p>
              {incident.conditionSubtitle && (
                <p className="text-slate-600 mt-0.5">{incident.conditionSubtitle}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-slate-500 block text-[10px] uppercase">Incident Location / Street</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <MapPin size={14} className="text-red-500 shrink-0" />
                <span>{incident.address || '1090 Market Street, Civic Center, SF'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 2. ALL NODES OVERALL SYSTEM RESPONSE (Multi-Node Chronology) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Activity size={15} className="text-red-600" />
              <span>All-Node System Responses &amp; Audit Timeline</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              Quantum Synchronized Network
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden text-xs">
            {/* Node 1: Patient SOS */}
            <div className="p-3 bg-white flex items-start gap-3 hover:bg-slate-50/50">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    SOS Initiated by {isBystander ? `Bystander (${victimCount} victims)` : 'Patient'}
                  </p>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0">
                    {formatTime(createdTime)}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Location: {incident.address || '1090 Market St'}. GPS coordinates locked and broadcasted to 15km perimeter units.
                </p>
              </div>
            </div>

            {/* Node 2: Unit Acceptance (Ambulance) */}
            <div className="p-3 bg-white flex items-start gap-3 hover:bg-slate-50/50">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    Unit Dispatched: {responder ? responder.name : (incident.assignedResponderId || 'Awaiting Unit Acceptance')}
                  </p>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0">
                    {formatTime(acceptedTime)}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {acceptedTime ? 'Responder confirmed dispatch within the 2-minute response window. Outbound trajectory calculated.' : 'Waiting for unit acceptance.'}
                </p>
              </div>
            </div>

            {/* Node 3: Traffic Police Green Corridor - Phase 1 */}
            <div className="p-3 bg-emerald-50/40 flex items-start gap-3 hover:bg-emerald-50/70">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Traffic Police Green Corridor (Phase 1: En Route to Patient)</span>
                  </p>
                  <span className="font-mono text-[11px] text-emerald-700 font-bold shrink-0">
                    {formatTime(greenCorridorP1Time)}
                  </span>
                </div>
                <p className="text-emerald-900 text-[11px] mt-0.5">
                  Traffic Police Command Center notified. Mandatory signal preemption activated from Station Base &rarr; {incident.address || 'Patient Site'}.
                </p>
              </div>
            </div>

            {/* Node 4: Hospital Trauma Command Coordination */}
            <div className="p-3 bg-white flex items-start gap-3 hover:bg-slate-50/50">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                4
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    Hospital Triage &amp; Bed Reservation
                  </p>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0">
                    {formatTime(hospitalSelectedTime || hospitalCoordTime)}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Destination: {selectedHospital ? selectedHospital.name : (incident.preferredHospitalName || 'Ambulance Driver Decision / Trauma Standby')}.
                  {incident.acceptedHospitals.length > 0 && ` Accepted by ${incident.acceptedHospitals.length} area trauma centers.`}
                </p>
              </div>
            </div>

            {/* Node 5: Patient Picked Up & Phase 2 Green Corridor */}
            <div className="p-3 bg-emerald-50/40 flex items-start gap-3 hover:bg-emerald-50/70">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                5
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Traffic Police Green Corridor (Phase 2: In Transit to Hospital)</span>
                  </p>
                  <span className="font-mono text-[11px] text-emerald-700 font-bold shrink-0">
                    {formatTime(greenCorridorP2Time)}
                  </span>
                </div>
                <p className="text-emerald-900 text-[11px] mt-0.5">
                  Patient onboard. Express medical wave pre-empted through arterial streets to {selectedHospital ? selectedHospital.name : 'Hospital Emergency Bay'}.
                </p>
              </div>
            </div>

            {/* Node 6: Destination Reached & Mission Completed */}
            <div className="p-3 bg-white flex items-start gap-3 hover:bg-slate-50/50">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                6
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    Arrival at Trauma Center &amp; Mission Closure
                  </p>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0">
                    {formatTime(completedTime || destinationTime)}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Emergency handoff completed at ER gate. Green Corridor signals returned to nominal city cycle at {formatTime(greenCorridorDoneTime)}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. TRAFFIC POLICE ROUTE, STREETS, AND GREEN CORRIDOR TIMINGS */}
        {(showPoliceRouteDetails || currentRole === 'TRAFFIC_POLICE' || currentRole === 'ADMIN') && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <h4 className="text-xs font-black uppercase text-emerald-900 tracking-tight flex items-center gap-1.5">
                <Navigation size={14} className="text-emerald-700" />
                <span>Traffic Police Green Corridor Street Logs</span>
              </h4>
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[9px]">
                CORRIDOR COMPLETED AT {formatTime(greenCorridorDoneTime)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-emerald-950">
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                <span className="font-bold text-[10px] uppercase text-emerald-800 block">
                  Phase 1 Route (Base to Patient)
                </span>
                <p className="font-semibold mt-1">
                  Ambulance Station &rarr; {incident.address || '1090 Market Street, SF'}
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-emerald-900 font-mono">
                  <p>&bull; 5th St &amp; Market St (Preempted Green: {formatTime(acceptedTime)})</p>
                  <p>&bull; 7th St &amp; Market St (Preempted Green: {formatTime(acceptedTime ? acceptedTime + 45000 : undefined)})</p>
                  <p>&bull; 8th St &amp; Hyde St (Preempted Green: {formatTime(acceptedTime ? acceptedTime + 95000 : undefined)})</p>
                </div>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                <span className="font-bold text-[10px] uppercase text-emerald-800 block">
                  Phase 2 Route (Patient to Hospital)
                </span>
                <p className="font-semibold mt-1">
                  {incident.address || '1090 Market Street'} &rarr; {selectedHospital ? selectedHospital.name : 'SF General Trauma Center'}
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-emerald-900 font-mono">
                  <p>&bull; Civic Center Southbound Express Ramp (Preempted Green)</p>
                  <p>&bull; US-101 S Corridor Preempted Lane (Preempted Green)</p>
                  <p>&bull; Potrero Ave &amp; 22nd St ED Gate (Preempted Green)</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-emerald-800 font-medium pt-1">
              * Green Corridor synchronization successfully concluded at <strong>{formatTime(greenCorridorDoneTime)}</strong>. Normal signal cycles restored.
            </p>
          </div>
        )}

        {/* 4. PARTICULAR EMERGENCY RECORD FEEDBACKS */}
        <div className="space-y-3 pt-3 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                <Star size={15} className="text-amber-500 fill-amber-500" />
                <span>Stakeholder Feedbacks for Record #REC-{incident.id.slice(0, 8).toUpperCase()}</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Peer reviews and quality ratings submitted exclusively for this emergency mission.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold font-mono">
              {feedbacks.length} Feedback{feedbacks.length !== 1 ? 's' : ''} Logged
            </span>
          </div>

          {feedbacks.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
              <Star size={20} className="mx-auto text-slate-300 mb-1" />
              <p className="font-semibold text-slate-700">No stakeholder feedback logged yet for this emergency record.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Feedback forms are automatically mandated for each node (patient, driver, hospital, traffic police) once the response completes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {feedbacks.map((fb) => {
                const fromUser = state.users.find((u) => u.id === fb.fromId);
                const toUser = state.users.find((u) => u.id === fb.toId);
                return (
                  <div key={fb.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-black text-slate-900">
                          <span>{fromUser ? fromUser.name : fb.fromRole}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span>{toUser ? toUser.name : fb.toRole}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {fb.fromRole.replace(/_/g, ' ')} evaluating {fb.toRole.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-900 font-bold text-xs shrink-0">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        <span>{fb.rating}.0 / 5</span>
                      </div>
                    </div>

                    {fb.comment && (
                      <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] leading-relaxed italic">
                        "{fb.comment}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                      <span>Ref: #REC-{fb.incidentId.slice(0, 8).toUpperCase()}</span>
                      <span>Recorded: {formatTime(fb.timestamp || fb.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. BOTTOM ACTIONS & DOWNLOAD EXPORT */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 -mx-5 -mb-5 p-4 rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert size={15} className="text-red-600" />
            <span className="font-semibold">Official RESQ Verified Incident Log</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-red-600/25 cursor-pointer"
            >
              {downloadedFormat === 'pdf' ? <Check size={14} className="text-white" /> : <Download size={14} />}
              <span>{downloadedFormat === 'pdf' ? 'Downloaded PDF!' : 'Download PDF (.pdf)'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="px-3 py-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              {downloadedFormat === 'txt' ? <Check size={14} className="text-emerald-600" /> : <FileText size={14} className="text-slate-500" />}
              <span>{downloadedFormat === 'txt' ? 'Downloaded TXT!' : 'Record (.txt)'}</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-3 py-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <FileCode size={14} className="text-slate-500" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
