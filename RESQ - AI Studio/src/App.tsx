/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppState, UserRole, UserProfile, DeviceSettings, DevicePreset, FrameFinish, NotchStyle } from './types';
import { 
  Activity, 
  Truck, 
  Flame, 
  Hospital as HospitalIcon, 
  Radio, 
  ShieldCheck, 
  Wifi, 
  Battery, 
  ShieldAlert,
  ChevronDown,
  RotateCcw,
  LogOut,
  X,
  Settings,
  Info
} from 'lucide-react';
import PatientDashboard from './components/PatientDashboard';
import AmbulanceDashboard from './components/AmbulanceDashboard';
import FireRescueDashboard from './components/FireRescueDashboard';
import HospitalDashboard from './components/HospitalDashboard';
import TrafficPoliceDashboard from './components/TrafficPoliceDashboard';
import AdminDashboard from './components/AdminDashboard';
import AuthFlow, { AuthScreenStep } from './components/auth/AuthFlow';
import ProfileSettingsModal from './components/auth/ProfileSettingsModal';
import InfoPage from './components/auth/InfoPage';
import DeviceFrameToolbar, { PRESET_DIMENSIONS } from './components/DeviceFrameToolbar';

const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
  preset: 'iPhone 16',
  width: 430,
  height: 932,
  zoom: 1,
  finish: 'Titanium',
  notch: 'Dynamic Island',
  centered: true,
  frameEnabled: true,
  isSettingsOpen: false,
};

