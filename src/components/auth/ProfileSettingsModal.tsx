import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Phone,
  PhoneCall,
  Mail,
  Home,
  Briefcase,
  BadgeCheck,
  LogOut,
  ShieldAlert,
  Truck,
  Hospital as HospitalIcon,
  Radio,
  ShieldCheck,
  Users,
  Building,
  RotateCcw,
  Smartphone,
  SlidersHorizontal,
  Layers,
  AlignJustify
} from 'lucide-react';
import { UserRole, UserProfile, DeviceSettings, DevicePreset, FrameFinish, NotchStyle } from '../../types';
import { PRESET_DIMENSIONS } from '../DeviceFrameToolbar';

interface ProfileSettingsModalProps {
  userProfile: UserProfile | null;
  role: UserRole;
  deviceSettings?: DeviceSettings;
  onUpdateDeviceSettings?: (updated: Partial<DeviceSettings>) => void;
  onResetDeviceFrame?: () => void;
  onClose: () => void;
  onLogOut: () => void;
  onResetData: () => void;
}

export default function ProfileSettingsModal({
  userProfile,
  role,
  deviceSettings,
  onUpdateDeviceSettings,
  onResetDeviceFrame,
  onClose,
  onLogOut,
  onResetData
}: ProfileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'device'>('profile');
  const getRoleDisplay = (r: UserRole) => {
    switch (r) {
      case 'PATIENT':
        return {
          name: 'Public / Citizen',
          agency: 'RESQ Citizen Network',
          icon: <ShieldAlert size={20} className="text-red-500" />,
          badgeClass: 'bg-red-50 text-red-700 border-red-200'
        };
      case 'AMBULANCE_DRIVER':
        return {
          name: 'Ambulance Driver / EMT',
          agency: 'Metro EMS Fleet Command',
          icon: <Truck size={20} className="text-blue-500" />,
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'HOSPITAL':
        return {
          name: 'Hospital Staff / ER Command',
          agency: 'SF General Trauma Center',
          icon: <HospitalIcon size={20} className="text-emerald-500" />,
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'TRAFFIC_POLICE':
        return {
          name: 'Traffic Police Officer',
          agency: 'Green Corridor Traffic Division',
          icon: <Radio size={20} className="text-purple-500" />,
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      case 'ADMIN':
        return {
          name: 'Emergency Control / Admin',
          agency: 'Central Dispatch Headquarters',
          icon: <ShieldCheck size={20} className="text-slate-700" />,
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300'
        };
    }
  };

  const roleInfo = getRoleDisplay(role);

  // Fallback defaults if user logged in via quick login without filling custom create-account form
  const name = userProfile?.fullName || (
    role === 'PATIENT' ? 'John Patient' :
    role === 'AMBULANCE_DRIVER' ? 'Officer Dave Martinez' :
    role === 'HOSPITAL' ? 'Dr. Sarah Lin (Chief of Trauma)' :
    role === 'TRAFFIC_POLICE' ? 'Sgt. Robert Chen' : 'Admin Commander'
  );

  const mobile = userProfile?.mobileNumber || '+1 (555) 234-5678';
  const altMobile = userProfile?.alternativeNumber || '+1 (555) 987-6543';
  const email = userProfile?.emailAddress || `${role.toLowerCase()}@resq.org`;
  const workEmail = userProfile?.workEmail || (role !== 'PATIENT' ? `${role.toLowerCase()}.unit@resq.gov` : undefined);
  const staffId = userProfile?.idNumber || (
    role === 'AMBULANCE_DRIVER' ? 'EMT-4091' :
    role === 'HOSPITAL' ? 'HOSP-ER-01' :
    role === 'TRAFFIC_POLICE' ? 'TPD-610' :
    role === 'ADMIN' ? 'ADMIN-HQ' : undefined
  );
  const homeAddr = userProfile?.homeAddress || '742 Evergreen Terrace, Sector 4';
  const workAddr = userProfile?.workAddress || (role !== 'PATIENT' ? 'Central Response Hub #12' : 'Downtown Tech Park, Suite 400');

  const contacts = (userProfile?.emergencyContacts && userProfile.emergencyContacts.length > 0)
    ? userProfile.emergencyContacts
    : [
        { id: '1', name: 'Eleanor (Spouse)', relation: 'Immediate Family', phone: '+1 (555) 309-8812' },
        { id: '2', name: 'Marcus (Brother)', relation: 'Guardian / Family', phone: '+1 (555) 441-2900' },
        { id: '3', name: 'Emergency Dispatch Hotline', relation: 'Direct Desk', phone: '+1 (555) 911-0000' }
      ];

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-[2000] flex flex-col justify-end p-2 sm:p-3 animate-fade-in">
      <div className="bg-white rounded-3xl p-5 shadow-2xl border border-gray-200 space-y-4 max-h-[92%] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              {roleInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase text-red-600 tracking-wider">
                  Active User Profile
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-gray-950 leading-tight">{name}</h3>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-0.5 ${roleInfo.badgeClass}`}>
                {roleInfo.name}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector: Profile vs Phone Frame Adjustments */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserIcon size={13} />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('device')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'device'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Smartphone size={13} />
            <span>Phone &amp; Screen Size</span>
          </button>
        </div>

        {activeTab === 'profile' ? (
          /* Profile Details Sections */
          <div className="space-y-3 text-xs">
            {/* Section 1: Official & Contact Details */}
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                Contact &amp; Identification
              </h4>

              {staffId && (
                <div className="flex items-center justify-between py-1 border-b border-gray-200/60 font-mono">
                  <span className="text-gray-500 flex items-center gap-1.5 font-sans">
                    <BadgeCheck size={14} className="text-blue-500" /> Staff ID:
                  </span>
                  <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {staffId}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Phone size={14} className="text-gray-400" /> Primary Mobile:
                </span>
                <span className="font-semibold text-gray-900 font-mono">{mobile}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <PhoneCall size={14} className="text-gray-400" /> Alternative Phone:
                </span>
                <span className="font-semibold text-gray-900 font-mono">{altMobile}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Mail size={14} className="text-gray-400" /> Personal Email:
                </span>
                <span className="font-semibold text-gray-900 truncate max-w-[170px]">{email}</span>
              </div>

              {workEmail && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Building size={14} className="text-blue-500" /> Work Email:
                  </span>
                  <span className="font-semibold text-gray-900 truncate max-w-[170px]">{workEmail}</span>
                </div>
              )}
            </div>

            {/* Section 2: Addresses */}
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                Registered Locations
              </h4>

              <div className="py-1 border-b border-gray-200/60">
                <div className="text-gray-500 flex items-center gap-1.5 text-[11px] mb-0.5">
                  <Home size={13} className="text-gray-400" /> Home Address:
                </div>
                <p className="font-semibold text-gray-800 pl-4">{homeAddr}</p>
              </div>

              <div className="py-1">
                <div className="text-gray-500 flex items-center gap-1.5 text-[11px] mb-0.5">
                  <Briefcase size={13} className="text-gray-400" /> Work / Station Address:
                </div>
                <p className="font-semibold text-gray-800 pl-4">{workAddr}</p>
              </div>
            </div>

            {/* Section 3: Emergency Contacts List */}
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                  <Users size={12} className="text-red-500" />
                  <span>Emergency Contacts ({contacts.length})</span>
                </h4>
                <span className="text-[10px] text-gray-400">Notified during SOS</span>
              </div>

              <div className="space-y-1.5">
                {contacts.map((c, i) => (
                  <div key={i} className="p-2 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-[11px]">{c.name || `Contact #${i+1}`}</div>
                      <div className="text-[10px] text-gray-500">{c.relation || 'Emergency Contact'}</div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                      {c.phone}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Phone & Screen Size Adjustment Options */
          <div className="space-y-3 text-xs animate-fade-in">
            {/* Device Presets */}
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  Device Presets
                </h4>
                <span className="text-[10px] font-mono font-bold text-blue-600">
                  {deviceSettings?.preset === 'Full View' ? 'Full View' : `${deviceSettings?.width} × ${deviceSettings?.height}px`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['iPhone 16', 'Galaxy S24', 'Pixel 8', 'Compact', 'Tablet', 'Full View'] as DevicePreset[]).map((p) => {
                  const isSelected = deviceSettings?.preset === p;
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        if (onUpdateDeviceSettings) {
                          const dim = PRESET_DIMENSIONS[p];
                          onUpdateDeviceSettings({
                            preset: p,
                            width: dim.width,
                            height: dim.height,
                            notch: dim.notch,
                            frameEnabled: p !== 'Full View'
                          });
                        }
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-2xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-[11px] truncate">{p}</div>
                      <div className="text-[9px] text-gray-400 font-mono">
                        {p === 'Full View' ? '100% Fluid' : `${PRESET_DIMENSIONS[p].width}x${PRESET_DIMENSIONS[p].height}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Dimension Sliders */}
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  Custom Dimension Sliders
                </h4>
                <span className="text-[10px] text-gray-500">Smooth context resizing</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 w-12 shrink-0">Width:</span>
                  <input
                    type="range"
                    min={320}
                    max={1024}
                    step={2}
                    value={deviceSettings?.width || 430}
                    disabled={deviceSettings?.preset === 'Full View'}
                    onChange={(e) => onUpdateDeviceSettings?.({ width: Number(e.target.value), preset: 'iPhone 16' })}
                    className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                  />
                  <span className="text-[11px] font-mono font-bold text-gray-700 w-12 text-right">
                    {deviceSettings?.preset === 'Full View' ? '100%' : `${deviceSettings?.width}px`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 w-12 shrink-0">Height:</span>
                  <input
                    type="range"
                    min={500}
                    max={1200}
                    step={2}
                    value={deviceSettings?.height || 932}
                    disabled={deviceSettings?.preset === 'Full View'}
                    onChange={(e) => onUpdateDeviceSettings?.({ height: Number(e.target.value), preset: 'iPhone 16' })}
                    className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                  />
                  <span className="text-[11px] font-mono font-bold text-gray-700 w-12 text-right">
                    {deviceSettings?.preset === 'Full View' ? '100%' : `${deviceSettings?.height}px`}
                  </span>
                </div>
              </div>
            </div>

            {/* Frame Finish & Notch */}
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                Frame &amp; Notch Appearance
              </h4>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'Titanium' as FrameFinish, label: 'Titanium', dot: 'bg-slate-700' },
                  { id: 'Midnight' as FrameFinish, label: 'Midnight', dot: 'bg-black' },
                  { id: 'Silver' as FrameFinish, label: 'Silver', dot: 'bg-slate-300' },
                  { id: 'Gold' as FrameFinish, label: 'Gold', dot: 'bg-amber-500' },
                  { id: 'Borderless' as FrameFinish, label: 'Borderless', dot: 'bg-transparent border border-slate-400' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onUpdateDeviceSettings?.({ finish: f.id })}
                    className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      deviceSettings?.finish === f.id
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${f.dot}`} />
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Camera Notch Style:</label>
                <select
                  value={deviceSettings?.notch || 'Dynamic Island'}
                  onChange={(e) => onUpdateDeviceSettings?.({ notch: e.target.value as NotchStyle })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Dynamic Island">Dynamic Island (iOS)</option>
                  <option value="Punch Hole">Punch Hole (Android)</option>
                  <option value="Classic Notch">Classic Notch</option>
                  <option value="Waterdrop Notch">Waterdrop Notch</option>
                  <option value="None">None (Borderless / Clean)</option>
                </select>
              </div>
            </div>

            {/* Quick Actions: Centered / Left, Frame ON / OFF, Reset */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => onUpdateDeviceSettings?.({ centered: !deviceSettings?.centered })}
                className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-700 flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <AlignJustify size={14} />
                <span>{deviceSettings?.centered ? 'Centered' : 'Left-align'}</span>
              </button>

              <button
                onClick={() => onUpdateDeviceSettings?.({ frameEnabled: !deviceSettings?.frameEnabled })}
                className={`p-2 border rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  deviceSettings?.frameEnabled
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Layers size={14} />
                <span>{deviceSettings?.frameEnabled ? 'Frame ON' : 'Frame OFF'}</span>
              </button>

              <button
                onClick={() => onResetDeviceFrame?.()}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-[11px] font-bold text-gray-700 flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Reset Frame</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Controls: Reset & LOG OUT */}
        <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
          <button
            onClick={() => {
              onResetData();
              onClose();
            }}
            className="flex-1 py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset State</span>
          </button>

          <button
            onClick={onLogOut}
            className="flex-1 py-3 px-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            <LogOut size={15} />
            <span>LOG OUT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
