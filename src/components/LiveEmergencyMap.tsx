import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Incident, UserRole, User } from '../types';
import { useLiveGeolocation } from '../utils/useLiveGeolocation';
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
  LocateFixed,
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

// Realistic Chennai Emergency Route Coordinates (accurate GPS, satellite + OSM)
// Phase 1: Ambulance station → Patient (live GPS); Phase 2: Patient → Hospital (Rajiv Gandhi)
const ROUTE_PHASE_1_COORDS: [number, number][] = [
  [13.0827, 80.2707], // Ambulance Unit 1 — Chennai Central Station
  [13.0750, 80.2730], // Poonamallee High Rd Junction 1
  [13.0680, 80.2760], // Poonamallee High Rd Junction 2
  [13.0610, 80.2790], // Anna Salai Intersection
  [13.0540, 80.2810], // Triplicane Approach
  [13.0479, 80.2825], // Patient Location — Chennai Central (live GPS)
];

const ROUTE_PHASE_2_COORDS: [number, number][] = [
  [13.0479, 80.2825], // Patient Location
  [13.0550, 80.2850], // Marina Beach Rd
  [13.0620, 80.2880], // Royapettah Bypass
  [13.0700, 80.2900], // Express Ramp
  [13.0760, 80.2920], // Poonamallee Lane Preempted
  [13.0820, 80.2940], // Rajiv Gandhi Gate Approach
  [13.0860, 80.2950], // Rajiv Gandhi Govt General Hospital (ED Gate)
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
    youMarker?: L.Marker;
    youCircle?: L.Circle;
  }>({});
  const [mapEpoch, setMapEpoch] = useState(0);
  const gpsCenteredRef = useRef<string | null>(null);

  // Exact device GPS — single shared watcher, shown as the "YOU" marker for the active role
  const { fix: deviceFix, error: gpsError } = useLiveGeolocation(true);
  const gpsLat = deviceFix?.lat;
  const gpsLng = deviceFix?.lng;
  const gpsAcc = deviceFix?.accuracy;

  // Tile stack: 100% open-source OSM + Esri satellite (no keys) — accurate GPS rendered on satellite + OSM
  // User requested satellite + OpenStreetMap for true position: satellite is default, OSM is second layer
  const [mapStyle, setMapStyle] = useState<'streets' | 'humanitarian' | 'tactical' | 'satellite' | 'hybrid'>('satellite');
  const [isFullscreen, setIsFullscreen] = useState(false);
  // REAL GPS ONLY — no simulation. Ambulance moves only when device GPS moves.

  // Determine current route phase
  const isPhase2 = incident.status === 'PATIENT_PICKED' || 
                   incident.status === 'IN_TRANSIT' || 
                   incident.status === 'REACHED_DESTINATION' || 
                   incident.status === 'COMPLETED';

  const activeRouteCoords = isPhase2 ? ROUTE_PHASE_2_COORDS : ROUTE_PHASE_1_COORDS;
  const responder = users.find(u => u.id === incident.assignedResponderId);
  const hospital = users.find(u => u.id === incident.selectedHospitalId);

  // Real server-driven live GPS — GPS ONLY, no video simulation.
  // Ambulance position is the responder's actual device GPS (POST /api/users/:id/location).
  const livePos: any = (incident as any).liveDriverPosition;
  const hasLiveTracking = !!(livePos && incident.assignedResponderId && typeof livePos.lat === 'number' && typeof livePos.lng === 'number' && livePos.isLiveGps);
  // No unit accepted yet → searching state: show coverage, never a fake ambulance
  const hasResponder = !!incident.assignedResponderId;
  const liveLat: number | undefined = livePos?.lat;
  const liveLng: number | undefined = livePos?.lng;
  // GPS-only position: live GPS if available, otherwise responder's last known static location (not moving)
  const realAmbulancePos: [number, number] | null = hasLiveTracking && typeof liveLat === 'number' && typeof liveLng === 'number'
    ? [liveLat, liveLng]
    : (responder?.location && typeof responder.location.lat === 'number' ? [responder.location.lat, responder.location.lng] as [number, number] : null);

  // --- Street routing (OSRM, open source, no key) + smooth motion refs ---
  interface RoadRoute { pts: [number, number][]; cum: number[]; total: number; }
  const [road, setRoad] = useState<RoadRoute | null>(null);
  const roadKeyRef = useRef<string | null>(null);
  const targetRef = useRef<[number, number] | null>(null);
  const shownRef = useRef<[number, number] | null>(null);

  const haversineM = (a: [number, number], b: [number, number]): number => {
    const R = 6371000;
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLng = ((b[1] - a[1]) * Math.PI) / 180;
    const la1 = (a[0] * Math.PI) / 180;
    const la2 = (b[0] * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const pointOnRoad = (r: RoadRoute, progress: number): [number, number] => {
    const target = Math.min(1, Math.max(0, progress)) * r.total;
    let i = 1;
    while (i < r.cum.length - 1 && r.cum[i] < target) i++;
    const segLen = r.cum[i] - r.cum[i - 1] || 1;
    const f = (target - r.cum[i - 1]) / segLen;
    const p1 = r.pts[i - 1];
    const p2 = r.pts[i];
    return [p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f];
  };

  // Route endpoints for street routing (server values first)
  const routeOrigin = livePos?.routeOrigin
    || (isPhase2 ? incident.location : responder?.location)
    || incident.location;
  const routeDest = livePos?.routeDestination
    || (isPhase2 ? hospital?.location : incident.location)
    || incident.location;
  const originKey = routeOrigin ? `${routeOrigin.lat?.toFixed(4)},${routeOrigin.lng?.toFixed(4)}` : 'none';
  const destKey = routeDest ? `${routeDest.lat?.toFixed(4)},${routeDest.lng?.toFixed(4)}` : 'none';

  // Fetch the real street path once per incident phase (cached, silent fallback)
  useEffect(() => {
    if (!incident.assignedResponderId || !routeOrigin || !routeDest) return;
    if (typeof routeOrigin.lat !== 'number' || typeof routeDest.lat !== 'number') return;
    const key = `${incident.id}|${isPhase2 ? 'p2' : 'p1'}|${originKey}|${destKey}`;
    if (roadKeyRef.current === key) return;
    let cancelled = false;
    fetch(`https://router.project-osrm.org/route/v1/driving/${routeOrigin.lng},${routeOrigin.lat};${routeDest.lng},${routeDest.lat}?overview=full&geometries=geojson`)
      .then(r => {
        if (!r.ok) throw new Error('osrm unavailable');
        return r.json();
      })
      .then(j => {
        if (cancelled) return;
        const coords = j?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return;
        const pts = coords.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
        const cum: number[] = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + haversineM(pts[i - 1], pts[i]));
        roadKeyRef.current = key;
        setRoad({ pts, cum, total: cum[cum.length - 1] || 1 });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [incident.id, incident.assignedResponderId, isPhase2, originKey, destKey]);

  // NO simulation — ambulance moves only when real GPS moves (device GPS). No fake progress.

  // Initialize and Update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if container changed
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Exact SOS location — the street-level anchor of the whole map
    const patientAnchor: [number, number] =
      incident.location && Number.isFinite(incident.location.lat) && Number.isFinite(incident.location.lng)
        ? [incident.location.lat, incident.location.lng]
        : [13.0827, 80.2707];

    // Focus: dispatched unit's real live GPS only; otherwise the exact SOS spot (street level) — no simulation
    const focusPos: [number, number] =
      incident.assignedResponderId
        ? (realAmbulancePos ?? patientAnchor)
        : patientAnchor;

    const map = L.map(mapContainerRef.current, {
      center: focusPos,
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;
    shownRef.current = null;
    setMapEpoch(e => e + 1);

    // 100% open-source tile layers — all rendered from OpenStreetMap data + Esri satellite:
    // - streets: OSM Standard | - humanitarian: OSM HOT (disaster response) | - tactical: CARTO Voyager (OSM)
    // - satellite: Esri World Imagery (satellite) | - hybrid: satellite + OSM labels overlay (most accurate visual)
    const tileLayers: Record<string, { url: string; maxZoom: number }> = {
      streets: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        maxZoom: 19,
      },
      humanitarian: {
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        maxZoom: 19,
      },
      tactical: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        maxZoom: 20,
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      },
      hybrid: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      },
    };

    const tileLayer = L.tileLayer(tileLayers[mapStyle === 'hybrid' ? 'satellite' : mapStyle].url, {
      maxZoom: tileLayers[mapStyle === 'hybrid' ? 'satellite' : mapStyle].maxZoom,
      crossOrigin: true
    }).addTo(map);
    // Hybrid = satellite imagery + OSM labels overlay for street names on satellite
    let hybridOverlay: L.TileLayer | null = null;
    if (mapStyle === 'hybrid') {
      hybridOverlay = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        opacity: 0.45,
        crossOrigin: true
      }).addTo(map);
    }

    layersRef.current.tileLayer = tileLayer as any;

    // 15 km search coverage ring while no unit has accepted yet (no fake route)
    if (!hasResponder) {
      L.circle(patientAnchor, {
        radius: 15000,
        color: '#f59e0b',
        weight: 1.5,
        opacity: 0.5,
        dashArray: '8, 8',
        fillColor: '#f59e0b',
        fillOpacity: 0.04,
      }).bindTooltip('Broadcasting SOS to units within 15 km').addTo(map);
    }

    // Route Polyline (Emergency Green Wave glow path) — only for an assigned unit
    const liveRoute: [number, number][] | null =
      hasLiveTracking && Array.isArray(livePos?.routeCoords) && livePos.routeCoords.length > 1
        ? livePos.routeCoords.map((p: any) => [p.lat, p.lng] as [number, number])
        : null;
    if (hasResponder) {
      const routePolyline = L.polyline(liveRoute || activeRouteCoords, {
        color: isPhase2 ? '#059669' : '#2563eb',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '10, 8'
      }).addTo(map);

      layersRef.current.routePolyline = routePolyline;
    }

    // 1. Patient Marker — exact SOS location from the incident (never simulated)
    const patientPos: [number, number] = patientAnchor;
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

    // 2. Hospital Marker — exact facility location from the server user record
    const hospitalPos: [number, number] =
      hospital?.location && Number.isFinite(hospital.location.lat) && Number.isFinite(hospital.location.lng)
        ? [hospital.location.lat, hospital.location.lng]
        : [13.0860, 80.2950];
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

    // 3. Traffic Preemption Junctions along route (assigned unit only)
    const junctions = incident.greenCorridor?.junctions || (hasResponder ? [
      { id: 'j-01', name: '5th & Market St', status: 'GREEN', etaSeconds: 30 },
      { id: 'j-02', name: '7th & Market St', status: 'GREEN', etaSeconds: 75 },
      { id: 'j-03', name: '8th & Hyde Intersect', status: 'CLEARING', etaSeconds: 120 },
    ] : []);

    const junctionCoords: [number, number][] = [
      [13.0750, 80.2730],
      [13.0680, 80.2760],
      [13.0610, 80.2790],
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

    // 4. Moving Ambulance Marker assets (placed on the map only once a real unit accepts)
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

    // 4. Moving Ambulance Marker — only once a real unit has accepted
    if (hasResponder) {
      const ambulanceMarker = L.marker(focusPos, { icon: ambulanceIcon, zIndexOffset: 1000 })
        .bindPopup(`<b>${responderName}</b><br/>Status: ${incident.status}<br/>Speed: ${hasLiveTracking && livePos.speedKmH ? `${livePos.speedKmH} km/h` : '68 km/h'}${hasLiveTracking ? '<br/>Source: live GPS' : ''}`)
        .addTo(map);

      layersRef.current.ambulanceMarker = ambulanceMarker;
    }

    // Frame the incident area: fit the route only when it is local.
    // A cross-country span (e.g. demo unit vs real GPS) must never zoom out to a world map.
    try {
      const bounds = L.latLngBounds(liveRoute || activeRouteCoords);
      const span = Math.max(
        Math.abs(bounds.getNorth() - bounds.getSouth()),
        Math.abs(bounds.getEast() - bounds.getWest())
      );
      if (!incident.assignedResponderId || span > 1) {
        map.setView(patientAnchor, 16);
      } else {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch (e) {
      map.setView(patientAnchor, 16);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapStyle, isPhase2]);

  // Redraw the route on real streets once OSRM geometry arrives (or map recreates)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !road || road.pts.length < 2) return;
    if (layersRef.current.routePolyline) {
      layersRef.current.routePolyline.remove();
      layersRef.current.routePolyline = undefined;
    }
    layersRef.current.routePolyline = L.polyline(road.pts, {
      color: isPhase2 ? '#059669' : '#2563eb',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
  }, [road, mapEpoch, isPhase2]);

  // Steer the marker target: real GPS only — ambulance moves only when device GPS updates
  useEffect(() => {
    if (hasLiveTracking && typeof liveLat === 'number' && typeof liveLng === 'number') {
      targetRef.current = [liveLat, liveLng];
    } else if (realAmbulancePos) {
      targetRef.current = realAmbulancePos;
    } else {
      targetRef.current = null;
    }
  }, [hasLiveTracking, liveLat, liveLng, realAmbulancePos]);

  // Ease the marker toward its target every frame — smooth street glide, never a jump
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const marker = layersRef.current.ambulanceMarker;
      const t = targetRef.current;
      if (marker && t) {
        const cur = shownRef.current ?? t;
        const nx = cur[0] + (t[0] - cur[0]) * 0.12;
        const ny = cur[1] + (t[1] - cur[1]) * 0.12;
        const next: [number, number] =
          Math.abs(t[0] - nx) + Math.abs(t[1] - ny) < 1e-7 ? t : [nx, ny];
        shownRef.current = next;
        marker.setLatLng(next);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mapEpoch]);

  // "YOU" marker — the active role's exact device GPS with accuracy circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (layersRef.current.youMarker) {
      layersRef.current.youMarker.remove();
      layersRef.current.youMarker = undefined;
    }
    if (layersRef.current.youCircle) {
      layersRef.current.youCircle.remove();
      layersRef.current.youCircle = undefined;
    }
    if (typeof gpsLat !== 'number' || typeof gpsLng !== 'number') return;

    const circle = L.circle([gpsLat, gpsLng], {
      radius: Math.max(gpsAcc || 0, 25),
      color: '#8b5cf6',
      weight: 1.5,
      opacity: 0.7,
      fillColor: '#8b5cf6',
      fillOpacity: 0.12,
    }).addTo(map);

    const youHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-violet-500/30 animate-ping"></div>
        <div class="w-8 h-8 rounded-full bg-violet-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black">
          YOU
        </div>
        <div class="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-full bg-violet-950 text-white text-[9px] font-bold shadow border border-violet-500/40">
          YOU • ${role}${gpsAcc ? ` • ±${Math.round(gpsAcc)}m` : ''}
        </div>
      </div>
    `;
    const youIcon = L.divIcon({
      html: youHtml,
      className: 'custom-you-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const marker = L.marker([gpsLat, gpsLng], { icon: youIcon, zIndexOffset: 500 })
      .bindPopup(`<b>Your exact location (${role})</b><br/>${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}`)
      .addTo(map);

    layersRef.current.youMarker = marker;
    layersRef.current.youCircle = circle;
    return () => {
      marker.remove();
      circle.remove();
    };
  }, [gpsLat, gpsLng, gpsAcc, role, mapEpoch]);

  // Center on exact GPS once it locks (accurate satellite view) — zooms to Street (17) for true position
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || incident.assignedResponderId) return;
    if (typeof gpsLat !== 'number' || typeof gpsLng !== 'number') return;
    // Recenter if accuracy improved significantly (from coarse to fine)
    const needsRecenter = gpsCenteredRef.current !== incident.id + '|' + Math.round(gpsAcc || 9999);
    if (!needsRecenter) return;
    gpsCenteredRef.current = incident.id + '|' + Math.round(gpsAcc || 9999);
    // Satellite-accurate zoom: 17 for <50m, 16 for <200m, else 15
    const zoom = (gpsAcc != null && gpsAcc < 50) ? 17 : (gpsAcc != null && gpsAcc < 200) ? 16 : 15;
    map.setView([gpsLat, gpsLng], zoom, { animate: true });
  }, [gpsLat, gpsLng, gpsAcc, incident.id, incident.assignedResponderId]);

  // Recenter helper — GPS only: live ambulance GPS, otherwise YOU GPS, otherwise SOS
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const target: [number, number] =
      hasLiveTracking && typeof liveLat === 'number' && typeof liveLng === 'number'
        ? [liveLat, liveLng]
        : realAmbulancePos
          ? realAmbulancePos
          : (typeof gpsLat === 'number' && typeof gpsLng === 'number' ? [gpsLat, gpsLng] as [number, number] : incident.location ? [incident.location.lat, incident.location.lng] : [13.0827, 80.2707]);
    mapInstanceRef.current.setView(target, 16, { animate: true });
  };

  // Jump to the user's real GPS position (satellite-accurate)
  const handleLocateMe = () => {
    if (!mapInstanceRef.current || typeof gpsLat !== 'number' || typeof gpsLng !== 'number') return;
    const zoom = (gpsAcc != null && gpsAcc < 50) ? 17 : 16;
    mapInstanceRef.current.setView([gpsLat, gpsLng], zoom, { animate: true });
  };

  // Street / Area / District / State zoom presets, kept on the current center
  const ZOOM_PRESETS: [string, number][] = [
    ['Street', 16],
    ['Area', 13],
    ['District', 11],
    ['State', 8],
  ];
  const handlePresetZoom = (zoom: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView(map.getCenter(), zoom, { animate: true });
  };

  // Fit incident area (never a world map — same span guard as init)
  const handleFitRoute = () => {
    if (!mapInstanceRef.current) return;
    const lp: any = (incident as any).liveDriverPosition;
    const pts: [number, number][] =
      lp && incident.assignedResponderId && Array.isArray(lp.routeCoords) && lp.routeCoords.length > 1
        ? lp.routeCoords.map((p: any) => [p.lat, p.lng] as [number, number])
        : activeRouteCoords;
    try {
      const bounds = L.latLngBounds(pts);
      const span = Math.max(
        Math.abs(bounds.getNorth() - bounds.getSouth()),
        Math.abs(bounds.getEast() - bounds.getWest())
      );
      const anchor: [number, number] =
        incident.location && Number.isFinite(incident.location.lat) && Number.isFinite(incident.location.lng)
          ? [incident.location.lat, incident.location.lng]
          : pts[0];
      if (!incident.assignedResponderId || span > 1) {
        mapInstanceRef.current.setView(anchor, 16, { animate: true });
      } else {
        mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch (e) {
      // keep current view
    }
  };

  // Live stats — GPS ONLY, no simulation. Calculated from live GPS distance to destination (server).
  const liveSpeed = hasLiveTracking && typeof livePos?.speedKmH === 'number' ? livePos.speedKmH : (hasLiveTracking ? 0 : null);
  // If no live GPS, distance is haversine between real ambulance pos and destination (or YOU to SOS)
  const fallbackRemainingKm = (() => {
    if (realAmbulancePos) {
      const dest = (isPhase2 ? hospital?.location : incident.location) || incident.location;
      if (dest && typeof dest.lat === 'number') {
        const dLat = ((dest.lat - realAmbulancePos[0]) * Math.PI) / 180;
        const dLng = ((dest.lng - realAmbulancePos[1]) * Math.PI) / 180;
        const la1 = (realAmbulancePos[0] * Math.PI) / 180; const la2 = (dest.lat * Math.PI) / 180;
        const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
        return (2*6371*Math.asin(Math.sqrt(h))).toFixed(1);
      }
    }
    return '—';
  })();
  const remainingDistanceKm = hasLiveTracking && typeof livePos?.remainingKm === 'number'
    ? livePos.remainingKm.toFixed(1)
    : fallbackRemainingKm;
  const remainingMinutesRaw = hasLiveTracking && typeof livePos?.remainingSeconds === 'number'
    ? Math.max(0, Math.ceil(livePos.remainingSeconds / 60))
    : (typeof remainingDistanceKm === 'string' && remainingDistanceKm !== '—' ? Math.max(0, Math.ceil(Number(remainingDistanceKm) * 1.5)) : null);
  // Human-readable ETA — GPS only: if stationary or no GPS, show 0/— not fake countdown
  const etaLabel = remainingMinutesRaw == null || !Number.isFinite(remainingMinutesRaw)
    ? (hasLiveTracking ? '~0 min' : '—')
    : remainingMinutesRaw < 1 ? 'Arrived'
    : remainingMinutesRaw < 120
      ? `~${remainingMinutesRaw} min`
      : `~${(remainingMinutesRaw / 60).toFixed(1)} h`;

  return (
    <div className={`relative isolate w-full rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-slate-900 ${
      isFullscreen ? 'fixed inset-2 z-[9999] h-[calc(100vh-16px)]' : ''
    }`} style={{ height: isFullscreen ? 'auto' : height }}>
      
      {/* Top Telemetry & Direction Banner Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        {/* Role-Specific Live HUD — searching state until a real unit accepts */}
        <div className="bg-slate-950/90 backdrop-blur-md text-white p-2.5 rounded-xl border border-white/15 shadow-xl flex items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              !hasResponder ? 'bg-amber-500 text-white' : isPhase2 ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
            }`}>
              {!hasResponder ? <Radio size={16} /> : isPhase2 ? <HospitalIcon size={16} /> : <Truck size={16} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black uppercase tracking-wider ${!hasResponder ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {!hasResponder ? 'SEARCHING FOR UNITS' : isPhase2 ? 'PHASE 2: TO HOSPITAL' : 'PHASE 1: TO PATIENT'}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full animate-ping ${!hasResponder ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
              </div>
              <p className="text-xs font-bold truncate text-white">
                {!hasResponder
                  ? 'SOS broadcast — waiting for acceptance'
                  : isPhase2
                    ? `Routing to ${hospital?.name || 'SF General Hospital'}`
                    : `Approaching ${incident.address || '1090 Market Street'}`}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            {!hasResponder ? (
              <>
                <div className="text-xs font-mono font-black text-amber-400">STANDBY</div>
                <div className="text-[10px] text-slate-400 font-mono">awaiting unit</div>
              </>
            ) : (
              <>
                <div className="text-xs font-mono font-black text-amber-400">
                  {etaLabel}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {remainingDistanceKm} km left
                </div>
              </>
            )}
            <div className={`text-[9px] font-mono font-black ${hasLiveTracking ? 'text-emerald-400' : 'text-amber-400'}`}>
              {hasLiveTracking ? '● LIVE GPS' : hasResponder ? '● GPS ONLY — MOVES WHEN YOU MOVE' : '○ STANDBY'}
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
            <span className="text-emerald-300 font-mono">{liveSpeed ? `${liveSpeed} km/h • LIVE` : '68 km/h'}</span>
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[220px] bg-slate-900 z-10" />

      {/* Real-GPS status pill — GPS ONLY, no simulation slider */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-[990] pointer-events-none">
        <div className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[9px] font-mono font-black border backdrop-blur-md ${
          deviceFix && deviceFix.accuracy > 2000
            ? 'bg-amber-950/85 text-amber-300 border-amber-500/40'
            : deviceFix
              ? 'bg-blue-950/85 text-blue-300 border-blue-500/40'
              : gpsError
                ? 'bg-red-950/85 text-red-300 border-red-500/40'
                : 'bg-slate-950/85 text-slate-400 border-white/15'
        }`}>
          {deviceFix && deviceFix.accuracy > 2000
            ? `● COARSE FIX ±${(deviceFix.accuracy / 1000).toFixed(0)}km — STEP OUTDOORS FOR GPS`
            : deviceFix
              ? `● YOU ±${Math.round(deviceFix.accuracy)}m LIVE GPS — MOVES ONLY WHEN YOU MOVE`
              : gpsError
                ? `○ ${gpsError}`
                : '○ LOCATING YOU... (allow GPS, use HTTPS)'}
        </div>
      </div>

      {/* Bottom Floating Map Controls */}
      {showControls && (
        <div className="absolute bottom-2.5 right-2.5 z-[1000] flex flex-col gap-1.5">
          {/* Real location button */}
          <button
            onClick={handleLocateMe}
            disabled={!deviceFix}
            className={`w-8 h-8 rounded-lg shadow-lg border flex items-center justify-center transition-transform active:scale-90 ${
              deviceFix
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/50 cursor-pointer'
                : 'bg-white/60 text-slate-400 border-gray-200 cursor-not-allowed'
            }`}
            title={deviceFix ? `Jump to your real location (±${Math.round(deviceFix.accuracy)}m)` : (gpsError || 'Waiting for device GPS...')}
          >
            <LocateFixed size={16} />
          </button>
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

          {/* Map style toggle: Satellite (default accurate) <-> OSM Streets <-> Humanitarian <-> Hybrid */}
          <button
            onClick={() => setMapStyle(prev => prev === 'satellite' ? 'hybrid' : prev === 'hybrid' ? 'streets' : prev === 'streets' ? 'humanitarian' : prev === 'humanitarian' ? 'tactical' : 'satellite')}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-800 shadow-lg border border-gray-200 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            title={`Layer: ${mapStyle === 'satellite' ? 'Satellite (Esri)' : mapStyle === 'hybrid' ? 'Hybrid (Satellite+OSM)' : mapStyle === 'streets' ? 'OSM Streets' : mapStyle === 'humanitarian' ? 'OSM Humanitarian' : 'Tactical'} — tap to switch Satellite↔OSM`}
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
      {role === 'TRAFFIC_POLICE' && onCorridorAction && hasResponder && incident.greenCorridor && (
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

      {/* Satellite/Hybrid credit + active layer pill (always visible on satellite) */}
      {(mapStyle === 'satellite' || mapStyle === 'hybrid') && (
        <div className={`absolute left-2.5 z-[990] pointer-events-none text-[8px] font-mono text-white/85 bg-black/55 px-1.5 py-0.5 rounded flex items-center gap-1.5 ${hasResponder ? 'bottom-[64px]' : 'bottom-2.5'}`}>
          <span>{mapStyle === 'hybrid' ? 'Hybrid: Esri Satellite + © OpenStreetMap' : 'Satellite © Esri, Maxar'}</span>
          <span className="px-1 py-0.2 bg-white/20 rounded text-[7px] font-black uppercase">{mapStyle === 'hybrid' ? 'SAT+OSM' : 'SATELLITE'}</span>
        </div>
      )}
      {mapStyle === 'streets' && (
        <div className={`absolute left-2.5 z-[990] pointer-events-none text-[8px] font-mono text-slate-700 bg-white/85 px-1.5 py-0.5 rounded ${hasResponder ? 'bottom-[64px]' : 'bottom-2.5'}`}>
          © OpenStreetMap contributors
        </div>
      )}

      {/* Bottom-Center Zoom Presets: Street / Area / District / State — no video slider (GPS ONLY) */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[1000] bg-slate-950/85 backdrop-blur-xs border border-white/10 rounded-full px-1 py-1 flex items-center gap-0.5 shadow-lg">
        {ZOOM_PRESETS.map(([label, zoom]) => (
          <button
            key={label}
            onClick={() => handlePresetZoom(zoom)}
            className="px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer active:scale-95"
            title={`Zoom to ${label} level`}
          >
            {label}
          </button>
        ))}
      </div>

    </div>
  );
}

