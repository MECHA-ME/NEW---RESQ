#!/bin/bash

# Fix App.tsx
sed -i 's/<div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 font-sans text-brand-text">/<div className="min-h-screen bg-gray-200 flex items-center justify-center sm:p-6 font-sans text-brand-text">/g' src/App.tsx
sed -i 's/<div className="max-w-4xl w-full">/<div className="w-full max-w-[420px] bg-brand-bg h-[100dvh] sm:h-[850px] sm:rounded-[2.5rem] sm:border-[12px] border-gray-900 shadow-2xl flex flex-col relative overflow-hidden"><div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">/g' src/App.tsx
sed -i 's/<div className="text-center mb-12">/<div className="text-center mb-8"><div className="w-16 h-16 rounded-2xl bg-navy text-white flex items-center justify-center font-bold text-3xl mx-auto mb-4 shadow-lg">Q<\/div>/g' src/App.tsx
sed -i 's/<h1 className="text-4xl font-bold text-navy mb-4 tracking-tight">Q-ARES<\/h1>/<h1 className="text-2xl font-bold text-navy mb-2 tracking-tight">Q-ARES<\/h1>/g' src/App.tsx
sed -i 's/<p className="text-lg text-brand-muted">Quick-Assisted Rapid Response & Emergency Synchronisation<\/p>/<p className="text-sm text-brand-muted">Emergency Synchronisation<\/p>/g' src/App.tsx
sed -i 's/<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">/<div className="grid grid-cols-2 gap-4">/g' src/App.tsx

sed -i 's/    <div className="min-h-screen bg-brand-bg font-sans text-brand-text flex flex-col">/    <div className="min-h-screen bg-gray-200 flex items-center justify-center sm:p-6 font-sans text-brand-text">\n      <div className="w-full max-w-[420px] bg-brand-bg h-[100dvh] sm:h-[850px] sm:rounded-[2.5rem] sm:border-[12px] border-gray-900 shadow-2xl flex flex-col relative overflow-hidden">/g' src/App.tsx

sed -i 's/<header className="bg-navy text-white px-6 py-4 flex items-center justify-between shadow-sm z-10">/<header className="bg-navy text-white px-4 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">/g' src/App.tsx

sed -i 's/<div className="flex items-center gap-3">/<div className="flex items-center gap-2">/g' src/App.tsx
sed -i 's/<h1 className="font-bold text-lg tracking-tight">Q-ARES<\/h1>/<h1 className="font-bold text-base tracking-tight">Q-ARES<\/h1>/g' src/App.tsx
sed -i 's/<span className="text-sm font-medium text-gray-300">Live Sync<\/span>//g' src/App.tsx
sed -i 's/<div className="h-4 w-px bg-gray-600" \/>//g' src/App.tsx
sed -i 's/<button \n            onClick={() => setRole(null)}\n            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"\n          >\n            Switch Role\n          <\/button>/<button onClick={() => setRole(null)} className="text-xs font-medium text-gray-300 hover:text-white transition-colors border border-gray-600 rounded px-2 py-1">Exit<\/button>/g' src/App.tsx

sed -i 's/<main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">/<main className="flex-1 overflow-y-auto p-4 w-full relative">/g' src/App.tsx
sed -i 's/      <\/main>\n    <\/div>\n  );/      <\/main>\n      <\/div>\n    <\/div>\n  );/g' src/App.tsx

# Fix RoleCard
sed -i 's/p-6 rounded-2xl bg-white border border-brand-border flex flex-col items-center justify-center gap-4 transition-all duration-200 transform hover:-translate-y-1 hover:border-brand-blue hover:shadow-md/p-4 rounded-2xl bg-white border border-brand-border flex flex-col items-center justify-center gap-3 transition-all duration-200 active:scale-95/g' src/App.tsx
sed -i 's/size={48}/size={32}/g' src/App.tsx
sed -i 's/<span className="font-bold text-lg text-brand-text">{title}<\/span>/<span className="font-bold text-sm text-brand-text text-center leading-tight">{title}<\/span>/g' src/App.tsx

# Fix Dashboards sizing & layout
sed -i 's/max-w-2xl mx-auto mt-8/w-full/g' src/components/PatientDashboard.tsx
sed -i 's/max-w-3xl mx-auto/w-full/g' src/components/PatientDashboard.tsx
sed -i 's/max-w-4xl mx-auto/w-full/g' src/components/PatientDashboard.tsx
sed -i 's/max-w-6xl mx-auto/w-full/g' src/components/PatientDashboard.tsx

sed -i 's/max-w-2xl mx-auto mt-8/w-full/g' src/components/AmbulanceDashboard.tsx
sed -i 's/max-w-3xl mx-auto/w-full/g' src/components/AmbulanceDashboard.tsx
sed -i 's/sm:flex-row/flex-col/g' src/components/AmbulanceDashboard.tsx
sed -i 's/sm:grid-cols-2/grid-cols-1/g' src/components/AmbulanceDashboard.tsx
sed -i 's/w-full sm:w-auto/w-full/g' src/components/AmbulanceDashboard.tsx

sed -i 's/max-w-3xl mx-auto/w-full/g' src/components/FireRescueDashboard.tsx
sed -i 's/sm:flex-row/flex-col/g' src/components/FireRescueDashboard.tsx
sed -i 's/sm:grid-cols-2/grid-cols-1/g' src/components/FireRescueDashboard.tsx
sed -i 's/w-full sm:w-auto/w-full/g' src/components/FireRescueDashboard.tsx

sed -i 's/max-w-4xl mx-auto/w-full/g' src/components/HospitalDashboard.tsx
sed -i 's/md:grid-cols-2/grid-cols-1/g' src/components/HospitalDashboard.tsx
sed -i 's/md:flex-row/flex-col/g' src/components/HospitalDashboard.tsx

sed -i 's/max-w-4xl mx-auto/w-full/g' src/components/TrafficPoliceDashboard.tsx
sed -i 's/md:flex-row/flex-col/g' src/components/TrafficPoliceDashboard.tsx
sed -i 's/md:items-center/items-start/g' src/components/TrafficPoliceDashboard.tsx

sed -i 's/max-w-6xl mx-auto/w-full/g' src/components/AdminDashboard.tsx
sed -i 's/lg:grid-cols-3/grid-cols-1/g' src/components/AdminDashboard.tsx
sed -i 's/lg:col-span-2/col-span-1/g' src/components/AdminDashboard.tsx
sed -i 's/flex justify-between items-center mb-8/flex flex-col gap-4 items-start mb-6/g' src/components/AdminDashboard.tsx

