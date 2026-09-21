import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Incident, UserRole, User } from '../types';
import { 
  Navigation, 
  MapPin, 
  Truck, 
  Hospital as HospitalIcon, 
  ShieldAlert, 
  Radio, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Compass, 
  Zap, 
  Clock, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface LiveEmergencyMapProps {
  incident: Incident;
  role: UserRole;
  users?: User[];
  height?: string;
  showControls?: boolean;
  onCorridorAction?: (incidentId: string, action: 'ACKNOWLEDGE' | 'SYNC_ALL_GREEN' | 'DISPATCH_ESCORT') => void;
}

// Realistic San Francisco Emergency Route Coordinates
const ROUTE_PHASE_1_COORDS: [number, number][] = [
  [37.7879, -122.4075], // EMS Central Station (Mission & 4th)
  [37.7858, -122.4060], // 4th & Market St
  [37.7840, -122.4085], // 5th & Market St (Junction 1)
  [37.7820, -122.4110], // 6th & Market St
  [37.7802, -122.4135], // 7th & Market St (Junction 2)
  [37.7788, -122.4155], // 8th & Hyde St (Junction 3)
  [37.7793, -122.4162], // Patient Location: 1090 Market St (Civic Center)
];

const ROUTE_PHASE_2_COORDS: [number, number][] = [
  [37.7793, -122.4162], // Patient Location: 1090 Market St
  [37.7770, -122.4190], // 9th & Market St
  [37.7735, -122.4160], // 10th & Mission St
  [37.7695, -122.4115], // 13th & Division St (Express Ramp)
  [37.7650, -122.4070], // US-101 S Corridor Preempted Lane
  [37.7600, -122.4060], // Potrero Ave & 16th St
  [37.7570, -122.4055], // Potrero Ave & 20th St
  [37.7554, -122.4047], // SF General Trauma Center (ED Gate)
];

export default function LiveEmergencyMap({
  incident,
  role,
  users = [],
  height = '320px',
  showControls = true,
  onCorridorAction
}: LiveEmergencyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    tileLayer?: L.TileLayer;
    routePolyline?: L.Polyline;
    ambulanceMarker?: L.Marker;
    patientMarker?: L.Marker;
    hospitalMarker?: L.Marker;
    junctionMarkers?: L.Marker[];
  }>({});

  const [mapStyle, setMapStyle] = useState<'streets' | 'tactical' | 'satellite'>('streets');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0.4); // 0 to 1 along route
  const [isSimulating, setIsSimulating] = useState(true);

  // Determine current route phase
  const isPhase2 = incident.status === 'PATIENT_PICKED' || 
                   incident.status === 'IN_TRANSIT' || 
                   incident.status === 'REACHED_DESTINATION' || 
                   incident.status === 'COMPLETED';

  const activeRouteCoords = isPhase2 ? ROUTE_PHASE_2_COORDS : ROUTE_PHASE_1_COORDS;
  const responder = users.find(u => u.id === incident.assignedResponderId);
  const hospital = users.find(u => u.id === incident.selectedHospitalId);

  // Calculate vehicle position along route based on progress
  const getInterpolatedPosition = (coords: [number, number][], progress: number): [number, number] => {
    if (coords.length === 0) return [37.7793, -122.4162];
    if (progress <= 0) return coords[0];
    if (progress >= 1) return coords[coords.length - 1];

    const totalSegments = coords.length - 1;
    const segmentIndex = Math.floor(progress * totalSegments);
    const segmentFraction = (progress * totalSegments) - segmentIndex;

    const p1 = coords[segmentIndex];
    const p2 = coords[Math.min(segmentIndex + 1, coords.length - 1)];

    const lat = p1[0] + (p2[0] - p1[0]) * segmentFraction;
    const lng = p1[1] + (p2[1] - p1[1]) * segmentFraction;
    return [lat, lng];
  };

  const currentAmbulancePos = getInterpolatedPosition(activeRouteCoords, simulationProgress);

  // Live simulation tick effect
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimulationProgress(prev => {
        if (prev >= 1) {
          return 0; // loop simulation
        }
        return Math.min(1, prev + 0.015);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Sync simulation progress with incident status
  useEffect(() => {
    switch (incident.status) {
      case 'RESPONDER_EN_ROUTE':
        setSimulationProgress(0.35);
        break;
      case 'HOSPITAL_SELECTED':
        setSimulationProgress(0.7);
        break;
      case 'PATIENT_PICKED':
        setSimulationProgress(0.1);
        break;
      case 'IN_TRANSIT':
        setSimulationProgress(0.55);
        break;
      case 'REACHED_DESTINATION':
      case 'COMPLETED':
        setSimulationProgress(1.0);
        break;
    }
  }, [incident.status]);

  // Initialize and Update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if container changed
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center on San Francisco Civic Center / Mission
    const map = L.map(mapContainerRef.current, {
      center: currentAmbulancePos,
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // Add Tile Layer
    const tileUrls = {
      streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      tactical: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };

    const tileLayer = L.tileLayer(tileUrls[mapStyle], {
      maxZoom: 19,
      crossOrigin: true
    }).addTo(map);

    layersRef.current.tileLayer = tileLayer;

    // Route Polyline (Emergency Green Wave glow path)
    const routePolyline = L.polyline(activeRouteCoords, {
      color: isPhase2 ? '#059669' : '#2563eb',
      weight: 6,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '10, 8'
    }).addTo(map);

    layersRef.current.routePolyline = routePolyline;

    // 1. Patient Marker
    const patientPos: [number, number] = [37.7793, -122.4162];
    const patientHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-red-500/30 animate-ping"></div>
        <div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black">
          SOS
        </div>
        <div class="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-900/90 text-white text-[9px] font-bold shadow">
          Patient Location
        </div>
      </div>
    `;

    const patientIcon = L.divIcon({
      html: patientHtml,
      className: 'custom-patient-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const patientMarker = L.marker(patientPos, { icon: patientIcon })
      .bindPopup(`<b>Incident Location</b><br/>${incident.address || '1090 Market St, SF'}`)
      .addTo(map);

    layersRef.current.patientMarker = patientMarker;

    // 2. Hospital Marker (if selected or general trauma center)
    const hospitalPos: [number, number] = [37.7554, -122.4047];
    const hospitalName = hospital?.name || 'SF General Trauma Center';
    const hospitalHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-xl bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black">
          H
        </div>
        <div class="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-full bg-emerald-950 text-white text-[9px] font-bold shadow border border-emerald-500/40">
          ${hospitalName.split(' ')[0]} Hospital
        </div>
      </div>
    `;

    const hospitalIcon = L.divIcon({
      html: hospitalHtml,
      className: 'custom-hospital-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const hospitalMarker = L.marker(hospitalPos, { icon: hospitalIcon })
      .bindPopup(`<b>${hospitalName}</b><br/>Level 1 Trauma Center • ER Active`)
      .addTo(map);

    layersRef.current.hospitalMarker = hospitalMarker;

    // 3. Traffic Preemption Junctions along route
    const junctions = incident.greenCorridor?.junctions || [
      { id: 'j-01', name: '5th & Market St', status: 'GREEN', etaSeconds: 30 },
      { id: 'j-02', name: '7th & Market St', status: 'GREEN', etaSeconds: 75 },
      { id: 'j-03', name: '8th & Hyde Intersect', status: 'CLEARING', etaSeconds: 120 },
    ];

    const junctionCoords: [number, number][] = [
      [37.7840, -122.4085],
      [37.7802, -122.4135],
      [37.7788, -122.4155],
    ];

    const junctionMarkers: L.Marker[] = [];

    junctions.forEach((j, idx) => {
      if (idx < junctionCoords.length) {
        const jPos = junctionCoords[idx];
        const isGreen = j.status === 'GREEN';
        const jHtml = `
          <div class="relative flex flex-col items-center">
            <div class="w-5 h-5 rounded-full ${isGreen ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 shadow-amber-500/50'} border-2 border-white shadow-md flex items-center justify-center text-white text-[8px] font-black">
              ${isGreen ? '🟢' : '🟡'}
            </div>
            <div class="whitespace-nowrap px-1.5 py-0.2 mt-0.5 rounded bg-slate-900/80 text-white text-[8px] font-bold">
              ${j.name.split('&')[0]}
            </div>
          </div>
        `;
        const jIcon = L.divIcon({
          html: jHtml,
          className: 'custom-junction-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const jMarker = L.marker(jPos, { icon: jIcon })
          .bindPopup(`<b>${j.name}</b><br/>Preemption: ${j.status}<br/>ETA: ${j.etaSeconds}s`)
          .addTo(map);
        junctionMarkers.push(jMarker);
      }
    });

    layersRef.current.junctionMarkers = junctionMarkers;

    // 4. Moving Ambulance Marker
    const responderName = responder?.name || 'Ambulance Unit 1';
    const ambulanceHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-pulse"></div>
        <div class="w-9 h-9 rounded-full bg-slate-950 border-2 border-blue-400 shadow-xl flex items-center justify-center text-white text-xs font-bold ring-2 ring-red-500/80">
          🚑
        </div>
        <div class="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black shadow flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
          ${responderName}
        </div>
      </div>
    `;

    const ambulanceIcon = L.divIcon({
      html: ambulanceHtml,
      className: 'custom-ambulance-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const ambulanceMarker = L.marker(currentAmbulancePos, { icon: ambulanceIcon, zIndexOffset: 1000 })
      .bindPopup(`<b>${responderName}</b><br/>Status: ${incident.status}<br/>Speed: 68 km/h`)
      .addTo(map);

    layersRef.current.ambulanceMarker = ambulanceMarker;

    // Fit bounds smoothly to include active route
    try {
      const bounds = L.latLngBounds(activeRouteCoords);
      map.fitBounds(bounds, { padding: [30, 30] });
    } catch (e) {
      // fallback
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapStyle, isPhase2]);

  // Update ambulance marker live position as progress advances
  useEffect(() => {
    if (layersRef.current.ambulanceMarker) {
      layersRef.current.ambulanceMarker.setLatLng(currentAmbulancePos);
    }
  }, [simulationProgress]);

  // Recenter helper
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(currentAmbulancePos, 16, { animate: true });
  };

  // Fit all bounds
  const handleFitRoute = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds(activeRouteCoords);
    mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
  };

  // Estimated stats
  const remainingFraction = 1 - simulationProgress;
  const remainingDistanceKm = (remainingFraction * (isPhase2 ? 3.8 : 2.2)).toFixed(1);
  const remainingMinutes = Math.max(1, Math.ceil(Number(remainingDistanceKm) * 1.5));

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-slate-900 ${
      isFullscreen ? 'fixed inset-2 z-[9999] h-[calc(100vh-16px)]' : ''
    }`} style={{ height: isFullscreen ? 'auto' : height }}>
      
      {/* Top Telemetry & Direction Banner Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        {/* Role-Specific Live HUD */}
        <div className="bg-slate-950/90 backdrop-blur-md text-white p-2.5 rounded-xl border border-white/15 shadow-xl flex items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isPhase2 ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
            }`}>
              {isPhase2 ? <HospitalIcon size={16} /> : <Truck size={16} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  {isPhase2 ? 'PHASE 2: TO HOSPITAL' : 'PHASE 1: TO PATIENT'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <p className="text-xs font-bold truncate text-white">
                {isPhase2 
                  ? `Routing to ${hospital?.name || 'SF General Hospital'}`
                  : `Approaching ${incident.address || '1090 Market Street'}`}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-mono font-black text-amber-400">
              ~{remainingMinutes} min
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {remainingDistanceKm} km left
            </div>
          </div>
        </div>

        {/* Green Corridor Protection Notice for Traffic & Driver */}
        {incident.greenCorridor?.required && (
          <div className="bg-emerald-950/90 backdrop-blur-xs text-emerald-200 px-3 py-1 rounded-lg border border-emerald-500/30 text-[10px] font-bold flex items-center justify-between shadow pointer-events-auto">
            <span className="flex items-center gap-1.5">
              <Zap size={11} className="text-emerald-400 fill-current" />
              Green Corridor Active: Signals Preempted
            </span>
            <span className="text-emerald-300 font-mono">68 km/h</span>
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[220px] bg-slate-900 z-10" />

      {/* Bottom Floating Map Controls */}
      {showControls && (
        <div className="absolute bottom-2.5 right-2.5 z-[1000] flex flex-col gap-1.5">
          {/* Recenter button */}
          <button
            onClick={handleRecenter}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-800 shadow-lg border border-gray-200 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            title="Recenter on Ambulance"
          >
            <Compass size={16} />
          </button>

          {/* Fit Route button */}
          <button
            onClick={handleFitRoute}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-800 shadow-lg border border-gray-200 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            title="View Entire Route"
          >
            <Navigation size={15} />
          </button>

          {/* Map style toggle */}
          <button
            onClick={() => setMapStyle(prev => prev === 'streets' ? 'tactical' : prev === 'tactical' ? 'satellite' : 'streets')}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-800 shadow-lg border border-gray-200 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            title={`Layer: ${mapStyle}`}
          >
            <Layers size={15} />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-800 shadow-lg border border-gray-200 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Map"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      )}

      {/* Bottom-Left Quick Action for Traffic Police Role */}
      {role === 'TRAFFIC_POLICE' && onCorridorAction && (
        <div className="absolute bottom-2.5 left-2.5 z-[1000] flex items-center gap-1.5">
          <button
            onClick={() => onCorridorAction(incident.id, 'SYNC_ALL_GREEN')}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-[10px] font-black shadow-lg flex items-center gap-1 cursor-pointer transition-all border border-emerald-400/40"
          >
            <Zap size={11} className="fill-current" />
            <span>Force 100% Green</span>
          </button>
        </div>
      )}

      {/* Bottom-Left Live Progress Slider for Interactive Simulation Testing */}
      <div className="absolute bottom-2.5 left-2.5 z-[990] bg-slate-950/80 backdrop-blur-xs px-2 py-1 rounded-lg border border-white/10 text-white flex items-center gap-2 max-w-[170px]">
        <button
          onClick={() => setIsSimulating(p => !p)}
          className="text-[9px] font-bold text-slate-300 hover:text-white"
          title="Play/Pause Movement Simulation"
        >
          {isSimulating ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={simulationProgress}
          onChange={(e) => {
            setIsSimulating(false);
            setSimulationProgress(parseFloat(e.target.value));
          }}
          className="w-16 h-1 bg-slate-700 rounded-lg accent-emerald-500 cursor-pointer"
          title="Drag to simulate ambulance moving along route"
        />
        <span className="text-[9px] font-mono text-emerald-400">
          {Math.round(simulationProgress * 100)}%
        </span>
      </div>

    </div>
  );
}