export default function App() {
  const [state, setState] = useState<AppState>({ incidents: [], users: [], feedbacks: [] });
  
  // Device Frame Settings
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>(() => {
    try {
      const saved = localStorage.getItem('resq_device_settings');
      if (saved) {
        return { ...DEFAULT_DEVICE_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_DEVICE_SETTINGS;
  });

  const handleUpdateDeviceSettings = (updated: Partial<DeviceSettings>) => {
    setDeviceSettings(prev => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('resq_device_settings', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleResetDeviceFrame = () => {
    setDeviceSettings(DEFAULT_DEVICE_SETTINGS);
    try {
      localStorage.setItem('resq_device_settings', JSON.stringify(DEFAULT_DEVICE_SETTINGS));
    } catch (e) {
      console.error(e);
    }
  };

  // Authentication & Onboarding state with session check
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('resq_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.isLoggedIn);
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  });

  const [authStep, setAuthStep] = useState<AuthScreenStep>('loading');
  const [showRoleSwitcher, setShowRoleSwitcher] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Active persona & profile
  const [role, setRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('resq_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) return parsed.role;
      }
    } catch (e) {
      console.error(e);
    }
    return 'PATIENT';
  });

  const [userId, setUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('resq_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.userId) return parsed.userId;
      }
    } catch (e) {
      console.error(e);
    }
    return 'patient_1';
  });

  const [patientPortalKey, setPatientPortalKey] = useState<number>(0);
  const [currentUserDetails, setCurrentUserDetails] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('resq_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.userDetails) return parsed.userDetails;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setState(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    await fetch('/api/reset', { method: 'POST' });
    fetchState();
  };

  const handleSelectRole = (newRole: UserRole, details?: any) => {
    setRole(newRole);
    const updatedDetails = details || currentUserDetails;
    if (details) setCurrentUserDetails(details);
    
    let uid = 'patient_1';
    if (newRole === 'PATIENT') {
      uid = 'patient_1';
      setPatientPortalKey(prev => prev + 1);
    } else if (newRole === 'AMBULANCE_DRIVER') {
      uid = 'driver_1';
    } else if (newRole === 'FIRE_RESCUE') {
      uid = 'fire_1';
    } else if (newRole === 'HOSPITAL') {
      uid = 'hospital_1';
    } else if (newRole === 'TRAFFIC_POLICE') {
      uid = 'traffic_1';
    } else if (newRole === 'ADMIN') {
      uid = 'admin_1';
    }
    setUserId(uid);
    setShowRoleSwitcher(false);

    // Save session in localStorage so refreshing stays logged into this role
    if (isLoggedIn) {
      try {
        localStorage.setItem('resq_session', JSON.stringify({
          isLoggedIn: true,
          role: newRole,
          userId: uid,
          userDetails: updatedDetails
        }));
      } catch (e) {
        console.error('Failed to update localStorage session', e);
      }
    }
  };

  const handleAuthenticated = (authenticatedRole: UserRole, userDetails?: any) => {
    setRole(authenticatedRole);
    if (userDetails) setCurrentUserDetails(userDetails);
    let uid = 'patient_1';
    if (authenticatedRole === 'PATIENT') {
      uid = 'patient_1';
      setPatientPortalKey(prev => prev + 1);
    } else if (authenticatedRole === 'AMBULANCE_DRIVER') {
      uid = 'driver_1';
    } else if (authenticatedRole === 'FIRE_RESCUE') {
      uid = 'fire_1';
    } else if (authenticatedRole === 'HOSPITAL') {
      uid = 'hospital_1';
    } else if (authenticatedRole === 'TRAFFIC_POLICE') {
      uid = 'traffic_1';
    } else if (authenticatedRole === 'ADMIN') {
      uid = 'admin_1';
    }
    setUserId(uid);
    setIsLoggedIn(true);

    try {
      localStorage.setItem('resq_session', JSON.stringify({
        isLoggedIn: true,
        role: authenticatedRole,
        userId: uid,
        userDetails: userDetails || null
      }));
    } catch (e) {
      console.error('Failed to save localStorage session', e);
    }
  };

  const handleLogOut = () => {
    try {
      localStorage.removeItem('resq_session');
    } catch (e) {
      console.error(e);
    }
    setIsLoggedIn(false);
    setAuthStep('welcome');
    setShowRoleSwitcher(false);
    setShowSettingsModal(false);
    setShowInfoModal(false);
  };

  const getRoleMeta = (r: UserRole) => {
    switch (r) {
      case 'PATIENT':
        return { 
          title: 'Public / Bystander', 
          badge: 'Public SOS', 
          color: 'text-red-600 bg-red-50 border-red-200', 
          icon: <ShieldAlert size={14} className="text-red-500" /> 
        };
      case 'AMBULANCE_DRIVER':
        return { 
          title: 'Ambulance Driver', 
          badge: 'EMS Unit 1', 
          color: 'text-blue-700 bg-blue-50 border-blue-200', 
          icon: <Truck size={14} className="text-blue-500" /> 
        };
      case 'FIRE_RESCUE':
        return { 
          title: 'Fire & Rescue', 
          badge: 'Fire Engine A', 
          color: 'text-amber-700 bg-amber-50 border-amber-200', 
          icon: <Flame size={14} className="text-amber-500" /> 
        };
      case 'HOSPITAL':
        return { 
          title: 'Hospital Staff', 
          badge: 'SF Trauma Bay', 
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200', 
          icon: <HospitalIcon size={14} className="text-emerald-500" /> 
        };
      case 'TRAFFIC_POLICE':
        return { 
          title: 'Traffic Police', 
          badge: 'Green Corridor', 
          color: 'text-purple-700 bg-purple-50 border-purple-200', 
          icon: <Radio size={14} className="text-purple-500" /> 
        };
      case 'ADMIN':
        return { 
          title: 'Emergency Control', 
          badge: 'Central Admin', 
          color: 'text-slate-800 bg-slate-100 border-slate-300', 
          icon: <ShieldCheck size={14} className="text-slate-700" /> 
        };
    }
  };

  const renderDashboard = () => {
    switch (role) {
      case 'PATIENT':
        return (
          <PatientDashboard 
            key={patientPortalKey} 
            state={state} 
            userId={userId} 
            fetchState={fetchState} 
          />
        );
      case 'AMBULANCE_DRIVER':
        return <AmbulanceDashboard state={state} userId={userId} fetchState={fetchState} />;
      case 'FIRE_RESCUE':
        return <FireRescueDashboard state={state} userId={userId} fetchState={fetchState} />;
      case 'HOSPITAL':
        return <HospitalDashboard state={state} userId={userId} fetchState={fetchState} />;
      case 'TRAFFIC_POLICE':
        return <TrafficPoliceDashboard state={state} userId={userId} fetchState={fetchState} />;
      case 'ADMIN':
        return <AdminDashboard state={state} fetchState={fetchState} onReset={handleReset} />;
      default:
        return null;
    }
  };

  const activeMeta = getRoleMeta(role);

  const getFrameFinishClasses = (finish: FrameFinish, frameEnabled: boolean, preset: DevicePreset) => {
    if (preset === 'Full View') {
      return 'w-full h-screen rounded-none border-0 shadow-none ring-0';
    }
    if (!frameEnabled || finish === 'Borderless') {
      return 'rounded-2xl border border-slate-700/40 shadow-2xl ring-1 ring-white/10';
    }
    switch (finish) {
      case 'Titanium':
        return 'border-[10px] border-[#22252a] ring-2 ring-slate-500/30 sm:rounded-[3rem] shadow-2xl';
      case 'Midnight':
        return 'border-[10px] border-[#08090a] ring-2 ring-slate-800 sm:rounded-[3rem] shadow-2xl';
      case 'Silver':
        return 'border-[10px] border-[#cbd5e1] ring-2 ring-slate-300 sm:rounded-[3rem] shadow-2xl';
      case 'Gold':
        return 'border-[10px] border-[#92400e] ring-2 ring-amber-300/60 sm:rounded-[3rem] shadow-2xl';
      default:
        return 'border-[10px] border-gray-950 ring-1 ring-white/10 sm:rounded-[3rem] shadow-2xl';
    }
  };

  const renderNotch = () => {
    if (!deviceSettings.frameEnabled || deviceSettings.preset === 'Full View') return null;
    switch (deviceSettings.notch) {
      case 'Dynamic Island':
        return <div className="w-24 h-5 bg-black rounded-full mx-auto shadow-xs" />;
      case 'Punch Hole':
        return <div className="w-3.5 h-3.5 bg-black rounded-full mx-auto shadow-xs" />;
      case 'Classic Notch':
        return <div className="w-32 h-4.5 bg-black rounded-b-xl mx-auto -mt-1 shadow-xs" />;
      case 'Waterdrop Notch':
        return <div className="w-4 h-3.5 bg-black rounded-b-full mx-auto -mt-1 shadow-xs" />;
      case 'None':
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/95 flex flex-col font-sans text-brand-text">
      {/* Top Device Simulator & Frame Adjuster Toolbar */}
      <DeviceFrameToolbar
        settings={deviceSettings}
        onChange={handleUpdateDeviceSettings}
        onReset={handleResetDeviceFrame}
      />

      {/* Frame Canvas Wrapper with dynamic zoom & alignment */}
      <div 
        className={`flex-1 flex w-full overflow-x-auto overflow-y-auto ${
          deviceSettings.preset === 'Full View' 
            ? 'p-0' 
            : deviceSettings.centered 
              ? 'items-center justify-center p-2 sm:p-6' 
              : 'items-start justify-start p-2 sm:p-6'
        }`}
      >
        <div 
          className="transition-all duration-200"
          style={{
            transform: deviceSettings.zoom !== 1 ? `scale(${deviceSettings.zoom})` : undefined,
            transformOrigin: deviceSettings.centered ? 'top center' : 'top left'
          }}
        >
          {/* Phone Chassis Mockup Frame */}
          <div 
            className={`bg-white flex flex-col relative overflow-hidden transition-all duration-200 ${
              getFrameFinishClasses(deviceSettings.finish, deviceSettings.frameEnabled, deviceSettings.preset)
            }`}
            style={
              deviceSettings.preset === 'Full View'
                ? { width: '100vw', height: '100vh', maxWidth: '100%', maxHeight: '100vh' }
                : {
                    width: `${deviceSettings.width}px`,
                    height: `${deviceSettings.height}px`,
                    maxWidth: '100vw',
                    maxHeight: '100dvh'
                  }
            }
          >
            
            {/* Dynamic Status Bar & Camera Notch */}
            <div className={`px-5 pt-3 pb-1 flex items-center justify-between text-xs font-semibold select-none shrink-0 z-30 transition-colors ${
              !isLoggedIn && authStep === 'loading' ? 'bg-[#070b12] text-white' : 'bg-white text-gray-900'
            }`}>
              <span className="font-bold tracking-tight">09:41</span>
              {/* Dynamic Camera Notch rendering based on setting */}
              {renderNotch()}
              <div className="flex items-center gap-1.5 opacity-90">
                <span className="text-[10px] font-bold">5G</span>
                <Wifi size={13} strokeWidth={2.5} />
                <Battery size={15} strokeWidth={2.5} className="fill-current" />
              </div>
            </div>

            {/* Prototype Header Bar with TOP-RIGHT SWITCH ROLE option when logged in */}
            {isLoggedIn && (
              <header className="bg-white px-3.5 py-2 border-b border-gray-200/90 flex items-center justify-between gap-2 z-25 shrink-0 shadow-2xs">
                {/* Active Persona Indicator */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${activeMeta.color}`}>
                    {activeMeta.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-gray-900 truncate">
                        {currentUserDetails?.fullName || activeMeta.title}
                      </span>
                      <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
                        ONLINE
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate leading-none">
                      {currentUserDetails?.idNumber || currentUserDetails?.emailAddress || activeMeta.badge}
                    </p>
                  </div>
                </div>

                {/* Top Right "Switch Role" Prototype Button */}
                <button
                  onClick={() => setShowRoleSwitcher(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 active:scale-95 text-amber-900 border border-amber-300 px-2.5 py-1.5 rounded-xl text-xs font-black shadow-2xs transition-all cursor-pointer shrink-0"
                  title="Switch stakeholder role (Prototype Mode)"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="tracking-tight">Switch Role</span>
                  <ChevronDown size={14} className="text-amber-700" />
                </button>
              </header>
            )}

            {/* Prototype Role Switcher Modal Dropdown */}
            {showRoleSwitcher && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end p-3 animate-fade-in">
                <div className="bg-white rounded-3xl p-5 shadow-2xl border border-gray-200 space-y-4 max-h-[90%] overflow-y-auto">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase text-amber-600 tracking-wider">
                          Prototype Mode
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      </div>
                      <h3 className="text-base font-black text-gray-950">Switch Active Role</h3>
                      <p className="text-xs text-gray-500">
                        Select any stakeholder view to test point-to-point synchronisation.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowRoleSwitcher(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* 6 Role Selector Cards */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {[
                      {
                        r: 'PATIENT' as UserRole,
                        name: 'Public / Citizen',
                        sub: 'Patient SOS & Tracking',
                        icon: <ShieldAlert size={18} className="text-red-500" />,
                        bg: 'hover:border-red-400 hover:bg-red-50/40'
                      },
                      {
                        r: 'AMBULANCE_DRIVER' as UserRole,
                        name: 'Ambulance EMT',
                        sub: 'Dispatch & Transit',
                        icon: <Truck size={18} className="text-blue-500" />,
                        bg: 'hover:border-blue-400 hover:bg-blue-50/40'
                      },
                      {
                        r: 'FIRE_RESCUE' as UserRole,
                        name: 'Fire & Rescue',
                        sub: 'Heavy Aid & Hazmat',
                        icon: <Flame size={18} className="text-amber-500" />,
                        bg: 'hover:border-amber-400 hover:bg-amber-50/40'
                      },
                      {
                        r: 'HOSPITAL' as UserRole,
                        name: 'Hospital Staff',
                        sub: 'Trauma Bay & ICU Beds',
                        icon: <HospitalIcon size={18} className="text-emerald-500" />,
                        bg: 'hover:border-emerald-400 hover:bg-emerald-50/40'
                      },
                      {
                        r: 'TRAFFIC_POLICE' as UserRole,
                        name: 'Traffic Police',
                        sub: 'Green Corridor Overrides',
                        icon: <Radio size={18} className="text-purple-500" />,
                        bg: 'hover:border-purple-400 hover:bg-purple-50/40'
                      },
                      {
                        r: 'ADMIN' as UserRole,
                        name: 'Emergency Control',
                        sub: 'Central Dispatch & Audits',
                        icon: <ShieldCheck size={18} className="text-slate-700" />,
                        bg: 'hover:border-slate-400 hover:bg-slate-50'
                      }
                    ].map((item) => {
                      const isCurrent = role === item.r;
                      return (
                        <button
                          key={item.r}
                          onClick={() => handleSelectRole(item.r)}
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${item.bg} ${
                            isCurrent
                              ? 'border-red-500 bg-red-50/60 shadow-xs ring-1 ring-red-400'
                              : 'border-gray-200 bg-gray-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-gray-100 flex items-center justify-center">
                              {item.icon}
                            </div>
                            {isCurrent && (
                              <span className="text-[10px] font-black uppercase text-red-600 bg-red-100/80 px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900">{item.name}</div>
                            <div className="text-[10px] text-gray-500">{item.sub}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom Quick Tools: Reset & Log Out */}
                  <div className="pt-2 border-t border-gray-200/80 flex items-center justify-between gap-2">
                    <button
                      onClick={async () => {
                        await handleReset();
                        setShowRoleSwitcher(false);
                      }}
                      className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>Reset Data</span>
                    </button>

                    <button
                      onClick={handleLogOut}
                      className="flex-1 py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile & Settings Modal */}
            {showSettingsModal && (
              <ProfileSettingsModal
                userProfile={currentUserDetails}
                role={role}
                deviceSettings={deviceSettings}
                onUpdateDeviceSettings={handleUpdateDeviceSettings}
                onResetDeviceFrame={handleResetDeviceFrame}
                onClose={() => setShowSettingsModal(false)}
                onLogOut={handleLogOut}
                onResetData={handleReset}
              />
            )}

            {/* App Info Modal / View */}
            {showInfoModal && (
              <div className="absolute inset-0 bg-white z-50 flex flex-col">
                <InfoPage onBack={() => setShowInfoModal(false)} />
              </div>
            )}

            {/* Main Body: Either Sequential Auth Flow OR Logged-In User Role Screen */}
            <main className="flex-1 overflow-y-auto w-full relative bg-slate-50/50">
              {!isLoggedIn ? (
                <AuthFlow
                  initialStep={authStep}
                  onAuthenticated={handleAuthenticated}
                  onEmergencySosDirect={() => {
                    handleSelectRole('PATIENT');
                    setIsLoggedIn(true);
                  }}
                />
              ) : (
                <div className="px-4 py-2">
                  {renderDashboard()}
                </div>
              )}
            </main>

            {/* Bottom Bar: App Info at Left Bottom & Setting at Right Bottom */}
            {isLoggedIn && (
              <footer className="bg-white border-t border-gray-200/90 px-4 py-2.5 flex items-center justify-between shrink-0 z-30 shadow-md">
                {/* Left Bottom: App Info Button */}
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                  title="About RESQ Network"
                >
                  <Info size={15} className="text-slate-600" />
                  <span>App Info</span>
                </button>

                {/* Center: Live Sync Status Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-black font-mono text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>SYNC ACTIVE</span>
                </div>

                {/* Right Bottom: Settings Button */}
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 border border-red-200 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                  title="User Profile & Settings"
                >
                  <Settings size={15} className="text-red-600" />
                  <span>Settings</span>
                </button>
              </footer>
            )}

            {/* iOS Home Indicator Bar */}
            {deviceSettings.frameEnabled && deviceSettings.preset !== 'Full View' && (
              <div className={`pb-2 flex justify-center shrink-0 transition-colors ${
                !isLoggedIn && authStep === 'loading' ? 'bg-[#070b12]' : 'bg-white'
              }`}>
                <div className="w-32 h-1 bg-gray-300 rounded-full" />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
