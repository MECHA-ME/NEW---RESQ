import React, { useState } from 'react';
import { 
  AlertCircle, 
  MapPin, 
  Truck, 
  Flame, 
  Search, 
  Radio, 
  Clock, 
  Bot, 
  PhoneCall, 
  Cpu, 
  Zap, 
  TrafficCone, 
  Hospital as HospitalIcon, 
  Navigation, 
  CheckCircle2, 
  BarChart3, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Workflow
} from 'lucide-react';
import { Incident } from '../types';

interface QaresFlowchartPipelineProps {
  incident: Incident;
  defaultExpanded?: boolean;
}

export default function QaresFlowchartPipeline({ 
  incident, 
  defaultExpanded = false 
}: QaresFlowchartPipelineProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const isAmbulance = incident.type === 'AMBULANCE';
  const isEscalatedBranch = incident.aiDispatch?.sourceType?.includes('AUTOMATIC_CALLING_AGENT') || 
                            incident.status === 'AUTO_ESCALATION_STARTED';

  // Determine stage progression
  const getStageStatus = (stageId: string): 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'SKIPPED' => {
    const status = incident.status;

    switch (stageId) {
      case 'REPORTED':
      case 'GPS':
      case 'IDENTIFY':
      case 'SEARCH':
      case 'NOTIFY':
        return 'COMPLETED';

      case 'WAIT_ACCEPTANCE':
        if (status === 'CREATED' || status === 'NOTIFIED') return 'ACTIVE';
        return 'COMPLETED';

      case 'UNIT_ACCEPTED':
        if (isEscalatedBranch) return 'SKIPPED';
        if (status === 'CREATED' || status === 'NOTIFIED') return 'PENDING';
        return 'COMPLETED';

      case 'CALLING_AGENT':
      case 'CALL_108':
        if (!isEscalatedBranch && (status === 'RESPONDER_EN_ROUTE' || status === 'IN_TRANSIT' || status === 'COMPLETED' || status === 'PATIENT_PICKED' || status === 'REACHED_DESTINATION' || status === 'HOSPITAL_SELECTED')) {
          return 'SKIPPED';
        }
        if (status === 'AUTO_ESCALATION_STARTED') return 'ACTIVE';
        if (isEscalatedBranch) return 'COMPLETED';
        return 'PENDING';

      case 'AI_DISPATCH':
        if (status === 'AUTO_ESCALATION_STARTED') return 'PENDING';
        if (status === 'CREATED' || status === 'NOTIFIED') return 'PENDING';
        if (status === 'RESPONDER_EN_ROUTE') return 'ACTIVE';
        return 'COMPLETED';

      case 'ROUTE_QPSO':
        if (status === 'CREATED' || status === 'NOTIFIED' || status === 'AUTO_ESCALATION_STARTED') return 'PENDING';
        if (status === 'RESPONDER_EN_ROUTE') return 'ACTIVE';
        return 'COMPLETED';

      case 'GREEN_CORRIDOR':
        if (incident.greenCorridor?.status === 'ACTIVE') return 'ACTIVE';
        if (status === 'COMPLETED') return 'COMPLETED';
        if (status === 'CREATED' || status === 'NOTIFIED' || status === 'AUTO_ESCALATION_STARTED') return 'PENDING';
        return 'ACTIVE';

      case 'HOSPITAL_READINESS':
        if (status === 'HOSPITAL_COORDINATION' || status === 'HOSPITAL_SELECTED') return 'ACTIVE';
        if (status === 'PATIENT_PICKED' || status === 'IN_TRANSIT' || status === 'REACHED_DESTINATION' || status === 'COMPLETED') return 'COMPLETED';
        if (status === 'RESPONDER_EN_ROUTE') return 'ACTIVE';
        return 'PENDING';

      case 'LIVE_TRACKING':
        if (status === 'RESPONDER_EN_ROUTE' || status === 'IN_TRANSIT' || status === 'PATIENT_PICKED') return 'ACTIVE';
        if (status === 'REACHED_DESTINATION' || status === 'COMPLETED') return 'COMPLETED';
        return 'PENDING';

      case 'RESPOND_ARRIVE':
        if (status === 'PATIENT_PICKED') return 'ACTIVE';
        if (status === 'IN_TRANSIT' || status === 'REACHED_DESTINATION' || status === 'COMPLETED') return 'COMPLETED';
        return 'PENDING';

      case 'RESOLVED':
        if (status === 'REACHED_DESTINATION') return 'ACTIVE';
        if (status === 'COMPLETED') return 'COMPLETED';
        return 'PENDING';

      case 'RECORD_ANALYZE':
        if (status === 'COMPLETED') return 'ACTIVE';
        return 'PENDING';

      default:
        return 'PENDING';
    }
  };

  const getStatusBadge = (status: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'SKIPPED') => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
            <CheckCircle2 size={11} className="text-emerald-700" />
            DONE
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            IN PROGRESS
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
            BYPASSED
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
            QUEUED
          </span>
        );
    }
  };

  // Find active stage name for collapsed summary
  const stages = [
    { id: 'REPORTED', label: 'Emergency Reported' },
    { id: 'GPS', label: 'GPS Location' },
    { id: 'IDENTIFY', label: 'Identify Emergency Type' },
    { id: 'SEARCH', label: 'Search Units (15 km)' },
    { id: 'NOTIFY', label: 'Notify Nearby Units' },
    { id: 'WAIT_ACCEPTANCE', label: 'Wait Acceptance (2 Min)' },
    { id: isEscalatedBranch ? 'CALL_108' : 'UNIT_ACCEPTED', label: isEscalatedBranch ? (isAmbulance ? 'Calling Agent 108 EMS' : 'Calling Agent 101 Fire') : 'Unit Accepted' },
    { id: 'AI_DISPATCH', label: 'AI-Assisted Dispatch' },
    { id: 'ROUTE_QPSO', label: 'Route Optimization (QPSO)' },
    { id: 'GREEN_CORRIDOR', label: 'Traffic Green Corridor' },
    { id: 'HOSPITAL_READINESS', label: 'Destination Readiness Check' },
    { id: 'LIVE_TRACKING', label: 'Live Tracking' },
    { id: 'RESPOND_ARRIVE', label: 'Respond & Arrive' },
    { id: 'RESOLVED', label: 'Emergency Resolved' },
    { id: 'RECORD_ANALYZE', label: 'Record & Analyze' }
  ];

  const currentActiveStage = stages.find(s => getStageStatus(s.id) === 'ACTIVE') || 
                             stages[stages.length - 1];

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white rounded-2xl border-2 border-blue-500/40 shadow-xl overflow-hidden mb-6">
      {/* Header bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-white/5 transition-colors border-b border-white/10"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-blue-400">
            <Workflow size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-300">
                Q-ARES Emergency Synchronisation Pipeline
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">
                FLOWCHART ENGINE
              </span>
            </div>
            <p className="text-xs text-gray-300 font-semibold flex items-center gap-1.5 mt-0.5">
              <span>Current Stage:</span>
              <span className="text-emerald-400 font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {currentActiveStage.label}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {incident.aiDispatch && (
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-lg text-[10px] font-mono text-emerald-300 font-bold">
              <Zap size={12} className="text-emerald-400" />
              <span>QPSO + Green Corridor: Active</span>
            </div>
          )}
          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-gray-300 hover:text-white"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Interactive Flowchart Visualizer */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-4 bg-black/40">
          
          {/* Flowchart Tree Nodes */}
          <div className="space-y-3">

            {/* Block 1: Initial Ingestion & Scan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Emergency Reported */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center">
                    <AlertCircle size={15} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">1. Emergency Reported</div>
                    <div className="text-[9px] text-gray-400">SOS Triggered ({incident.callerRole || 'Patient'})</div>
                  </div>
                </div>
                {getStatusBadge(getStageStatus('REPORTED'))}
              </div>

              {/* 2. GPS Location */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
                    <MapPin size={15} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">2. GPS Location</div>
                    <div className="text-[9px] text-gray-400">Lat: 37.7793, Lng: -122.4162</div>
                  </div>
                </div>
                {getStatusBadge(getStageStatus('GPS'))}
              </div>

              {/* 3. Identify Emergency Type */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center">
                    {isAmbulance ? <Truck size={15} /> : <Flame size={15} />}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">3. Identify Type</div>
                    <div className="text-[9px] text-gray-400">{isAmbulance ? 'Ambulance (ALS/BLS)' : 'Fire & Rescue'}</div>
                  </div>
                </div>
                {getStatusBadge(getStageStatus('IDENTIFY'))}
              </div>
            </div>

            {/* Block 2: 15km Search & 2-Minute Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 4. Search Active Units within 15 km */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center">
                    <Search size={15} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">4. Search 15 km Radius</div>
                    <div className="text-[9px] text-gray-400">Notified nearby online units</div>
                  </div>
                </div>
                {getStatusBadge(getStageStatus('NOTIFY'))}
              </div>

              {/* 5. Wait for Unit Acceptance (2 Min Max) */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center">
                    <Clock size={15} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">5. Acceptance Window</div>
                    <div className="text-[9px] text-gray-400">Max 2 min before auto-call fallback</div>
                  </div>
                </div>
                {getStatusBadge(getStageStatus('WAIT_ACCEPTANCE'))}
              </div>
            </div>

            {/* Decision Fork: UNIT ACCEPTED? (YES vs NO) */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border-2 border-dashed border-slate-600 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black uppercase text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  Decision Node: Unit Accepted within 2 Minutes?
                </span>
                <span className="text-[10px] font-mono text-gray-300">
                  {isEscalatedBranch ? 'NO (2-Min Expiry)' : 'YES (Accepted by Unit)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Branch YES: Unit Accepted Proceeds */}
                <div className={`p-3 rounded-lg border transition-all ${
                  !isEscalatedBranch && incident.status !== 'CREATED' && incident.status !== 'NOTIFIED'
                    ? 'bg-emerald-950/60 border-emerald-500 shadow-md'
                    : isEscalatedBranch 
                      ? 'bg-white/5 border-white/10 opacity-40'
                      : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      YES: Accepted Unit Proceeds
                    </div>
                    {getStatusBadge(getStageStatus('UNIT_ACCEPTED'))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Primary driver claimed ticket directly from field dispatch.
                  </p>
                </div>

                {/* Branch NO: Automatic Calling Agent (108 / 101) */}
                <div className={`p-3 rounded-lg border transition-all ${
                  isEscalatedBranch
                    ? 'bg-red-950/70 border-red-500 shadow-md ring-1 ring-red-500/50'
                    : !isEscalatedBranch && incident.status !== 'CREATED' && incident.status !== 'NOTIFIED'
                      ? 'bg-white/5 border-white/10 opacity-40'
                      : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      NO: Automatic Calling Agent
                    </div>
                    {getStatusBadge(getStageStatus('CALL_108'))}
                  </div>
                  <div className="text-[10px] text-red-300 font-mono mt-1 flex items-center gap-1">
                    <PhoneCall size={11} />
                    <span>Dialed {isAmbulance ? '108 (Govt EMS)' : '101 (Fire & Rescue)'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Block 3: AI-Assisted Dispatch & Metaheuristics Optimization */}
            <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow">
                    <Cpu size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">AI-Assisted Dispatch &amp; Route Optimization</div>
                    <div className="text-[10px] text-blue-200 font-mono">QPSO (Quantum Particle Swarm Optimization) Metaheuristics</div>
                  </div>
                </div>
                {getStatusBadge(getStageStatus('ROUTE_QPSO'))}
              </div>

              {incident.aiDispatch && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/10 text-[10px] font-mono">
                  <div className="bg-black/40 p-1.5 rounded">
                    <span className="text-gray-400 block">Algorithm</span>
                    <span className="text-emerald-400 font-bold">QPSO-Swarm</span>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded">
                    <span className="text-gray-400 block">Compute Latency</span>
                    <span className="text-white font-bold">{incident.aiDispatch.latencyMs} ms</span>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded">
                    <span className="text-gray-400 block">Efficiency Gain</span>
                    <span className="text-emerald-400 font-bold">{incident.aiDispatch.routeEfficiencyGain}</span>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded">
                    <span className="text-gray-400 block">Assigned Unit</span>
                    <span className="text-amber-300 font-bold truncate block">{incident.aiDispatch.assignedUnitName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Block 4: Green Corridor + Hospital Destination Check */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Traffic + Green Corridor Coordination */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                    <TrafficCone size={15} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">Traffic + Green Corridor</div>
                    <div className="text-[9px] text-gray-400">Preempted signals &amp; police wave</div>
                  </div>
                </div>
                {getStatusBadge(getStageStatus('GREEN_CORRIDOR'))}
              </div>

              {/* Hospital Destination Readiness Check */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center">
                    <HospitalIcon size={15} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">Destination Readiness Check</div>
                    <div className="text-[9px] text-gray-400">ER &amp; ICU bay capacity reserved</div>
                  </div>
                </div>
                {getStatusBadge(getStageStatus('HOSPITAL_READINESS'))}
              </div>
            </div>

            {/* Block 5: Execution Stages: Live Tracking -> Arrive -> Resolved -> Audit */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Live Tracking */}
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <Navigation size={13} className="text-blue-400" />
                  {getStatusBadge(getStageStatus('LIVE_TRACKING'))}
                </div>
                <div className="text-[10px] font-bold text-white">Live Tracking</div>
                <div className="text-[8px] text-gray-400">Real-time GPS Map</div>
              </div>

              {/* Respond & Arrive */}
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <Truck size={13} className="text-amber-400" />
                  {getStatusBadge(getStageStatus('RESPOND_ARRIVE'))}
                </div>
                <div className="text-[10px] font-bold text-white">Respond &amp; Arrive</div>
                <div className="text-[8px] text-gray-400">On-scene patient triage</div>
              </div>

              {/* Emergency Resolved */}
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  {getStatusBadge(getStageStatus('RESOLVED'))}
                </div>
                <div className="text-[10px] font-bold text-white">Resolved</div>
                <div className="text-[8px] text-gray-400">Hospital handover</div>
              </div>

              {/* Record & Analyze */}
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <BarChart3 size={13} className="text-purple-400" />
                  {getStatusBadge(getStageStatus('RECORD_ANALYZE'))}
                </div>
                <div className="text-[10px] font-bold text-white">Record &amp; Analyze</div>
                <div className="text-[8px] text-gray-400">Audit &amp; PDF Report</div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
