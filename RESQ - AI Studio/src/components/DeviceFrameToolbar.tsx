import React from 'react';
import { 
  Smartphone, 
  ZoomIn, 
  ZoomOut, 
  SlidersHorizontal, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown, 
  Layers, 
  AlignJustify, 
  Maximize2,
  Check
} from 'lucide-react';
import { DevicePreset, FrameFinish, NotchStyle, DeviceSettings } from '../types';

interface DeviceFrameToolbarProps {
  settings: DeviceSettings;
  onChange: (updated: Partial<DeviceSettings>) => void;
  onReset: () => void;
}

export const PRESET_DIMENSIONS: Record<DevicePreset, { width: number; height: number; notch: NotchStyle }> = {
  'iPhone 16': { width: 430, height: 932, notch: 'Dynamic Island' },
  'Galaxy S24': { width: 412, height: 915, notch: 'Punch Hole' },
  'Pixel 8': { width: 412, height: 892, notch: 'Punch Hole' },
  'Compact': { width: 375, height: 667, notch: 'Classic Notch' },
  'Tablet': { width: 768, height: 1024, notch: 'None' },
  'Full View': { width: 0, height: 0, notch: 'None' }
};

export default function DeviceFrameToolbar({
  settings,
  onChange,
  onReset
}: DeviceFrameToolbarProps) {
  const presets: DevicePreset[] = ['iPhone 16', 'Galaxy S24', 'Pixel 8', 'Compact', 'Tablet', 'Full View'];
  const finishes: { id: FrameFinish; label: string; dotColor: string }[] = [
    { id: 'Titanium', label: 'Titanium', dotColor: 'bg-slate-700' },
    { id: 'Midnight', label: 'Midnight', dotColor: 'bg-black' },
    { id: 'Silver', label: 'Silver', dotColor: 'bg-slate-300' },
    { id: 'Gold', label: 'Gold', dotColor: 'bg-amber-500' },
    { id: 'Borderless', label: 'Borderless', dotColor: 'bg-transparent border border-slate-400' }
  ];

  const handleSelectPreset = (p: DevicePreset) => {
    const dim = PRESET_DIMENSIONS[p];
    onChange({
      preset: p,
      width: dim.width,
      height: dim.height,
      notch: dim.notch,
      frameEnabled: p !== 'Full View'
    });
  };

  const handleZoomChange = (delta: number) => {
    const newZoom = Math.min(Math.max(Number((settings.zoom + delta).toFixed(2)), 0.5), 1.5);
    onChange({ zoom: newZoom });
  };

  return (
    <div className="w-full bg-white border-b border-blue-100 shadow-xs select-none sticky top-0 z-40 transition-all font-sans text-slate-800">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Device Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-slate-600 font-semibold text-xs mr-1">
            <Smartphone size={15} className="text-slate-500" />
            <span>Device:</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {presets.map((p) => {
              const isSelected = settings.preset === p;
              return (
                <button
                  key={p}
                  onClick={() => handleSelectPreset(p)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-600 border border-blue-300 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Zoom & Settings Toggle */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs text-slate-700 font-semibold gap-1.5 shadow-2xs">
            <button
              onClick={() => handleZoomChange(-0.1)}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-mono text-[11px] min-w-[36px] text-center font-bold">
              {Math.round(settings.zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoomChange(0.1)}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            {settings.zoom !== 1 && (
              <button
                onClick={() => onChange({ zoom: 1 })}
                className="text-[10px] text-blue-600 hover:underline ml-0.5 font-mono"
              >
                100%
              </button>
            )}
          </div>

          {/* Settings Drawer Toggle */}
          <button
            onClick={() => onChange({ isSettingsOpen: !settings.isSettingsOpen })}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              settings.isSettingsOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-blue-50/80 text-blue-600 border-blue-200 hover:bg-blue-100/70'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Settings</span>
            {settings.isSettingsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expandable Settings Drawer matching uploaded image design */}
      {settings.isSettingsOpen && (
        <div className="bg-slate-50/70 border-t border-slate-200 px-3 py-3 animate-fade-in">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Box 1: Dimensions */}
            <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">Dimensions</span>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {settings.preset === 'Full View' ? 'Fluid (100%)' : `${settings.width} × ${settings.height}px`}
                </span>
              </div>

              <div className="space-y-2">
                {/* Width Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium w-12 shrink-0">Width:</span>
                  <input
                    type="range"
                    min={320}
                    max={1024}
                    step={2}
                    value={settings.width || 430}
                    disabled={settings.preset === 'Full View'}
                    onChange={(e) => onChange({ width: Number(e.target.value), preset: 'iPhone 16' })}
                    className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                  <span className="text-[11px] font-mono text-slate-600 w-10 text-right">
                    {settings.preset === 'Full View' ? '100%' : `${settings.width}px`}
                  </span>
                </div>

                {/* Height Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium w-12 shrink-0">Height:</span>
                  <input
                    type="range"
                    min={500}
                    max={1200}
                    step={2}
                    value={settings.height || 932}
                    disabled={settings.preset === 'Full View'}
                    onChange={(e) => onChange({ height: Number(e.target.value), preset: 'iPhone 16' })}
                    className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                  <span className="text-[11px] font-mono text-slate-600 w-10 text-right">
                    {settings.preset === 'Full View' ? '100%' : `${settings.height}px`}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Frame & Notch */}
            <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-900 mb-2">Frame & Notch</span>

              <div className="space-y-2.5">
                {/* Finishes */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {finishes.map((f) => {
                    const isSelected = settings.finish === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onChange({ finish: f.id })}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${f.dotColor}`} />
                        <span>{f.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Notch Select */}
                <select
                  value={settings.notch}
                  onChange={(e) => onChange({ notch: e.target.value as NotchStyle })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Dynamic Island">Dynamic Island (iOS)</option>
                  <option value="Punch Hole">Punch Hole (Android)</option>
                  <option value="Classic Notch">Classic Notch</option>
                  <option value="Waterdrop Notch">Waterdrop Notch</option>
                  <option value="None">None (Bezel-less / Clean)</option>
                </select>
              </div>
            </div>

            {/* Box 3: Centered, Frame Toggle & Reset */}
            <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-2xs flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {/* Centered / Left Toggle */}
                <button
                  onClick={() => onChange({ centered: !settings.centered })}
                  className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 font-semibold text-xs border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <AlignJustify size={13} />
                  <span>{settings.centered ? 'Centered' : 'Left-aligned'}</span>
                </button>

                {/* Frame ON / OFF Toggle */}
                <button
                  onClick={() => onChange({ frameEnabled: !settings.frameEnabled })}
                  className={`py-1.5 px-2 active:scale-95 font-semibold text-xs border rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    settings.frameEnabled
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Layers size={13} />
                  <span>{settings.frameEnabled ? 'Frame ON' : 'Frame OFF'}</span>
                </button>
              </div>

              {/* Reset Frame Button */}
              <button
                onClick={onReset}
                className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset Frame</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
