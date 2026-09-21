import React, { useState } from 'react';
import { 
  Heart, 
  Truck, 
  Activity, 
  Wind, 
  Baby, 
  Flame, 
  Users, 
  ShieldAlert, 
  Building2, 
  Check, 
  ChevronRight, 
  ArrowLeft,
  Hospital as HospitalIcon,
  AlertCircle
} from 'lucide-react';
import { Incident, User } from '../types';

interface EmergencyCondition {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  hasRedDot?: boolean;
  subtitle: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  acuity: 'ALS' | 'BLS' | 'MICU' | 'NEO';
}

const EMERGENCY_CONDITIONS: EmergencyCondition[] = [
  {
    id: 'cardiac',
    name: 'Cardiac / Chest Pain',
    badge: 'ALS',
    hasRedDot: true,
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    subtitle: 'Heart attack symptoms, pressure...',
    icon: Heart,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-50',
    acuity: 'ALS'
  },
  {
    id: 'trauma',
    name: 'Severe Accident / Trauma',
    badge: 'ALS',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    subtitle: 'Motor vehicle, blunt force...',
    icon: Truck,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50',
    acuity: 'ALS'
  },
  {
    id: 'stroke',
    name: 'Acute Stroke (FAST)',
    badge: 'ALS',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    subtitle: 'Facial drooping, arm weakness...',
    icon: Activity,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    acuity: 'ALS'
  },
  {
    id: 'respiratory',
    name: 'Respiratory Distress',
    badge: 'ALS',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    subtitle: 'Severe asthma, choking, dyspnea...',
    icon: Wind,
    iconColor: 'text-cyan-600',
    iconBg: 'bg-cyan-50',
    acuity: 'ALS'
  },
  {
    id: 'pediatric',
    name: 'Pediatric Emergency',
    badge: 'NEO',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    subtitle: 'Infant/child acute illness...',
    icon: Baby,
    iconColor: 'text-pink-600',
    iconBg: 'bg-pink-50',
    acuity: 'NEO'
  },
  {
    id: 'burns',
    name: 'Fire & Severe Burns',
    badge: 'ALS',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    subtitle: 'Thermal, electrical or chemical...',
    icon: Flame,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50',
    acuity: 'ALS'
  },
  {
    id: 'maternal',
    name: 'Maternal / Emergency Delivery',
    badge: 'MICU',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    subtitle: 'Active labor, umbilical distress...',
    icon: Users,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
    acuity: 'MICU'
  },
  {
    id: 'general',
    name: 'General Medical Emergency',
    badge: 'BLS',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    subtitle: 'Unconscious state, high fever...',
    icon: ShieldAlert,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    acuity: 'BLS'
  }
];

interface AdditionalInfoViewProps {
  incident: Incident;
  hospitals: User[];
  onProceed: () => void;
  fetchState: () => void;
}

