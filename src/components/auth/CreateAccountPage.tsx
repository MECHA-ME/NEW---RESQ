import React, { useState } from 'react';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Phone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  PhoneCall,
  Home,
  Briefcase,
  BadgeAlert,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserRole, EmergencyContact, UserProfile } from '../../types';
import ResqShieldLogo from './ResqShieldLogo';

interface CreateAccountPageProps {
  onBack: () => void;
  onAccountCreated: (role: UserRole, userProfile: UserProfile) => void;
  onLoginClick: () => void;
}

export default function CreateAccountPage({
  onBack,
  onAccountCreated,
  onLoginClick
}: CreateAccountPageProps) {
  const [role, setRole] = useState<UserRole>('PATIENT');
  const isPatient = role === 'PATIENT';

  // Basic Info
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternativeNumber, setAlternativeNumber] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');

  // Addresses
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');

  // Emergency Contacts
  // For Patient: min 3 required, max 10
  // For Staff: min 2 required, max 3
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: '1', name: '', relation: 'Primary / Family', phone: '' },
    { id: '2', name: '', relation: 'Secondary / Guardian', phone: '' },
    { id: '3', name: '', relation: 'Friend / Neighbor', phone: '' },
  ]);

  // Credentials & Agreements
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setErrors({});
    if (newRole === 'PATIENT') {
      // Ensure at least 3 contact slots
      setContacts([
        { id: '1', name: contacts[0]?.name || '', relation: contacts[0]?.relation || 'Primary / Family', phone: contacts[0]?.phone || '' },
        { id: '2', name: contacts[1]?.name || '', relation: contacts[1]?.relation || 'Secondary / Guardian', phone: contacts[1]?.phone || '' },
        { id: '3', name: contacts[2]?.name || '', relation: contacts[2]?.relation || 'Friend / Neighbor', phone: contacts[2]?.phone || '' },
      ]);
    } else {
      // Staff role: 2-3 slots
      setContacts([
        { id: '1', name: contacts[0]?.name || '', relation: contacts[0]?.relation || 'Primary Emergency Contact', phone: contacts[0]?.phone || '' },
        { id: '2', name: contacts[1]?.name || '', relation: contacts[1]?.relation || 'Secondary Contact', phone: contacts[1]?.phone || '' },
      ]);
      if (!idNumber) {
        setIdNumber(
          newRole === 'AMBULANCE_DRIVER' ? 'EMT-4091' :
          newRole === 'HOSPITAL' ? 'HOSP-ER-01' :
          newRole === 'TRAFFIC_POLICE' ? 'TPD-610' : 'ADMIN-HQ'
        );
      }
    }
  };

  const maxContactsAllowed = isPatient ? 10 : 3;
  const minRequiredContacts = isPatient ? 3 : 2;

  const handleAddContactSlot = () => {
    if (contacts.length < maxContactsAllowed) {
      setContacts([
        ...contacts,
        { id: String(Date.now()), name: '', relation: `Contact #${contacts.length + 1}`, phone: '' }
      ]);
    }
  };

  const handleRemoveContactSlot = (index: number) => {
    if (contacts.length > minRequiredContacts) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  const handleContactChange = (index: number, field: 'name' | 'relation' | 'phone', value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) newErrors.fullName = 'Full Name is required.';
    if (!mobileNumber.trim()) newErrors.mobileNumber = 'Mobile Number is required.';
    if (!alternativeNumber.trim()) newErrors.alternativeNumber = 'Alternative Number is mandatory.';
    if (!personalEmail.trim()) newErrors.personalEmail = 'Email Address is required.';

    if (!isPatient) {
      if (!idNumber.trim()) newErrors.idNumber = 'Staff ID Number is mandatory.';
      if (!workEmail.trim()) newErrors.workEmail = 'Work Email Address is mandatory.';
    }

    // Emergency Contacts validation
    const filledContacts = contacts.filter(c => c.phone.trim().length > 0);
    if (isPatient && filledContacts.length < 3) {
      newErrors.emergencyContacts = `Patient accounts require at least 3 emergency contact numbers (filled: ${filledContacts.length}/3).`;
    } else if (!isPatient && filledContacts.length < 2) {
      newErrors.emergencyContacts = `Staff accounts require at least 2 emergency contact numbers (filled: ${filledContacts.length}/2).`;
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the Terms & Conditions.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const userProfile: UserProfile = {
      id: `${role.toLowerCase()}_${Date.now()}`,
      role,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      alternativeNumber: alternativeNumber.trim(),
      emailAddress: personalEmail.trim(),
      workEmail: !isPatient ? workEmail.trim() : undefined,
      idNumber: !isPatient ? idNumber.trim() : undefined,
      homeAddress: homeAddress.trim() || undefined,
      workAddress: workAddress.trim() || undefined,
      emergencyContacts: contacts.filter(c => c.phone.trim().length > 0)
    };

    onAccountCreated(role, userProfile);
  };

  return (
    <div className="w-full h-full bg-white flex flex-col justify-between text-gray-900 overflow-y-auto">
      {/* Top App Bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between z-20 shrink-0 shadow-2xs">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer"
          title="Back to Login"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="font-bold text-base text-gray-900 tracking-tight">Create Account</span>

        <ResqShieldLogo size="sm" variant="dark" />
      </div>

      {/* Main Content Form */}
      <div className="p-4 sm:p-5 space-y-4 flex-1">
        <div className="text-center pt-1">
          <h2 className="text-xl font-black text-gray-950 tracking-tight">Join RESQ Network</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Complete your profile for synchronized, rapid emergency dispatch.
          </p>
        </div>

        {/* Global error banner if validation fails */}
        {Object.keys(errors).length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle size={15} />
              <span>Please complete all mandatory fields:</span>
            </div>
            <ul className="list-disc list-inside text-[11px] pl-1 space-y-0.5">
              {Object.values(errors).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Role Pill Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-black uppercase text-gray-700 tracking-wider">
              Account Type / Role
            </label>
            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              {isPatient ? 'Public User' : 'Authorized Personnel'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            {[
              { r: 'PATIENT', label: 'Public / Patient' },
              { r: 'AMBULANCE_DRIVER', label: 'Ambulance EMT' },
              { r: 'HOSPITAL', label: 'Hospital Staff' },
              { r: 'TRAFFIC_POLICE', label: 'Traffic Police' },
              { r: 'ADMIN', label: 'Emergency Admin' }
            ].map(({ r, label }) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r as UserRole)}
                className={`py-2 px-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                  role === r
                    ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-400 shadow-2xs'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* SECTION 1: Personal & Identification Information */}
          <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <UserIcon size={14} className="text-red-600" />
              <span>Personal Details</span>
            </h3>

            {/* Staff ID Number (Mandatory for non-patient) */}
            {!isPatient && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  ID Number <span className="text-red-500 font-bold">* (Required for Staff)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <BadgeAlert size={15} />
                  </div>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Enter Staff / Officer ID (e.g. EMT-4091)"
                    className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 font-mono ${
                      errors.idNumber ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                    }`}
                  />
                </div>
                {errors.idNumber && <p className="text-[10px] text-red-500 mt-1">{errors.idNumber}</p>}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Full Name <span className="text-red-500 font-bold">* Mandatory</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <UserIcon size={15} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                    errors.fullName ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                  }`}
                />
              </div>
              {errors.fullName && <p className="text-[10px] text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Mobile Number <span className="text-red-500 font-bold">* Mandatory</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone size={15} />
                </div>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="Primary mobile (e.g. +1 555-0192)"
                  className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                    errors.mobileNumber ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                  }`}
                />
              </div>
              {errors.mobileNumber && <p className="text-[10px] text-red-500 mt-1">{errors.mobileNumber}</p>}
            </div>

            {/* Alternative Number */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Alternative Number <span className="text-red-500 font-bold">* Mandatory</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <PhoneCall size={15} />
                </div>
                <input
                  type="tel"
                  value={alternativeNumber}
                  onChange={(e) => setAlternativeNumber(e.target.value)}
                  placeholder="Secondary / backup phone number"
                  className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                    errors.alternativeNumber ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                  }`}
                />
              </div>
              {errors.alternativeNumber && <p className="text-[10px] text-red-500 mt-1">{errors.alternativeNumber}</p>}
            </div>

            {/* Personal Email Address */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                {isPatient ? 'Email Address' : 'Personal Email Address'} <span className="text-red-500 font-bold">* Mandatory</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="personal.email@example.com"
                  className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                    errors.personalEmail ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                  }`}
                />
              </div>
              {errors.personalEmail && <p className="text-[10px] text-red-500 mt-1">{errors.personalEmail}</p>}
            </div>

            {/* Work Email (Mandatory for non-patient) */}
            {!isPatient && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Work Email <span className="text-red-500 font-bold">* Mandatory (Official)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={15} />
                  </div>
                  <input
                    type="email"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    placeholder="staff.officer@resq-agency.gov"
                    className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                      errors.workEmail ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                    }`}
                  />
                </div>
                {errors.workEmail && <p className="text-[10px] text-red-500 mt-1">{errors.workEmail}</p>}
              </div>
            )}
          </div>

          {/* SECTION 2: Addresses */}
          <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Home size={14} className="text-red-600" />
              <span>Location &amp; Addresses</span>
            </h3>

            {/* Home Address */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Home Address
              </label>
              <div className="relative">
                <div className="absolute top-2.5 left-3 pointer-events-none text-gray-400">
                  <Home size={15} />
                </div>
                <input
                  type="text"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="Street, Apartment / House No, City, Zip"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Work Address */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Work Address
              </label>
              <div className="relative">
                <div className="absolute top-2.5 left-3 pointer-events-none text-gray-400">
                  <Briefcase size={15} />
                </div>
                <input
                  type="text"
                  value={workAddress}
                  onChange={(e) => setWorkAddress(e.target.value)}
                  placeholder="Office / Station / Hospital / Unit Location"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Emergency Contacts */}
          <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <PhoneCall size={14} className="text-red-600" />
                  <span>Emergency Contact Numbers</span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {isPatient
                    ? 'Provide 1 to 10 contacts. (Mandatory for at least 3 persons)'
                    : 'Provide 1 to 3 contacts. (Mandatory for at least 2 persons)'}
                </p>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200">
                Min {minRequiredContacts} Required
              </span>
            </div>

            {errors.emergencyContacts && (
              <p className="text-[11px] font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                {errors.emergencyContacts}
              </p>
            )}

            {/* List of contact inputs */}
            <div className="space-y-2.5">
              {contacts.map((contact, index) => {
                const isMandatory = index < minRequiredContacts;
                return (
                  <div 
                    key={contact.id || index}
                    className="p-2.5 bg-white rounded-xl border border-gray-200/90 shadow-2xs space-y-2 relative"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 font-mono text-[10px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-bold text-gray-800 text-[11px]">
                          Person #{index + 1} {isMandatory ? <span className="text-red-500">* (Mandatory)</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
                        </span>
                      </div>

                      {contacts.length > minRequiredContacts && !isMandatory && (
                        <button
                          type="button"
                          onClick={() => handleRemoveContactSlot(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Remove Contact"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                        placeholder="Contact Name (e.g. Jane Doe)"
                        className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-red-500"
                      />

                      <input
                        type="text"
                        value={contact.relation}
                        onChange={(e) => handleContactChange(index, 'relation', e.target.value)}
                        placeholder="Relationship (e.g. Spouse)"
                        className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                      placeholder={`Phone Number ${isMandatory ? '* (Required)' : ''}`}
                      className={`w-full px-2.5 py-1.5 bg-gray-50 border rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none font-mono ${
                        isMandatory && !contact.phone.trim() && Object.keys(errors).length > 0
                          ? 'border-red-400 ring-1 ring-red-400'
                          : 'border-gray-200 focus:border-red-500'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Add more emergency contact button if under max limit */}
            {contacts.length < maxContactsAllowed && (
              <button
                type="button"
                onClick={handleAddContactSlot}
                className="w-full py-2 bg-white hover:bg-red-50/60 active:scale-[0.99] border border-dashed border-red-300 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={14} />
                <span>+ Add Emergency Contact ({contacts.length}/{maxContactsAllowed})</span>
              </button>
            )}
          </div>

          {/* SECTION 4: Security & Password */}
          <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Lock size={14} className="text-red-600" />
              <span>Password &amp; Security</span>
            </h3>

            {/* Create Password */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Create Password <span className="text-red-500 font-bold">* Mandatory</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={`w-full pl-9 pr-10 py-2 bg-white border rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                    errors.password ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-500 mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Confirm Password <span className="text-red-500 font-bold">* Mandatory</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={15} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full pl-9 pr-10 py-2 bg-white border rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                    errors.confirmPassword ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-[10px] text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="flex items-start gap-2 pt-1 text-xs text-gray-600">
            <input
              type="checkbox"
              id="termsAgreement"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="termsAgreement" className="leading-snug cursor-pointer">
              I agree to the{' '}
              <span className="text-red-600 font-bold hover:underline">Terms &amp; Conditions</span> and{' '}
              <span className="text-red-600 font-bold hover:underline">Emergency Privacy Protocol</span>
            </label>
          </div>
          {errors.terms && <p className="text-[10px] text-red-500">{errors.terms}</p>}

          {/* Primary Create Account Button */}
          <button
            type="submit"
            className="w-full mt-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black py-3.5 rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer text-sm tracking-wide flex items-center justify-center gap-2"
          >
            <span>CREATE ACCOUNT</span>
          </button>
        </form>

        {/* Footer Link to Login */}
        <div className="text-center pt-2 pb-3">
          <p className="text-xs text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onLoginClick}
              className="text-red-600 font-black hover:underline cursor-pointer ml-1"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
