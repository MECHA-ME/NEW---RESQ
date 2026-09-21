import React, { useState, useEffect } from 'react';
import { AppState, Incident } from '../types';
import { Flame, ShieldAlert, Navigation, Clock, Download, FileText } from 'lucide-react';
import FeedbackForm from './FeedbackForm';
import StatusBadge from './StatusBadge';
import IncidentLifecycleHistory from './IncidentLifecycleHistory';
import { downloadAllHistoryReport, downloadAllHistoryPDF } from '../utils/downloadReport';

function FireAcceptanceTimer({ incident }: { incident: Incident }) {
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
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-800 text-xs font-mono font-bold rounded-md shrink-0">
      <Clock size={12} className="text-orange-600 animate-spin" style={{ animationDuration: '3s' }} />
      <span>{formatted}</span>
      <span className="text-[10px] font-sans text-orange-600 font-semibold">(2m limit)</span>
    </div>
  );
}

export default function FireRescueDashboard({ state, userId, fetchState }: any) {
  const [activeTab, setActiveTab] = useState<'missions' | 'history'>('missions');
  
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

  const availableIncidents = state.incidents.filter((i: Incident) => 
    (i.status === 'NOTIFIED' || i.status === 'AUTO_ESCALATION_STARTED') && i.type === 'FIRE_RESCUE'
  );

  const acceptIncident = async (id: string) => {
    await fetch(`/api/incidents/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responderId: userId })
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
    <div className="w-full space-y-6 pb-8">
      {/* Top Tab Switcher */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('missions')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'missions'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Flame size={16} />
            <span>{myIncident ? 'Active Mission (1)' : 'Fire Dispatch Radar'}</span>
            {availableIncidents.length > 0 && !myIncident && (
              <span className="px-1.5 py-0.2 bg-white text-amber-600 rounded-full text-[10px] font-mono font-black">
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

        <span className="text-[10px] font-mono text-amber-600 font-bold">
          🚒 FIRE &amp; HAZMAT DISPATCH UNIT
        </span>
      </div>

      {/* Mandatory Feedbacks */}
      {pendingFeedbackIncidents.map(inc => {
        const hospital = state.users.find((u: any) => u.id === inc.selectedHospitalId);
        if (!hospital) return null;
        return (
          <div key={inc.id} className="relative">
            <FeedbackForm
              incidentId={inc.id}
              fromRole="FIRE_RESCUE"
              toRole="HOSPITAL"
              fromId={userId}
              toId={hospital.id}
              targetName={hospital.name}
              onSubmit={fetchState}
            />
          </div>
        );
      })}

      {activeTab === 'missions' && (
        <>
          {myIncident ? (
            <div className="w-full space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-orange">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
                    <Flame className="text-orange-500" />
                    Active Fire/Rescue Mission
                  </h2>
                  <StatusBadge status={myIncident.status} size="lg" showSublabel />
                </div>

                {/* Mandatory Green Corridor Status */}
                <div className="p-3.5 mb-5 rounded-xl border border-emerald-400 bg-emerald-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-900 uppercase tracking-tight flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      Mandatory Green Corridor Active
                    </span>
                    <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-bold">
                      Police Notified
                    </span>
                  </div>
                  <p className="text-emerald-950 font-medium">
                    Traffic lights along response trajectory pre-empted to green for rapid fire engine passage.
                  </p>
                </div>

                <div className="p-4 bg-brand-bg rounded-2xl mb-6 border border-brand-border">
                  <p className="text-sm text-brand-muted mb-1">Ambulances Requested: {myIncident.ambulancesRequired || 0}</p>
                  <p className="text-sm text-brand-muted">Location: {myIncident.address || `${myIncident.location.lat}, ${myIncident.location.lng}`}</p>
                </div>

                <div className="space-y-4 border-t border-brand-border pt-6">
                  <h3 className="font-bold text-brand-text">Mission Progress</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => updateStatus(myIncident.id, 'IN_TRANSIT')}
                      className="min-h-[48px] py-4 rounded-xl font-semibold flex flex-col items-center justify-center gap-2 transition-colors bg-brand-blue hover:opacity-90 text-white"
                    >
                      <Navigation size={24} />
                      EN ROUTE TO SCENE
                    </button>
                    
                    <button 
                      onClick={() => updateStatus(myIncident.id, 'COMPLETED')}
                      className="min-h-[48px] py-4 rounded-xl font-semibold flex flex-col items-center justify-center gap-2 transition-colors bg-brand-green hover:opacity-90 text-white"
                    >
                      <ShieldAlert size={24} />
                      RESCUE COMPLETED
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-brand-text">Nearby Fire Emergencies</h2>
                <span className="px-3 py-1 bg-green-50 text-brand-green font-bold rounded-full text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                  Available
                </span>
              </div>

              {availableIncidents.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-brand-border text-center text-brand-muted">
                  <Flame size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-lg">No active fire emergencies nearby.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableIncidents.map((inc: Incident) => (
                    <div key={inc.id} className="bg-white p-6 rounded-2xl border border-brand-orange shadow-sm flex flex-col items-start justify-between gap-4">
                      <div className="w-full">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-orange-100 text-brand-orange text-xs font-bold rounded uppercase">FIRE SOS</span>
                          <StatusBadge status={inc.status} size="sm" />
                          <FireAcceptanceTimer incident={inc} />
                          <span className="text-brand-muted text-sm ml-auto">{new Date(inc.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-lg font-bold text-brand-text">
                          Ambulances requested: {inc.ambulancesRequired || 0}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Reporter: {inc.callerRole === 'BYSTANDER' ? `Bystander (${inc.victimCount || 1} victims)` : 'Patient (Self)'}
                        </p>
                      </div>
                      <button 
                        onClick={() => acceptIncident(inc.id)}
                        className="w-full px-8 py-3 min-h-[48px] bg-brand-orange hover:opacity-90 text-white font-semibold rounded-xl transition-colors shrink-0"
                      >
                        ACCEPT (2m)
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <Clock size={18} className="text-amber-400" />
                <span>Fire &amp; Rescue Mission History</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Complete audit records of bystander/patient details, hazmat responses, and multi-node timestamps.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                {myIncidents.length} Records
              </span>

              {myIncidents.length > 0 && (
                <>
                  <button
                    onClick={() => downloadAllHistoryPDF(myIncidents, state, 'Fire-Rescue')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/30 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export All (.pdf)</span>
                  </button>

                  <button
                    onClick={() => downloadAllHistoryReport(myIncidents, state, 'Fire-Rescue')}
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
              <p className="text-sm font-semibold text-gray-700">No past fire rescue missions recorded.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myIncidents.map((inc: Incident) => (
                <IncidentLifecycleHistory
                  key={inc.id}
                  incident={inc}
                  state={state}
                  currentRole="FIRE_RESCUE"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