export default function AdditionalInfoView({
  incident,
  hospitals,
  onProceed,
  fetchState
}: AdditionalInfoViewProps) {
  const [selectedCondition, setSelectedCondition] = useState<string>(
    incident.conditionCategory || 'Cardiac / Chest Pain'
  );
  const [destinationPref, setDestinationPref] = useState<'DRIVER_DISCRETION' | 'PREFERRED_HOSPITAL'>(
    incident.hospitalPreference || 'DRIVER_DISCRETION'
  );
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    incident.preferredHospitalId || hospitals[0]?.id || ''
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const currentConditionObj = EMERGENCY_CONDITIONS.find(c => c.name === selectedCondition) || EMERGENCY_CONDITIONS[0];

  const updateServerDetails = async (
    condName: string, 
    destPref: 'DRIVER_DISCRETION' | 'PREFERRED_HOSPITAL',
    hospId?: string
  ) => {
    setIsSaving(true);
    try {
      const cond = EMERGENCY_CONDITIONS.find(c => c.name === condName) || EMERGENCY_CONDITIONS[0];
      const prefHospital = hospitals.find(h => h.id === hospId);

      await fetch(`/api/incidents/${incident.id}/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: cond.name,
          conditionCategory: cond.name,
          conditionAcuity: cond.acuity,
          conditionSubtitle: cond.subtitle,
          hospitalPreference: destPref,
          preferredHospitalId: destPref === 'PREFERRED_HOSPITAL' ? hospId : null,
          preferredHospitalName: destPref === 'PREFERRED_HOSPITAL' ? prefHospital?.name : null
        })
      });
      fetchState();
    } catch (e) {
      console.error('Failed to update incident details', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConditionSelect = (cond: EmergencyCondition) => {
    setSelectedCondition(cond.name);
    updateServerDetails(cond.name, destinationPref, selectedHospitalId);
  };

  const handleDestinationSelect = (pref: 'DRIVER_DISCRETION' | 'PREFERRED_HOSPITAL') => {
    setDestinationPref(pref);
    updateServerDetails(selectedCondition, pref, selectedHospitalId);
  };

  const handleHospitalChange = (hospId: string) => {
    setSelectedHospitalId(hospId);
    updateServerDetails(selectedCondition, 'PREFERRED_HOSPITAL', hospId);
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-300">
      {/* Top Banner: Notifying user ambulance is already dispatched */}
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span className="font-bold">Ambulance Dispatched!</span>
          <span className="text-emerald-700 hidden sm:inline">Units are en route. Provide clinical details below.</span>
        </div>
        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
          LIVE GPS ACTIVE
        </span>
      </div>

      {/* SECTION 1: 1. SELECT EMERGENCY CONDITION */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="text-red-600">
              <Heart size={18} className="fill-red-50 text-red-600 stroke-[2.2]" />
            </div>
            <h2 className="text-xs font-black text-gray-900 uppercase tracking-tight">
              1. SELECT EMERGENCY CONDITION
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-gray-500 font-medium">Current: </span>
            <span className="text-[11px] font-black text-red-600">
              {selectedCondition}
            </span>
          </div>
        </div>

        {/* 8-Card Grid (4 cols on desktop, 2 cols on mobile) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {EMERGENCY_CONDITIONS.map((c) => {
            const isSelected = selectedCondition === c.name;
            const Icon = c.icon;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleConditionSelect(c)}
                className={`p-3 rounded-2xl text-left border-2 transition-all flex flex-col justify-between min-h-[110px] relative cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? 'border-red-500 bg-red-50/20 shadow-xs ring-1 ring-red-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                {/* Header row in card: Icon + Badge */}
                <div className="flex items-start justify-between w-full mb-2">
                  <div className={`w-8 h-8 rounded-xl ${c.iconBg} ${c.iconColor} flex items-center justify-center shrink-0`}>
                    <Icon size={16} strokeWidth={2.3} />
                  </div>
                  <div className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black tracking-wider flex items-center gap-1 ${c.badgeColor}`}>
                    <span>{c.badge}</span>
                    {c.hasRedDot && <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />}
                  </div>
                </div>

                {/* Title and Subtitle */}
                <div>
                  <h3 className="text-xs font-black text-gray-900 leading-tight">
                    {c.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                    {c.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: 2. HOSPITAL DESTINATION PREFERENCE */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-600 stroke-[2.2]" />
            <h2 className="text-xs font-black text-gray-900 uppercase tracking-tight">
              2. HOSPITAL DESTINATION PREFERENCE
            </h2>
          </div>
          <span className="text-[11px] font-bold text-blue-600">
            {destinationPref === 'DRIVER_DISCRETION' ? 'EMT Discretion' : 'Preferred Receiving Hospital'}
          </span>
        </div>

        {/* 2 Preference Cards Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Card 1: Ambulance Driver Decision */}
          <button
            type="button"
            onClick={() => handleDestinationSelect('DRIVER_DISCRETION')}
            className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between relative cursor-pointer active:scale-[0.99] ${
              destinationPref === 'DRIVER_DISCRETION'
                ? 'border-blue-600 bg-blue-50/30 shadow-xs ring-1 ring-blue-600/30'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold text-xs">↪</span>
                  <h3 className="text-xs font-black text-blue-600 leading-tight">
                    Ambulance Driver Decision
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9px] font-black rounded-md tracking-wider uppercase">
                  RECOMMENDED
                </span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                EMT crew dynamically routes to the best facility with real-time ER/ICU bed availability &amp; lowest transit delay.
              </p>
            </div>

            {destinationPref === 'DRIVER_DISCRETION' && (
              <div className="self-end mt-2 text-blue-600">
                <Check size={16} className="stroke-[3]" />
              </div>
            )}
          </button>

          {/* Card 2: I Have a Preferred Hospital */}
          <div
            onClick={() => handleDestinationSelect('PREFERRED_HOSPITAL')}
            className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between relative cursor-pointer active:scale-[0.99] ${
              destinationPref === 'PREFERRED_HOSPITAL'
                ? 'border-emerald-600 bg-emerald-50/30 shadow-xs ring-1 ring-emerald-600/30'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <HospitalIcon size={14} />
                </div>
                <h3 className="text-xs font-black text-emerald-800 leading-tight">
                  I Have a Preferred Hospital
                </h3>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Designate a specific preferred receiving hospital. Ambulance crew will be instructed with your choice.
              </p>
            </div>

            {/* If Selected: Show Hospital Options dropdown */}
            {destinationPref === 'PREFERRED_HOSPITAL' && (
              <div className="mt-3 pt-2.5 border-t border-emerald-200/60 animate-in fade-in duration-150">
                <label className="text-[10px] font-bold text-gray-600 block mb-1">
                  Choose Preferred Receiving Hospital:
                </label>
                <select
                  value={selectedHospitalId}
                  onChange={(e) => handleHospitalChange(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-emerald-300 rounded-xl p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.hospitalLevel || 'Level 1'} • {h.capacity?.erBeds ?? 20} ER Beds)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BUTTON: PROCEED TO LIVE GPS TRACKING & FIRST AID GUIDE */}
      <button
        type="button"
        onClick={onProceed}
        className="w-full py-4 px-4 bg-[#cc0000] hover:bg-[#b30000] active:scale-[0.99] text-white rounded-2xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
      >
        <span className="text-white/80 text-xs">◀</span>
        <span>PROCEED TO LIVE GPS TRACKING &amp; FIRST AID GUIDE</span>
        <span className="text-white/80 text-xs">→</span>
      </button>
    </div>
  );
}
