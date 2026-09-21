export type Location = { lat: number; lng: number };

export type IncidentStatus = 
  | 'CREATED'
  | 'NOTIFIED'
  | 'AUTO_ESCALATION_STARTED'
  | 'RESPONDER_EN_ROUTE'
  | 'HOSPITAL_COORDINATION'
  | 'HOSPITAL_SELECTED'
  | 'PATIENT_PICKED'
  | 'IN_TRANSIT'
  | 'REACHED_DESTINATION'
  | 'COMPLETED';

export type UserRole = 
  | 'PATIENT'
  | 'AMBULANCE_DRIVER'
  | 'FIRE_RESCUE'
  | 'HOSPITAL'
  | 'TRAFFIC_POLICE'
  | 'ADMIN';

export interface HospitalCapacity {
  erBeds: number;
  icuBeds: number;
  ventilators: number;
  lastUpdated?: number;
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  location?: Location;
  available?: boolean;
  hospitalLevel?: string;
  commandTitle?: string;
  capacity?: HospitalCapacity;
}

export interface Feedback {
  id: string;
  incidentId: string;
  fromRole: UserRole;
  toRole: UserRole;
  fromId: string;
  toId: string;
  rating: number; // 1 to 5
  comment: string;
  timestamp: number;
  createdAt?: number;
}

export type GreenCorridorPhase = 'EN_ROUTE_TO_PATIENT' | 'IN_TRANSIT_TO_HOSPITAL' | 'COMPLETED';

export interface GreenCorridorJunction {
  id: string;
  name: string;
  status: 'GREEN' | 'CLEARING' | 'QUEUED';
  etaSeconds: number;
}

export interface GreenCorridorInfo {
  required: boolean;
  phase: GreenCorridorPhase;
  phaseLabel: string;
  status: 'ACTIVE' | 'CLEARED' | 'ACKNOWLEDGED';
  notifiedAt: number;
  acknowledgedAt?: number;
  source: string;
  destination: string;
  speedKmH: number;
  estimatedArrivalMinutes: number;
  junctions: GreenCorridorJunction[];
  policeOfficerNotes?: string;
  escortDispatched?: boolean;
}

export interface AiDispatchInfo {
  algorithm: 'QPSO_METAHEURISTICS';
  qpsoStatus: 'COMPUTED_OPTIMAL' | 'CONVERGED';
  latencyMs: number;
  routeEfficiencyGain: string;
  sourceType: 'LOCAL_UNIT_ACCEPTED' | 'AUTOMATIC_CALLING_AGENT_108' | 'AUTOMATIC_CALLING_AGENT_101';
  sourceLabel: string;
  assignedUnitName: string;
  greenCorridorPreempted: boolean;
  hospitalReadinessVerified: boolean;
  timestamp: number;
}

export interface TrafficPoliceNotification {
  id: string;
  incidentId: string;
  type: 'PHASE_1_EN_ROUTE_PATIENT' | 'PHASE_2_IN_TRANSIT_HOSPITAL';
  title: string;
  message: string;
  responderName: string;
  destinationName: string;
  condition?: string;
  acuity?: string;
  timestamp: number;
  read: boolean;
  priority: 'CRITICAL' | 'URGENT';
}

export interface Incident {
  id: string;
  type: 'AMBULANCE' | 'FIRE_RESCUE';
  patientId: string;
  callerRole?: 'PATIENT' | 'BYSTANDER';
  victimCount?: number;
  address?: string;
  location: Location;
  condition?: string;
  conditionCategory?: string;
  conditionAcuity?: 'ALS' | 'BLS' | 'MICU' | 'NEO';
  conditionSubtitle?: string;
  hospitalPreference?: 'DRIVER_DISCRETION' | 'PREFERRED_HOSPITAL';
  preferredHospitalId?: string;
  preferredHospitalName?: string;
  additionalInfoProvided?: boolean;
  ambulancesRequired?: number;
  status: IncidentStatus;
  assignedResponderId?: string;
  notifiedHospitals: string[];
  acceptedHospitals: string[];
  rejectedHospitals: string[];
  selectedHospitalId?: string;
  createdAt: number;
  acceptanceDeadline?: number;
  timeline: { status: IncidentStatus; timestamp: number }[];
  greenCorridor?: GreenCorridorInfo;
  aiDispatch?: AiDispatchInfo;
}

export interface AppState {
  incidents: Incident[];
  users: User[];
  feedbacks: Feedback[];
  trafficNotifications?: TrafficPoliceNotification[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  fullName: string;
  mobileNumber: string;
  alternativeNumber: string;
  emailAddress: string;
  workEmail?: string;
  idNumber?: string;
  homeAddress?: string;
  workAddress?: string;
  emergencyContacts: EmergencyContact[];
}

export type DevicePreset = 'iPhone 16' | 'Galaxy S24' | 'Pixel 8' | 'Compact' | 'Tablet' | 'Full View';
export type FrameFinish = 'Titanium' | 'Midnight' | 'Silver' | 'Gold' | 'Borderless';
export type NotchStyle = 'Dynamic Island' | 'Punch Hole' | 'Classic Notch' | 'Waterdrop Notch' | 'None';

export interface DeviceSettings {
  preset: DevicePreset;
  width: number;
  height: number;
  zoom: number;
  finish: FrameFinish;
  notch: NotchStyle;
  centered: boolean;
  frameEnabled: boolean;
  isSettingsOpen: boolean;
}
