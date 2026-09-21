import React, { useState } from 'react';
import { AppState, Incident, Feedback } from '../types';
import { 
  Shield, 
  RotateCcw, 
  Clock, 
  AlertCircle, 
  Star, 
  ArrowLeft, 
  ChevronRight, 
  Hash, 
  Search,
  Filter,
  Users,
  MapPin,
  Radio,
  FileText,
  Download,
  FileCode
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import IncidentLifecycleHistory from './IncidentLifecycleHistory';
import { downloadAllHistoryReport, downloadAllHistoryPDF, downloadIncidentReport, downloadIncidentPDF } from '../utils/downloadReport';

export default function AdminDashboard({ state, fetchState, onReset }: any) {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'AMBULANCE' | 'FIRE_RESCUE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredIncidents = state.incidents.filter((inc: Incident) => {
    if (filterType !== 'ALL' && inc.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const recNum = `rec-${inc.id.slice(0, 8)}`.toLowerCase();
      const addr = (inc.address || '').toLowerCase();
      const cond = (inc.condition || inc.conditionCategory || '').toLowerCase();
      return recNum.includes(q) || addr.includes(q) || cond.includes(q) || inc.id.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedIncident = state.incidents.find((i: Incident) => i.id === selectedRecordId);

  // When a record is clicked: THEN ONLY THAT PARTICULAR RECORD (EMERGENCY RESPONSE) MUST SHOW
  if (selectedIncident) {
    return (
      <div className="w-full space-y-4 pb-8 animate-in fade-in duration-200">
        {/* Drill-down Navigation Header */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => setSelectedRecordId(null)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold rounded-xl transition-all border border-slate-700 shrink-0"
          >
            <ArrowLeft size={16} />
            <span>Back to All Records</span>
          </button>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">
              Unique Record Number
            </span>
            <span className="font-mono text-sm font-black text-amber-400">
              #REC-{selectedIncident.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Detailed Single Record Emergency Response View */}
        <IncidentLifecycleHistory
          incident={selectedIncident}
          state={state}
          currentRole="ADMIN"
          showPoliceRouteDetails={true}
        />
      </div>
    );
  }

  // ALL UNIQUE NUMBER RECORDS LIST VIEW
  return (
    <div className="w-full space-y-6 pb-8">
      {/* Control Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-3xl shadow-sm border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                RESQ CONTROL CENTER
              </h2>
              <p className="text-xs text-slate-300">
                Centralized Emergency Response Dispatch &amp; Mission Records
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={onReset}
          className="px-3.5 py-2 min-h-[44px] bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-xs"
        >
          <RotateCcw size={15} />
          Reset Demo State
        </button>
      </div>

      {/* System Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Records</span>
          <span className="text-xl font-black text-gray-900 font-mono">{state.incidents.length}</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase block">Active Missions</span>
          <span className="text-xl font-black text-emerald-600 font-mono">
            {state.incidents.filter((i: any) => !['COMPLETED', 'CANCELLED'].includes(i.status)).length}
          </span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase block">Completed Runs</span>
          <span className="text-xl font-black text-blue-600 font-mono">
            {state.incidents.filter((i: any) => i.status === 'COMPLETED').length}
          </span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Green Corridors</span>
          <span className="text-xl font-black text-emerald-700 font-mono">
            {state.incidents.filter((i: any) => i.greenCorridor).length}
          </span>
        </div>
      </div>

      {/* Unique Number Records Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black uppercase text-gray-900 tracking-tight flex items-center gap-1.5">
              <Hash size={16} className="text-blue-600" />
              <span>Unique Number Emergency Records</span>
            </h3>
            <p className="text-xs text-gray-500">
              Click any unique record to open and inspect that single emergency response.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadAllHistoryPDF(filteredIncidents, state, 'Admin-Central-Archive')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Download size={13} />
              <span>Export PDF ({filteredIncidents.length})</span>
            </button>

            <button
              onClick={() => downloadAllHistoryReport(filteredIncidents, state, 'Admin-Central-Archive')}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
            >
              <FileText size={13} className="text-gray-500" />
              <span>TXT</span>
            </button>

            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  filterType === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('AMBULANCE')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  filterType === 'AMBULANCE' ? 'bg-blue-600 text-white shadow-2xs' : 'text-gray-500'
                }`}
              >
                Ambulance
              </button>
              <button
                onClick={() => setFilterType('FIRE_RESCUE')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  filterType === 'FIRE_RESCUE' ? 'bg-amber-600 text-white shadow-2xs' : 'text-gray-500'
                }`}
              >
                Fire
              </button>
            </div>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by unique record # (e.g. REC-XXXX), street, or condition..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Records Listing */}
        {filteredIncidents.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-400 space-y-2">
            <FileText size={36} className="mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No emergency records match your filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map((inc: Incident) => {
              const responder = state.users.find((u: any) => u.id === inc.assignedResponderId);
              const hospital = state.users.find((u: any) => u.id === inc.selectedHospitalId);
              const isBystander = inc.callerRole === 'BYSTANDER';
              const incFeedbacks = state.feedbacks?.filter((f: any) => f.incidentId === inc.id) || [];

              return (
                <button
                  key={inc.id}
                  onClick={() => setSelectedRecordId(inc.id)}
                  className="w-full text-left bg-white p-4 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-900 text-amber-400 rounded-md tracking-wider">
                        #REC-{inc.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        inc.type === 'AMBULANCE' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {inc.type === 'AMBULANCE' ? '🚑 Ambulance' : '🚒 Fire'}
                      </span>
                      {isBystander ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Bystander ({inc.victimCount || 1} victims)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          Patient (Self)
                        </span>
                      )}

                      {/* Feedbacks attached specifically to this record */}
                      {incFeedbacks.length > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <Star size={10} className="fill-amber-500 text-amber-500" />
                          <span>{incFeedbacks.length} Feedback{incFeedbacks.length !== 1 ? 's' : ''} in record</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200">
                          Feedback collection pending
                        </span>
                      )}
                    </div>

                    <StatusBadge status={inc.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Condition</span>
                      <p className="font-bold text-gray-900 truncate">
                        {inc.conditionCategory || inc.condition || 'Emergency Condition'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Street / Location</span>
                      <p className="font-medium text-gray-700 truncate flex items-center gap-1">
                        <MapPin size={12} className="text-red-500 shrink-0" />
                        <span>{inc.address || `${inc.location.lat.toFixed(4)}, ${inc.location.lng.toFixed(4)}`}</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer with timestamp and click invitation */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-xs">
                    <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(inc.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <span className="font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 text-xs">
                      <span>Inspect Record Audit &amp; Feedbacks</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
