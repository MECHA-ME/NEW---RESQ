import React from 'react';
import { IncidentStatus } from '../types';
import { Navigation, MapPin, Truck, Hospital, Radio, CheckCircle2, AlertTriangle, Clock, Check } from 'lucide-react';

interface StatusConfig {
  label: string;
  sublabel?: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  icon: React.ElementType;
  pulse?: boolean;
}

const statusMap: Record<IncidentStatus, StatusConfig> = {
  CREATED: {
    label: 'Alert Dispatched',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-200',
    dotClass: 'bg-slate-400',
    icon: Clock,
    pulse: false,
  },
  NOTIFIED: {
    label: 'Units Alerted',
    sublabel: 'Searching responders',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200',
    dotClass: 'bg-amber-500',
    icon: Radio,
    pulse: true,
  },
  AUTO_ESCALATION_STARTED: {
    label: 'Escalated to 108',
    sublabel: 'Government EMS fallback',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    dotClass: 'bg-rose-500',
    icon: AlertTriangle,
    pulse: true,
  },
  RESPONDER_EN_ROUTE: {
    label: 'En Route',
    sublabel: 'Heading to patient',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    dotClass: 'bg-blue-500',
    icon: Navigation,
    pulse: true,
  },
  HOSPITAL_COORDINATION: {
    label: 'Hospital Coordination',
    sublabel: 'Awaiting triage intake',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200',
    dotClass: 'bg-amber-500',
    icon: Radio,
    pulse: true,
  },
  HOSPITAL_SELECTED: {
    label: 'Hospital Assigned',
    sublabel: 'Destination locked',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
    dotClass: 'bg-sky-500',
    icon: CheckCircle2,
    pulse: false,
  },
  PATIENT_PICKED: {
    label: 'On Scene',
    sublabel: 'Patient secured',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    dotClass: 'bg-emerald-500',
    icon: MapPin,
    pulse: true,
  },
  IN_TRANSIT: {
    label: 'Transporting',
    sublabel: 'Corridor transit',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200',
    dotClass: 'bg-indigo-500',
    icon: Truck,
    pulse: true,
  },
  REACHED_DESTINATION: {
    label: 'At Hospital',
    sublabel: 'Emergency bay arrival',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    dotClass: 'bg-purple-500',
    icon: Hospital,
    pulse: true,
  },
  COMPLETED: {
    label: 'Resolved',
    sublabel: 'Mission closed',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200',
    dotClass: 'bg-emerald-500',
    icon: Check,
    pulse: false,
  },
  CANCELLED: {
    label: 'Rejected / Cancelled',
    sublabel: 'Unit declined',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-300',
    dotClass: 'bg-gray-400',
    icon: Check,
    pulse: false,
  },
};

interface StatusBadgeProps {
  status: IncidentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showSublabel?: boolean;
  className?: string;
}

export default function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  showSublabel = false,
  className = '',
}: StatusBadgeProps) {
  const config = statusMap[status as IncidentStatus] || {
    label: status.replace(/_/g, ' '),
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-200',
    dotClass: 'bg-gray-400',
    icon: Clock,
    pulse: false,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-xs sm:text-sm gap-2',
    lg: 'px-3.5 py-1.5 text-sm sm:text-base gap-2.5 font-bold',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide shadow-xs transition-all ${sizeClasses[size]} ${config.bgClass} ${config.textClass} ${config.borderClass} ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {config.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotClass}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`} />
      </span>

      {showIcon && <Icon size={iconSizes[size]} className="shrink-0" />}

      <span className="whitespace-nowrap">{config.label}</span>

      {showSublabel && config.sublabel && (
        <span className="hidden sm:inline text-xs font-normal opacity-75 pl-1 border-l border-current/20">
          {config.sublabel}
        </span>
      )}
    </span>
  );
}
