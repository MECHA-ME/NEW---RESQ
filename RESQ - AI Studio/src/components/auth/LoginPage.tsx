import React, { useState } from 'react';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Truck, 
  Flame, 
  Hospital as HospitalIcon, 
  ShieldAlert, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  PhoneCall,
  BadgeCheck
} from 'lucide-react';
import { UserRole } from '../../types';
import ResqShieldLogo from './ResqShieldLogo';

interface LoginPageProps {
  onBack: () => void;
  onLogin: (role: UserRole, userDetails?: any) => void;
  onCreateAccountClick: () => void;
  onEmergencySosClick: () => void;
}

export default function LoginPage({
  onBack,
  onLogin,
  onCreateAccountClick,
  onEmergencySosClick
}: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('PATIENT');
  const [idNumber, setIdNumber] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotToast, setForgotToast] = useState(false);

  // Pre-fill demo credentials when switching roles for smooth testing
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'PATIENT') {
      setIdNumber('');
      setContactInput('patient@resq.org');
      setPassword('password123');
    } else if (role === 'AMBULANCE_DRIVER') {
      setIdNumber('EMT-4091');
      setContactInput('driver1@resq.org');
      setPassword('driverpass');
    } else if (role === 'FIRE_RESCUE') {
      setIdNumber('FIRE-882');
      setContactInput('rescue1@resq.org');
      setPassword('firepass');
    } else if (role === 'HOSPITAL') {
      setIdNumber('HOSP-ER-01');
      setContactInput('command@sfgen.org');
      setPassword('hosppass');
    } else if (role === 'TRAFFIC_POLICE') {
      setIdNumber('TPD-610');
      setContactInput('corridor@traffic.gov');
      setPassword('trafficpass');
    } else if (role === 'ADMIN') {
      setIdNumber('ADMIN-HQ');
      setContactInput('admin@resq.org');
      setPassword('adminpass');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(selectedRole, {
      idNumber,
      contactInput: contactInput || `${selectedRole.toLowerCase()}@resq.org`,
      role: selectedRole
    });
  };

  const isStaff = selectedRole !== 'PATIENT';

  return (
    <div className="w-full h-full bg-white flex flex-col justify-between text-gray-900 overflow-y-auto">
      {/* Top App Bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between z-20 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer"
          title="Go back to Welcome"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="font-bold text-base text-gray-900 tracking-tight">Log In</span>

        <ResqShieldLogo size="sm" variant="dark" />
      </div>

      {/* Main Form Content */}
      <div className="p-5 space-y-4 flex-1">
        {/* Welcome Back Header */}
        <div className="text-center pt-1 pb-1">
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">Welcome Back!</h2>
          <p className="text-xs text-gray-500 mt-0.5">Login to continue to RESQ</p>
        </div>

        {/* Role Selection Grid (3x2) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-black uppercase text-gray-700 tracking-wider">
              Select Your Role
            </label>
            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              Required
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* 1. Public / Bystander */}
            <button
              type="button"
              onClick={() => handleRoleSelect('PATIENT')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                selectedRole === 'PATIENT'
                  ? 'border-red-500 bg-red-50/60 shadow-xs ring-1 ring-red-400'
                  : 'border-gray-200 bg-gray-50/70 hover:bg-gray-100/60 text-gray-700'
              }`}
            >
              {selectedRole === 'PATIENT' && (
                <BadgeCheck size={14} className="text-red-600 absolute top-1.5 right-1.5" />
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                selectedRole === 'PATIENT' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <UserIcon size={16} />
              </div>
              <span className="text-[10px] font-bold leading-tight">Public / Bystander</span>
            </button>

            {/* 2. Ambulance Driver / EMT */}
            <button
              type="button"
              onClick={() => handleRoleSelect('AMBULANCE_DRIVER')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                selectedRole === 'AMBULANCE_DRIVER'
                  ? 'border-red-500 bg-red-50/60 shadow-xs ring-1 ring-red-400'
                  : 'border-gray-200 bg-gray-50/70 hover:bg-gray-100/60 text-gray-700'
              }`}
            >
              {selectedRole === 'AMBULANCE_DRIVER' && (
                <BadgeCheck size={14} className="text-red-600 absolute top-1.5 right-1.5" />
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                selectedRole === 'AMBULANCE_DRIVER' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <Truck size={16} />
              </div>
              <span className="text-[10px] font-bold leading-tight">Ambulance Driver / EMT</span>
            </button>

            {/* 3. Fire & Rescue */}
            <button
              type="button"
              onClick={() => handleRoleSelect('FIRE_RESCUE')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                selectedRole === 'FIRE_RESCUE'
                  ? 'border-red-500 bg-red-50/60 shadow-xs ring-1 ring-red-400'
                  : 'border-gray-200 bg-gray-50/70 hover:bg-gray-100/60 text-gray-700'
              }`}
            >
              {selectedRole === 'FIRE_RESCUE' && (
                <BadgeCheck size={14} className="text-red-600 absolute top-1.5 right-1.5" />
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                selectedRole === 'FIRE_RESCUE' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <Flame size={16} />
              </div>
              <span className="text-[10px] font-bold leading-tight">Fire &amp; Rescue Personnel</span>
            </button>

            {/* 4. Hospital Staff */}
            <button
              type="button"
              onClick={() => handleRoleSelect('HOSPITAL')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                selectedRole === 'HOSPITAL'
                  ? 'border-red-500 bg-red-50/60 shadow-xs ring-1 ring-red-400'
                  : 'border-gray-200 bg-gray-50/70 hover:bg-gray-100/60 text-gray-700'
              }`}
            >
              {selectedRole === 'HOSPITAL' && (
                <BadgeCheck size={14} className="text-red-600 absolute top-1.5 right-1.5" />
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                selectedRole === 'HOSPITAL' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <HospitalIcon size={16} />
              </div>
              <span className="text-[10px] font-bold leading-tight">Hospital Staff</span>
            </button>

            {/* 5. Traffic Police */}
            <button
              type="button"
              onClick={() => handleRoleSelect('TRAFFIC_POLICE')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                selectedRole === 'TRAFFIC_POLICE'
                  ? 'border-red-500 bg-red-50/60 shadow-xs ring-1 ring-red-400'
                  : 'border-gray-200 bg-gray-50/70 hover:bg-gray-100/60 text-gray-700'
              }`}
            >
              {selectedRole === 'TRAFFIC_POLICE' && (
                <BadgeCheck size={14} className="text-red-600 absolute top-1.5 right-1.5" />
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                selectedRole === 'TRAFFIC_POLICE' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <ShieldAlert size={16} />
              </div>
              <span className="text-[10px] font-bold leading-tight">Traffic Police</span>
            </button>

            {/* 6. Emergency Control / Admin */}
            <button
              type="button"
              onClick={() => handleRoleSelect('ADMIN')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                selectedRole === 'ADMIN'
                  ? 'border-red-500 bg-red-50/60 shadow-xs ring-1 ring-red-400'
                  : 'border-gray-200 bg-gray-50/70 hover:bg-gray-100/60 text-gray-700'
              }`}
            >
              {selectedRole === 'ADMIN' && (
                <BadgeCheck size={14} className="text-red-600 absolute top-1.5 right-1.5" />
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                selectedRole === 'ADMIN' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <ShieldCheck size={16} />
              </div>
              <span className="text-[10px] font-bold leading-tight">Emergency Control / Admin</span>
            </button>
          </div>
        </div>

        {/* Input Form Fields */}
        <form onSubmit={handleFormSubmit} className="space-y-3 pt-1">
          {/* Conditional ID Number for Staff Roles */}
          {isStaff && (
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                ID Number (Required for Staff)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <UserIcon size={16} />
                </div>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter ID Number (e.g. EMT-4091)"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono"
                />
              </div>
            </div>
          )}

          {/* Mobile / Email Input */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Mobile Number / Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail size={16} />
              </div>
              <input
                type="text"
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                placeholder="Enter Mobile / Email"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span>Remember Me</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setForgotToast(true);
                setTimeout(() => setForgotToast(false), 3000);
              }}
              className="text-red-600 font-bold hover:underline cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {forgotToast && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 text-center animate-fade-in">
              Password reset link sent to your registered contact channel!
            </div>
          )}

          {/* Solid Navy LOGIN Button */}
          <button
            type="submit"
            className="w-full mt-2 bg-[#0f172a] hover:bg-[#1e293b] active:scale-[0.98] text-white font-black py-3.5 rounded-xl shadow-md transition-all cursor-pointer text-sm tracking-wide flex items-center justify-center gap-2"
          >
            <span>LOGIN</span>
          </button>
        </form>

        {/* Link to Create Account */}
        <div className="text-center pt-1">
          <p className="text-xs text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onCreateAccountClick}
              className="text-red-600 font-black hover:underline cursor-pointer ml-1"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>

      {/* Bottom Emergency SOS Card */}
      <div className="p-4 pt-2 border-t border-gray-100 bg-white shrink-0">
        <button
          type="button"
          onClick={onEmergencySosClick}
          className="w-full bg-red-50 hover:bg-red-100/70 active:scale-[0.98] text-red-700 border border-red-200 rounded-2xl p-2.5 flex items-center justify-center gap-3 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
            <PhoneCall size={16} className="animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
              <span>EMERGENCY SOS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </div>
            <p className="text-[10px] text-gray-600 font-medium">Tap for immediate emergency dispatch</p>
          </div>
        </button>
      </div>
    </div>
  );
}
