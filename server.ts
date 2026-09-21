import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import { initPostgres, loadFromPostgres, getPool, isPgEnabled, upsertUser, upsertIncident, upsertFeedback, upsertTraffic, upsertSms, upsertKeypad, persistMeta, clearIncidents, seedIfEmpty } from "./postgres";

const app = express();
app.use(express.json());
const PORT = 3000;

// ---- Live GPS Tracking Engine (drives real-time ambulance movement on the map) ----
const KM_PER_DEGREE = 111.32;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function geoInterpolate(a: { lat: number; lng: number }, b: { lat: number; lng: number }, t: number) {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

// Build a gently bulged, multi-point route between origin and destination
// so the map draws a realistic curved path instead of a straight line.
function buildRouteCoords(a: { lat: number; lng: number }, b: { lat: number; lng: number }, bulgeRatio = 0.05) {
  const pts: { lat: number; lng: number }[] = [];
  const steps = 10;
  const distanceKm = Math.max(haversineKm(a, b), 0.0001);
  const cosLat = Math.cos((a.lat * Math.PI) / 180);
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; // perpendicular unit (lat/lng space)
  const ny = dx / len;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const base = geoInterpolate(a, b, t);
    const perpKm = Math.sin(Math.PI * t) * distanceKm * bulgeRatio;
    pts.push({
      lat: base.lat + (perpKm * ny) / KM_PER_DEGREE,
      lng: base.lng + (perpKm * nx) / (KM_PER_DEGREE * (cosLat || 1))
    });
  }
  return pts;
}

// Compute the ambulance's current position — ACCURATE GPS first, time-interpolation fallback
// Recomputed on every /api/state poll. If the assigned driver has pushed a recent
// high-accuracy GPS fix (via POST /api/users/:id/location), use that as the true
// position and derive progress/ETA from real distance to destination.
function computeLiveDriverPosition(inc: any) {
  if (!inc.assignedResponderId) return null;

  const now = Date.now();
  const patients = inc.location || { lat: 13.0827, lng: 80.2707 };
  const responder: any = db.users.find((u: any) => u.id === inc.assignedResponderId);
  const hospital = db.users.find((u: any) => u.id === inc.selectedHospitalId);

  const isPhase2 = ['PATIENT_PICKED', 'IN_TRANSIT', 'REACHED_DESTINATION', 'COMPLETED'].includes(inc.status);

  const origin = isPhase2 ? patients : responder?.location || patients;
  const destination = isPhase2 ? hospital?.location || patients : patients;
  const startedMs = isPhase2
    ? inc.phase2StartedAt || inc.dispatchStartedAt || inc.createdAt
    : inc.dispatchStartedAt || inc.acceptedAt || inc.createdAt;
  const speedKmH = inc.greenCorridor?.speedKmH || (isPhase2 ? 66 : 58);

  // ---- ACCURATE GPS PATH (preferred) ----
  // If driver device has reported live GPS within last 90s, treat that as ground truth
  const hasRecentGps = responder?.location && typeof responder.location.lat === 'number'
    && typeof responder.locationUpdatedAt === 'number' && (now - responder.locationUpdatedAt) < 90000;
  if (hasRecentGps) {
    const live = responder.location;
    const remainingKm = Math.max(0, haversineKm(live, destination));
    const totalKm = Math.max(haversineKm(origin, destination), 0.0001);
    // progress = fraction of route already covered from origin to live vs total
    const distFromOrigin = haversineKm(origin, live);
    // Clamp progress 0..1 using remaining/total as more stable for off-route live points
    const progress = Math.min(1, Math.max(0, 1 - remainingKm / totalKm));
    const remainingSeconds = Math.ceil((remainingKm / Math.max(speedKmH, 1)) * 3600);
    return {
      lat: live.lat,
      lng: live.lng,
      progress,
      phase: isPhase2 ? 2 : 1,
      speedKmH: Math.round(speedKmH),
      remainingKm: Number(remainingKm.toFixed(2)),
      remainingSeconds,
      status: inc.status,
      routeOrigin: origin,
      routeDestination: destination,
      routeCoords: buildRouteCoords(hasRecentGps ? live : origin, destination),
      isLiveGps: true,
      gpsAccuracy: responder.locationAccuracy ?? null,
      gpsUpdatedAt: responder.locationUpdatedAt,
    };
  }

  // ---- FALLBACK: GPS ONLY, NO VIDEO — when no recent live GPS, ambulance is STATIONARY ----
  // User requested: "if the user moves then only it should show like moving, the user movement
  // is also determined by the gps only." So we never simulate movement by time.
  // Show last known responder location (static) and compute distance from there.
  const lastKnown = responder?.location && typeof responder.location.lat === 'number' ? responder.location : origin;
  const distanceKm = haversineKm(lastKnown, destination);
  const remainingKm = Number(distanceKm.toFixed(2));
  const remainingSeconds = remainingKm === 0 ? 0 : Math.ceil((remainingKm / Math.max(speedKmH, 1)) * 3600);

  return {
    lat: lastKnown.lat,
    lng: lastKnown.lng,
    progress: 0, // stationary — moves only on next GPS push
    phase: isPhase2 ? 2 : 1,
    speedKmH: Math.round(speedKmH),
    remainingKm,
    remainingSeconds,
    status: inc.status,
    routeOrigin: origin,
    routeDestination: destination,
    routeCoords: buildRouteCoords(lastKnown, destination),
    isLiveGps: false,
    gpsAccuracy: responder?.locationAccuracy ?? null,
    gpsUpdatedAt: responder?.locationUpdatedAt ?? null,
    note: 'Stationary — moves only when GPS moves',
  };
}

// ---- Database: PostgreSQL 16 (best suitable) — primary, with db.json fallback for dev without DB ----
const DB_FILE = path.join(process.cwd(), 'db.json');
let pgReady = false;
let db = {
  incidents: [] as any[],
  feedbacks: [] as any[],
  trafficNotifications: [] as any[],
  smsLogs: [] as any[],
  keypadDevices: [] as any[],
  sosCounter: 1024,
  users: [
    // Accurate GPS defaults — Chennai cluster (updated live via POST /api/users/:id/location from device GPS)
    // Null = will be overwritten immediately by real device GPS; fallback Indian coords used only before first fix
    { id: 'patient_1', role: 'PATIENT', name: 'Patient / Bystander Device', location: null as any, locationAccuracy: null as any, locationUpdatedAt: null as any, available: true },
    { id: 'admin_1', role: 'ADMIN', name: 'Central Emergency Control (Chennai)', location: null as any, locationAccuracy: null as any, locationUpdatedAt: null as any, available: true },
    { id: 'driver_1', role: 'AMBULANCE_DRIVER', name: 'Ambulance Unit 1 — Chennai Central', location: { lat: 13.0827, lng: 80.2707 }, locationAccuracy: null as any, locationUpdatedAt: null as any, available: true },
    { id: 'driver_2', role: 'AMBULANCE_DRIVER', name: 'Ambulance Unit 2 — Anna Nagar', location: { lat: 13.0865, lng: 80.2105 }, locationAccuracy: null as any, locationUpdatedAt: null as any, available: true },
    { 
      id: 'traffic_1', 
      role: 'TRAFFIC_POLICE', 
      name: 'Chennai Traffic & Green Corridor Command', 
      location: { lat: 13.0672, lng: 80.2825 }, 
      locationAccuracy: null as any, locationUpdatedAt: null as any,
      available: true 
    },
    { 
      id: 'hospital_1', 
      role: 'HOSPITAL', 
      name: 'Rajiv Gandhi Govt General Hospital — Chennai Trauma Center', 
      hospitalLevel: 'LEVEL 1',
      commandTitle: 'Emergency Department Command • Dr. Sarah Lin, MD (Attending)',
      location: { lat: 13.0860, lng: 80.2950 },
      locationAccuracy: null as any, locationUpdatedAt: null as any,
      capacity: { erBeds: 28, icuBeds: 6, ventilators: 11, lastUpdated: Date.now() }
    },
    { 
      id: 'hospital_2', 
      role: 'HOSPITAL', 
      name: 'Apollo Hospitals Greams Road — Chennai', 
      hospitalLevel: 'LEVEL 1',
      commandTitle: 'Acute Care Division • Dr. Marcus Vance, MD',
      location: { lat: 13.0560, lng: 80.2590 },
      locationAccuracy: null as any, locationUpdatedAt: null as any,
      capacity: { erBeds: 18, icuBeds: 4, ventilators: 8, lastUpdated: Date.now() }
    }
  ]
};

// Persist database — PostgreSQL 16 primary, db.json fallback
async function persistDb() {
  if (pgReady && isPgEnabled()) {
    try {
      // Upsert all collections (efficient for small RESQ dataset; bulk transaction)
      const pool = getPool();
      if (pool) {
        // Users are kept in sync on each location/capacity update via upsertUser; here persist meta
        await persistMeta(db.sosCounter);
        // For incidents/feedbacks etc., upsert individually (keeps Postgres consistent)
        for (const inc of db.incidents) await upsertIncident(inc);
        for (const f of db.feedbacks) await upsertFeedback(f);
        for (const n of db.trafficNotifications) await upsertTraffic(n);
        for (const s of db.smsLogs) await upsertSms(s);
        for (const d of db.keypadDevices) await upsertKeypad(d);
      }
    } catch (e) {
      console.error('Postgres persist failed, falling back to file:', e);
      try { fs.writeFileSync(DB_FILE, JSON.stringify({ incidents: db.incidents, feedbacks: db.feedbacks, trafficNotifications: db.trafficNotifications, smsLogs: db.smsLogs, keypadDevices: db.keypadDevices, sosCounter: db.sosCounter }, null, 2)); } catch {}
    }
  } else {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({ incidents: db.incidents, feedbacks: db.feedbacks, trafficNotifications: db.trafficNotifications, smsLogs: db.smsLogs, keypadDevices: db.keypadDevices, sosCounter: db.sosCounter }, null, 2));
    } catch (e) { console.error('DB persist failed', e); }
  }
}

// Restore — try PostgreSQL first, else db.json (preserves data across migration)
async function restoreDb() {
  pgReady = await initPostgres();
  if (pgReady) {
    const loaded = await loadFromPostgres(db);
    if (loaded && db.users.length > 0) {
      // Seed if empty (first boot)
      await seedIfEmpty(db.users, db.sosCounter);
      console.log(`Database: PostgreSQL 16 active — ${db.incidents.length} incidents, ${db.users.length} users, SOS #${db.sosCounter}`);
      return;
    }
    // No data in PG yet — seed default Chennai users and migrate any existing db.json if present
    if (fs.existsSync(DB_FILE)) {
      try {
        const saved = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (Array.isArray(saved.incidents) && saved.incidents.length) { db.incidents = saved.incidents; for (const inc of db.incidents) await upsertIncident(inc); }
        if (Array.isArray(saved.feedbacks)) for (const f of saved.feedbacks) await upsertFeedback(f);
        if (Array.isArray(saved.trafficNotifications)) for (const n of saved.trafficNotifications) await upsertTraffic(n);
        if (Array.isArray(saved.smsLogs)) for (const s of saved.smsLogs) await upsertSms(s);
        if (Array.isArray(saved.keypadDevices)) for (const d of saved.keypadDevices) await upsertKeypad(d);
        if (typeof saved.sosCounter === 'number') { db.sosCounter = saved.sosCounter; await persistMeta(db.sosCounter); }
        console.log(`Migrated db.json → PostgreSQL 16 (${db.incidents.length} incidents)`);
      } catch {}
    }
    for (const u of db.users) await upsertUser(u);
    await seedIfEmpty(db.users, db.sosCounter);
  } else {
    // Fallback file restore
    try {
      if (fs.existsSync(DB_FILE)) {
        const saved = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (Array.isArray(saved.incidents)) db.incidents = saved.incidents;
        if (Array.isArray(saved.feedbacks)) db.feedbacks = saved.feedbacks;
        if (Array.isArray(saved.trafficNotifications)) db.trafficNotifications = saved.trafficNotifications;
        if (Array.isArray(saved.smsLogs)) db.smsLogs = saved.smsLogs;
        if (Array.isArray(saved.keypadDevices)) db.keypadDevices = saved.keypadDevices;
        if (typeof saved.sosCounter === 'number') db.sosCounter = saved.sosCounter;
        console.log(`Database restored from db.json (${db.incidents.length} incidents, SOS counter #${db.sosCounter}) — Postgres not available`);
      }
    } catch (e) { console.error('DB restore failed', e); }
  }
}
let restoreDone = false;
async function ensureDb() {
  if (!restoreDone) { await restoreDb(); restoreDone = true; setInterval(() => { persistDb().catch(e=>console.error(e)); }, 5000); }
}

// Reset API for testing (PostgreSQL 16: DELETE FROM + file)
app.post("/api/reset", async (req, res) => {
  db.incidents = [];
  db.feedbacks = [];
  db.trafficNotifications = [];
  db.smsLogs = [];
  if (pgReady && isPgEnabled()) {
    try { await clearIncidents(); await persistMeta(db.sosCounter); } catch (e) { console.error(e); }
  }
  await persistDb();
  res.json({ success: true });
});

// Get current state (recomputes live ambulance positions in real time)
app.get("/api/state", (req, res) => {
  res.json({
    ...db,
    serverTime: Date.now(),
    incidents: db.incidents.map((inc: any) => ({
      ...inc,
      liveDriverPosition: computeLiveDriverPosition(inc)
    }))
  });
});

const SERVER_STARTED_AT = Date.now();

// Health check: lets clients verify server + database sync status (PostgreSQL 16)
app.get("/api/health", async (req, res) => {
  let pgOk = false;
  let pgLatency: number | null = null;
  let pgConfigured = (process.env.DATABASE_URL || '').startsWith('postgresql://') || (process.env.DATABASE_URL || '').startsWith('postgres://');
  if (pgReady && isPgEnabled()) {
    const start = Date.now();
    try {
      const pool = getPool();
      if (pool) { await pool.query('SELECT 1'); pgOk = true; pgLatency = Date.now() - start; }
    } catch { pgOk = false; }
  } else if (pgConfigured) {
    // Configured but init failed (e.g. Docker not running) — test live
    try {
      const { Pool } = await import('pg');
      const tmp = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 1500 });
      const c = await tmp.connect();
      await c.query('SELECT 1');
      c.release();
      await tmp.end();
      pgOk = true;
      pgLatency = 1;
    } catch { pgOk = false; }
  }
  const mode = pgOk ? "PostgreSQL 16 (primary) — best suitable stable for JSONB/GIS" 
    : pgConfigured ? "PostgreSQL 16 configured — not reachable (run `docker compose up -d` after starting Docker Desktop) + db.json fallback"
    : "in-memory + db.json (Postgres not configured)";
  res.json({
    status: "ok",
    server: {
      uptimeSec: Math.floor((Date.now() - SERVER_STARTED_AT) / 1000),
      startedAt: SERVER_STARTED_AT,
      time: Date.now(),
      node: process.version,
    },
    database: {
      connected: true,
      mode,
      pgConnected: pgOk,
      pgConfigured,
      pgLatencyMs: pgLatency,
      postgresVersion: "16 (Alpine) — best suitable for RESQ",
      incidents: db.incidents.length,
      feedbacks: db.feedbacks.length,
      trafficNotifications: db.trafficNotifications.length,
      smsLogs: db.smsLogs.length,
      nextSosNumber: db.sosCounter,
      users: db.users.length,
      hint: pgOk ? undefined : "To enable PostgreSQL 16: start Docker Desktop then `docker compose up -d` (creates resq-postgres16 on :5432)",
    },
  });
});

// Create Incident
app.post("/api/incidents", (req, res) => {
  const { 
    type, 
    location, 
    condition, 
    conditionCategory,
    conditionAcuity,
    conditionSubtitle,
    hospitalPreference,
    preferredHospitalId,
    preferredHospitalName,
    ambulancesRequired, 
    patientId, 
    callerRole, 
    victimCount, 
    address 
  } = req.body;

  const now = Date.now();
  const ACCEPTANCE_WINDOW_MS = 120000; // 2 minutes (120s) as per RESQ protocol

  const newIncident = {
    id: crypto.randomUUID(),
    type,
    patientId: patientId || 'patient_1',
    callerRole: callerRole || 'PATIENT',
    victimCount: victimCount || 1,
    address: address || '1090 Market Street, Civic Center, SF',
    location: location || { lat: 13.0827, lng: 80.2707 },
    condition: condition || 'Cardiac / Chest Pain',
    conditionCategory: conditionCategory || 'Cardiac / Chest Pain',
    conditionAcuity: conditionAcuity || 'ALS',
    conditionSubtitle: conditionSubtitle || 'Heart attack symptoms, chest pressure',
    hospitalPreference: hospitalPreference || 'DRIVER_DISCRETION',
    preferredHospitalId: preferredHospitalId || null,
    preferredHospitalName: preferredHospitalName || null,
    additionalInfoProvided: false,
    ambulancesRequired,
    status: 'NOTIFIED',
    notifiedHospitals: [],
    acceptedHospitals: [],
    rejectedHospitals: [],
    createdAt: now,
    acceptanceDeadline: now + ACCEPTANCE_WINDOW_MS,
    timeline: [
      { status: 'CREATED', timestamp: now },
      { status: 'NOTIFIED', timestamp: now }
    ]
  };
  
  db.incidents.push(newIncident);
  persistDb().catch(e=>console.error(e));

  // RESQ Protocol: Wait for unit acceptance (Max 2 minutes = 120,000 ms)
  // If no unit accepts within 2 minutes, Automatic Calling Agent is triggered
  setTimeout(() => {
    const checkInc = db.incidents.find(i => i.id === newIncident.id);
    if (checkInc && (checkInc.status === 'NOTIFIED' || checkInc.status === 'CREATED')) {
      checkInc.status = 'AUTO_ESCALATION_STARTED';
      checkInc.timeline.push({ status: 'AUTO_ESCALATION_STARTED', timestamp: Date.now() });
    }
  }, ACCEPTANCE_WINDOW_MS);

  res.json(newIncident);
});

// Force or trigger Auto-Escalation / Calling Agent immediately (for testing 2-min expiry)
app.post("/api/incidents/:id/escalate", (req, res) => {
  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });

  if (inc.status === 'NOTIFIED' || inc.status === 'CREATED') {
    inc.status = 'AUTO_ESCALATION_STARTED';
    inc.timeline.push({ status: 'AUTO_ESCALATION_STARTED', timestamp: Date.now() });
    res.json(inc);
  } else {
    res.status(400).json({ error: "Incident not eligible for escalation" });
  }
});

// Complete Calling Agent Call & Transition into AI-Assisted Dispatch Flow
app.post("/api/incidents/:id/complete-call-dispatch", (req, res) => {
  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });

  const assignedResponderId = 'driver_1';
  const assignedUnitName = 'Govt EMS Ambulance 108 (Central Metro Fleet)';

  inc.status = 'RESPONDER_EN_ROUTE';
  inc.assignedResponderId = assignedResponderId;
  inc.dispatchStartedAt = Date.now();
  inc.timeline.push({ status: 'RESPONDER_EN_ROUTE', timestamp: Date.now() });

  // Q-ARES Flowchart: AI-Assisted Dispatch + QPSO Metaheuristics Optimization
  inc.aiDispatch = {
    algorithm: 'QPSO_METAHEURISTICS',
    qpsoStatus: 'COMPUTED_OPTIMAL',
    latencyMs: 34,
    routeEfficiencyGain: '+41% (QPSO Metaheuristics + Green Wave)',
    sourceType: 'AUTOMATIC_CALLING_AGENT_108',
    sourceLabel: '108 Government EMS Central Switchboard',
    assignedUnitName,
    greenCorridorPreempted: true,
    hospitalReadinessVerified: true,
    timestamp: Date.now()
  };

  const destinationAddress = inc.address || '1090 Market Street, SF';

  // Q-ARES Flowchart: Traffic + Green Corridor Coordination
  inc.greenCorridor = {
    required: true,
    phase: 'EN_ROUTE_TO_PATIENT',
    phaseLabel: 'Phase 1: En Route to Patient Location (108 Govt EMS)',
    status: 'ACTIVE',
    notifiedAt: Date.now(),
    source: 'Central Govt EMS Command (108)',
    destination: destinationAddress,
    speedKmH: 72,
    estimatedArrivalMinutes: 3,
    escortDispatched: false,
    junctions: [
      { id: 'j-01', name: '5th St & Market St', status: 'GREEN', etaSeconds: 30 },
      { id: 'j-02', name: '7th St & Market St', status: 'GREEN', etaSeconds: 75 },
      { id: 'j-03', name: '8th St & Hyde St Intersect', status: 'GREEN', etaSeconds: 120 },
      { id: 'j-04', name: 'Market St & Civic Center Plaza', status: 'GREEN', etaSeconds: 165 }
    ]
  };

  // Notify Traffic Police for the Escalated Emergency
  const trafficNotif = {
    id: crypto.randomUUID(),
    incidentId: inc.id,
    type: 'PHASE_1_EN_ROUTE_PATIENT',
    title: '🚨 108 GOVT EMS DISPATCHED VIA CALLING AGENT - GREEN CORRIDOR ACTIVE',
    message: `Calling Agent connected to 108 Government EMS. Unit ${assignedUnitName} dispatched to ${destinationAddress}. QPSO Route Optimization & Green Wave synchronized.`,
    responderName: assignedUnitName,
    destinationName: destinationAddress,
    condition: inc.conditionCategory || inc.condition || 'Emergency',
    acuity: inc.conditionAcuity || 'ALS',
    timestamp: Date.now(),
    read: false,
    priority: 'CRITICAL'
  };
  db.trafficNotifications.unshift(trafficNotif);

  // Q-ARES Flowchart: Destination Readiness Check & Hospital Coordination
  inc.notifiedHospitals = db.users.filter(u => u.role === 'HOSPITAL').map(h => h.id);
  inc.acceptedHospitals = db.users.filter(u => u.role === 'HOSPITAL').map(h => h.id);
  inc.selectedHospitalId = 'hospital_1';

  res.json(inc);
});

// ============================================================================
// BUTTON-PHONE (KEYPAD) SOS FLOW — steps 5..12 of the keypad flowchart
// Step 5: HTTP POST / Webhook ingress (SMS-converted or direct HTTP webhook)
// Step 6: Backend validates SOS, extracts device/user + location, generates SOS ID
// Step 7: Stored in database with Status WAITING (NOTIFIED)
// Step 8: Ambulance app ACCEPT / REJECT  →  after ACCEPT the exact standard
//         driver → hospital → traffic-police flow takes over (shared endpoints)
// Steps 9-11: Backend → SMS API → telecom network → SMS SENT to contacts
// Step 12: END — return to idle
// ============================================================================

// Register (or upsert) a button-phone device — one-time pairing
app.post("/api/keypad-sos/devices", (req, res) => {
  const { deviceId, phoneNumber, ownerName, emergencyContacts } = req.body || {};
  if (!deviceId && !phoneNumber) {
    return res.status(400).json({ error: "deviceId or phoneNumber is required" });
  }
  const id = deviceId || phoneNumber;
  let device = db.keypadDevices.find((d: any) => d.deviceId === id);
  if (!device) {
    device = {
      deviceId: id,
      phoneNumber: phoneNumber || null,
      ownerName: ownerName || 'Keypad Phone User',
      emergencyContacts: Array.isArray(emergencyContacts) ? emergencyContacts : [],
      registeredAt: Date.now(),
    };
    db.keypadDevices.push(device);
  } else {
    if (phoneNumber) device.phoneNumber = phoneNumber;
    if (ownerName) device.ownerName = ownerName;
    if (Array.isArray(emergencyContacts)) device.emergencyContacts = emergencyContacts;
  }
  persistDb().catch(e=>console.error(e));
  res.json(device);
});

// Step 5+6+7: Webhook ingress for keypad SOS (from SMS gateway conversion or HTTP)
app.post("/api/keypad-sos/webhook", (req, res) => {
  const {
    deviceId,
    phoneNumber,
    sosType,        // 'HIGH_EMERGENCY' (Case 1) | 'EMERGENCY' (Case 2)
    trigger,        // 'LONG_PRESS_3_5S' | 'SEQUENCE_363636'
    channel,        // 'SMS' | 'HTTP'
    location,       // GPS fix when available
    cellInfo,       // cell-tower info when GPS unavailable
    address,
    ownerName,
    emergencyContacts,
  } = req.body || {};

  // ---- Step 6: Validate SOS ----
  if (!deviceId && !phoneNumber) {
    return res.status(400).json({ error: "Missing device identity (deviceId or phoneNumber)" });
  }
  const validTypes = ['HIGH_EMERGENCY', 'EMERGENCY'];
  if (!validTypes.includes(sosType)) {
    return res.status(400).json({ error: "Invalid sosType. Use HIGH_EMERGENCY (Case 1) or EMERGENCY (Case 2)" });
  }

  // ---- Step 6: Extract device / user ----
  const id = deviceId || phoneNumber;
  let device = db.keypadDevices.find((d: any) => d.deviceId === id);
  if (!device) {
    device = {
      deviceId: id,
      phoneNumber: phoneNumber || null,
      ownerName: ownerName || 'Keypad Phone User',
      emergencyContacts: Array.isArray(emergencyContacts) ? emergencyContacts : [],
      registeredAt: Date.now(),
    };
    db.keypadDevices.push(device);
  }

  // ---- Step 6: Extract location (GPS preferred, cell-triangulation fallback) ----
  let sosLocation = { lat: 13.0827, lng: 80.2707 };
  let locationSource: 'GPS' | 'CELL' = 'CELL';
  if (location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))) {
    sosLocation = { lat: Number(location.lat), lng: Number(location.lng) };
    locationSource = 'GPS';
  }

  // ---- Step 6: Generate SOS ID (sequential, e.g. #1024) ----
  const sosNumber = db.sosCounter++;

  const now = Date.now();
  const ACCEPTANCE_WINDOW_MS = 120000;

  // ---- Step 7: Store in database, Status WAITING (= NOTIFIED) ----
  const newIncident = {
    id: crypto.randomUUID(),
    sosNumber,
    source: 'KEYPAD_PHONE',
    type: 'AMBULANCE',
    patientId: `keypad_${id}`,
    callerRole: 'PATIENT',
    victimCount: 1,
    address: address || (locationSource === 'GPS'
      ? `Keypad SOS GPS ${sosLocation.lat.toFixed(5)}, ${sosLocation.lng.toFixed(5)}`
      : 'Keypad SOS — Cell-tower triangulated area, SF'),
    location: sosLocation,
    condition: sosType === 'HIGH_EMERGENCY' ? 'High Emergency (Keypad SOS Case 1)' : 'Emergency (Keypad SOS Case 2)',
    conditionCategory: sosType === 'HIGH_EMERGENCY' ? 'High Emergency — Keypad' : 'Emergency — Keypad',
    conditionAcuity: sosType === 'HIGH_EMERGENCY' ? 'ALS' : 'BLS',
    conditionSubtitle: sosType === 'HIGH_EMERGENCY'
      ? 'Button 3 long-pressed 5s — critical'
      : 'Key sequence 3-6-3-6-3-6 pressed',
    hospitalPreference: 'DRIVER_DISCRETION',
    preferredHospitalId: null,
    preferredHospitalName: null,
    additionalInfoProvided: false,
    status: 'NOTIFIED',
    notifiedHospitals: [],
    acceptedHospitals: [],
    rejectedHospitals: [],
    createdAt: now,
    acceptanceDeadline: now + ACCEPTANCE_WINDOW_MS,
    keypadSos: {
      sosNumber,
      sosType,
      trigger: trigger || (sosType === 'HIGH_EMERGENCY' ? 'LONG_PRESS_3_5S' : 'SEQUENCE_363636'),
      channel: channel === 'HTTP' ? 'HTTP' : 'SMS',
      deviceId: id,
      phoneNumber: device.phoneNumber,
      ownerName: device.ownerName,
      locationSource,
      cellInfo: cellInfo || null,
      alarmDurationSec: 60,
      vibrationDurationSec: 60,
      smsStatus: 'PENDING',
    },
    timeline: [
      { status: 'CREATED', timestamp: now },
      { status: 'NOTIFIED', timestamp: now }
    ]
  };

  db.incidents.push(newIncident);
  persistDb().catch(e=>console.error(e));

  // RESQ Protocol: 2-minute acceptance window, then auto-escalation calling agent
  setTimeout(() => {
    const checkInc = db.incidents.find((i: any) => i.id === newIncident.id);
    if (checkInc && (checkInc.status === 'NOTIFIED' || checkInc.status === 'CREATED')) {
      checkInc.status = 'AUTO_ESCALATION_STARTED';
      checkInc.timeline.push({ status: 'AUTO_ESCALATION_STARTED', timestamp: Date.now() });
      persistDb().catch(e=>console.error(e));
    }
  }, ACCEPTANCE_WINDOW_MS);

  res.json(newIncident);
});

// Step 8 (REJECT path): ambulance unit rejects the keypad SOS
app.post("/api/incidents/:id/keypad-reject", (req, res) => {
  const { responderId, reason } = req.body || {};
  const inc = db.incidents.find((i: any) => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });
  if (inc.source !== 'KEYPAD_PHONE') {
    return res.status(400).json({ error: "Only keypad SOS incidents support reject" });
  }
  if (!['NOTIFIED', 'CREATED', 'AUTO_ESCALATION_STARTED'].includes(inc.status)) {
    return res.status(400).json({ error: "Incident already accepted or closed" });
  }
  inc.status = 'CANCELLED';
  if (inc.keypadSos) {
    inc.keypadSos.rejectedBy = responderId || null;
    inc.keypadSos.rejectReason = reason || 'Unit unavailable';
    inc.keypadSos.smsStatus = 'SKIPPED';
  }
  inc.timeline.push({ status: 'CANCELLED', timestamp: Date.now() });
  persistDb().catch(e=>console.error(e));
  res.json(inc);
});

// Steps 9-11: SMS API — backend → SMS provider → telecom network → SMS SENT.
// Called right after ACCEPT; logs one record per recipient in the database.
app.post("/api/incidents/:id/notify-contacts", (req, res) => {
  const { recipients } = req.body || {};
  const inc = db.incidents.find((i: any) => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });
  if (inc.source !== 'KEYPAD_PHONE') {
    return res.status(400).json({ error: "Only keypad SOS incidents support SMS notify" });
  }

  const device = db.keypadDevices.find((d: any) => d.deviceId === (inc.keypadSos?.deviceId));
  const defaultRecipients = [
    ...(device?.emergencyContacts || []),
    { name: 'Central EMS Authority (108)', phone: '108' },
  ];
  const list = Array.isArray(recipients) && recipients.length > 0 ? recipients : defaultRecipients;

  const sosLabel = `#${inc.sosNumber ?? inc.id.slice(0, 8).toUpperCase()}`;
  const message = `RESQ SOS ${sosLabel}: ${inc.conditionCategory || 'Emergency'} — ` +
    `${inc.address || 'location shared'}. Unit ${inc.assignedResponderId || 'assigning'} responding. ` +
    `Track via RESQ network.`;

  const sent: any[] = [];
  for (const r of list) {
    const entry = {
      id: crypto.randomUUID(),
      incidentId: inc.id,
      sosNumber: inc.sosNumber ?? null,
      to: typeof r === 'string' ? r : (r.phone || r.name),
      toName: typeof r === 'string' ? null : (r.name || null),
      channel: 'SMS',
      provider: 'telecom-network',
      message,
      status: 'SENT',
      timestamp: Date.now(),
    };
    db.smsLogs.unshift(entry);
    sent.push(entry);
  }

  if (inc.keypadSos) {
    inc.keypadSos.smsStatus = 'SENT';
    inc.keypadSos.smsSentAt = Date.now();
    inc.keypadSos.smsCount = sent.length;
  }
  persistDb().catch(e=>console.error(e));
  res.json({ success: true, smsStatus: 'SENT', count: sent.length, logs: sent });
});

// Update Incident Details (Additional Info provided by Patient / Bystander)
app.post("/api/incidents/:id/details", (req, res) => {
  const {
    condition,
    conditionCategory,
    conditionAcuity,
    conditionSubtitle,
    hospitalPreference,
    preferredHospitalId,
    preferredHospitalName
  } = req.body;

  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });

  if (condition) inc.condition = condition;
  if (conditionCategory) inc.conditionCategory = conditionCategory;
  if (conditionAcuity) inc.conditionAcuity = conditionAcuity;
  if (conditionSubtitle) inc.conditionSubtitle = conditionSubtitle;
  if (hospitalPreference) inc.hospitalPreference = hospitalPreference;
  if (preferredHospitalId !== undefined) inc.preferredHospitalId = preferredHospitalId;
  if (preferredHospitalName !== undefined) inc.preferredHospitalName = preferredHospitalName;
  inc.additionalInfoProvided = true;

  res.json(inc);
});

// Accept Incident (Responder)
app.post("/api/incidents/:id/accept", (req, res) => {
  const { responderId } = req.body;
  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });
  
  if (inc.status === 'NOTIFIED' || inc.status === 'CREATED') {
    inc.status = 'RESPONDER_EN_ROUTE';
    inc.assignedResponderId = responderId;
    inc.dispatchStartedAt = Date.now();
    inc.timeline.push({ status: 'RESPONDER_EN_ROUTE', timestamp: Date.now() });

    const responder = db.users.find(u => u.id === responderId);
    const responderName = responder ? responder.name : 'Ambulance Unit 1';
    const destinationAddress = inc.address || '1090 Market Street, SF';

    // Q-ARES Flowchart: AI-Assisted Dispatch + QPSO Metaheuristics Optimization
    inc.aiDispatch = {
      algorithm: 'QPSO_METAHEURISTICS',
      qpsoStatus: 'COMPUTED_OPTIMAL',
      latencyMs: 26,
      routeEfficiencyGain: '+36% (QPSO Metaheuristics + Green Wave)',
      sourceType: 'LOCAL_UNIT_ACCEPTED',
      sourceLabel: 'Direct Unit Acceptance (Within 2-Min Window)',
      assignedUnitName: responderName,
      greenCorridorPreempted: true,
      hospitalReadinessVerified: true,
      timestamp: Date.now()
    };

    // MANDATORY GREEN CORRIDOR - PHASE 1: Driver -> Patient Location
    inc.greenCorridor = {
      required: true,
      phase: 'EN_ROUTE_TO_PATIENT',
      phaseLabel: 'Phase 1: En Route to Patient Location',
      status: 'ACTIVE',
      notifiedAt: Date.now(),
      source: responderName + ' Station',
      destination: destinationAddress,
      speedKmH: 66,
      estimatedArrivalMinutes: 4,
      escortDispatched: false,
      junctions: [
        { id: 'j-01', name: '5th St & Market St', status: 'GREEN', etaSeconds: 45 },
        { id: 'j-02', name: '7th St & Market St', status: 'GREEN', etaSeconds: 95 },
        { id: 'j-03', name: '8th St & Hyde St Intersect', status: 'GREEN', etaSeconds: 150 },
        { id: 'j-04', name: 'Market St & Civic Center Plaza', status: 'CLEARING', etaSeconds: 210 }
      ]
    };

    // Notify Traffic Police immediately
    const trafficNotif = {
      id: crypto.randomUUID(),
      incidentId: inc.id,
      type: 'PHASE_1_EN_ROUTE_PATIENT',
      title: '🚨 MANDATORY GREEN CORRIDOR: UNIT EN ROUTE TO PATIENT',
      message: `${responderName} accepted SOS for ${inc.conditionCategory || inc.condition || 'Emergency'} (${inc.conditionAcuity || 'ALS'}). Mandatory green corridor requested to ${destinationAddress}.`,
      responderName,
      destinationName: destinationAddress,
      condition: inc.conditionCategory || inc.condition || 'Emergency',
      acuity: inc.conditionAcuity || 'ALS',
      timestamp: Date.now(),
      read: false,
      priority: 'CRITICAL'
    };
    db.trafficNotifications.unshift(trafficNotif);
    persistDb().catch(e=>console.error(e));

    res.json(inc);
  } else {
    res.status(400).json({ error: "Incident already accepted or escalated" });
  }
});

// Send to hospitals
app.post("/api/incidents/:id/hospital-request", (req, res) => {
  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });
  
  inc.status = 'HOSPITAL_COORDINATION';
  inc.notifiedHospitals = db.users.filter(u => u.role === 'HOSPITAL').map(h => h.id);
  inc.timeline.push({ status: 'HOSPITAL_COORDINATION', timestamp: Date.now() });
  res.json(inc);
});

// Hospital Accept/Reject
app.post("/api/incidents/:id/hospital-response", (req, res) => {
  const { hospitalId, response } = req.body; // response: 'ACCEPT' | 'REJECT'
  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });
  
  if (response === 'ACCEPT') {
    if (!inc.acceptedHospitals.includes(hospitalId)) inc.acceptedHospitals.push(hospitalId);
  } else {
    if (!inc.rejectedHospitals.includes(hospitalId)) inc.rejectedHospitals.push(hospitalId);
  }
  res.json(inc);
});

// Driver selects hospital
app.post("/api/incidents/:id/hospital-select", (req, res) => {
  const { hospitalId } = req.body;
  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });
  
  inc.selectedHospitalId = hospitalId;
  inc.status = 'HOSPITAL_SELECTED';
  inc.timeline.push({ status: 'HOSPITAL_SELECTED', timestamp: Date.now() });
  res.json(inc);
});

// Update status (Patient Picked, In Transit, Reached)
app.post("/api/incidents/:id/status", (req, res) => {
  const { status } = req.body;
  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: "Not found" });
  
  inc.status = status;
  inc.timeline.push({ status, timestamp: Date.now() });

  const responder = db.users.find(u => u.id === inc.assignedResponderId);
  const responderName = responder ? responder.name : 'Ambulance Unit 1';
  const hospital = db.users.find(u => u.id === inc.selectedHospitalId);
  const hospitalName = hospital ? hospital.name : 'San Francisco General Trauma Center';

  // MANDATORY GREEN CORRIDOR - PHASE 2: Driver with Patient -> Hospital
  if (status === 'IN_TRANSIT' || status === 'PATIENT_PICKED') {
    inc.phase2StartedAt = Date.now();
    inc.greenCorridor = {
      required: true,
      phase: 'IN_TRANSIT_TO_HOSPITAL',
      phaseLabel: 'Phase 2: In Transit to Hospital with Patient',
      status: 'ACTIVE',
      notifiedAt: Date.now(),
      source: inc.address || 'Patient Incident Location',
      destination: hospitalName,
      speedKmH: 74,
      estimatedArrivalMinutes: 6,
      escortDispatched: false,
      junctions: [
        { id: 'jh-01', name: 'Civic Center Southbound Express Ramp', status: 'GREEN', etaSeconds: 60 },
        { id: 'jh-02', name: 'US-101 S Corridor Preempted Lane', status: 'GREEN', etaSeconds: 140 },
        { id: 'jh-03', name: 'Potrero Ave & 16th St Junction', status: 'GREEN', etaSeconds: 220 },
        { id: 'jh-04', name: 'Potrero Ave & 22nd St (Hospital ED Gate)', status: 'CLEARING', etaSeconds: 310 }
      ]
    };

    // Notify Traffic Police for Phase 2
    const trafficNotif = {
      id: crypto.randomUUID(),
      incidentId: inc.id,
      type: 'PHASE_2_IN_TRANSIT_HOSPITAL',
      title: '🚨 MANDATORY GREEN CORRIDOR: IN TRANSIT TO HOSPITAL WITH PATIENT',
      message: `${responderName} picked up patient (${inc.conditionCategory || inc.condition || 'Emergency'} - ${inc.conditionAcuity || 'ALS'}). Mandatory emergency corridor activated to ${hospitalName}.`,
      responderName,
      destinationName: hospitalName,
      condition: inc.conditionCategory || inc.condition || 'Emergency',
      acuity: inc.conditionAcuity || 'ALS',
      timestamp: Date.now(),
      read: false,
      priority: 'CRITICAL'
    };
    db.trafficNotifications.unshift(trafficNotif);
  } else if (status === 'REACHED_DESTINATION' || status === 'COMPLETED') {
    if (inc.greenCorridor) {
      inc.greenCorridor.phase = 'COMPLETED';
      inc.greenCorridor.status = 'CLEARED';
    }
  }
  persistDb().catch(e=>console.error(e));

  res.json(inc);
});

// Traffic Police actions on Green Corridor
app.post("/api/incidents/:id/corridor-action", (req, res) => {
  const { action } = req.body; // 'ACKNOWLEDGE' | 'SYNC_ALL_GREEN' | 'DISPATCH_ESCORT'
  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc || !inc.greenCorridor) return res.status(404).json({ error: "Green corridor not found" });

  if (action === 'ACKNOWLEDGE') {
    inc.greenCorridor.acknowledgedAt = Date.now();
    inc.greenCorridor.status = 'ACKNOWLEDGED';
  } else if (action === 'SYNC_ALL_GREEN') {
    inc.greenCorridor.junctions.forEach((j: any) => {
      j.status = 'GREEN';
    });
    inc.greenCorridor.status = 'CLEARED';
  } else if (action === 'DISPATCH_ESCORT') {
    inc.greenCorridor.escortDispatched = true;
  }

  res.json(inc);
});

// Mark traffic notifications as read
app.post("/api/traffic-notifications/mark-read", (req, res) => {
  const { id } = req.body;
  if (id) {
    const notif = db.trafficNotifications.find(n => n.id === id);
    if (notif) notif.read = true;
  } else {
    db.trafficNotifications.forEach(n => n.read = true);
  }
  res.json({ success: true });
});

// Update Hospital Capacity (PostgreSQL 16: users capacity JSONB)
app.post("/api/hospitals/:id/capacity", async (req, res) => {
  const { erBeds, icuBeds, ventilators } = req.body;
  const hospital = db.users.find(u => u.id === req.params.id && u.role === 'HOSPITAL');
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });

  hospital.capacity = {
    erBeds: Math.max(0, Number(erBeds) || 0),
    icuBeds: Math.max(0, Number(icuBeds) || 0),
    ventilators: Math.max(0, Number(ventilators) || 0),
    lastUpdated: Date.now()
  };
  if (pgReady && isPgEnabled()) await upsertUser(hospital as any).catch(e=>console.error(e));
  else await persistDb();
  res.json({ success: true, capacity: hospital.capacity });
});

// Update a user's live GPS location (sent by the device Geolocation API)
// Accurate GPS: upsert device, store accuracy + timestamp, never reject demo fallback
app.post("/api/users/:id/location", async (req, res) => {
  const { lat, lng, accuracy } = req.body;
  let user = db.users.find((u: any) => u.id === req.params.id);
  // Auto-create patient/admin or any new device so GPS never 404s
  if (!user) {
    const inferredRole = req.params.id.startsWith('patient') ? 'PATIENT'
      : req.params.id.startsWith('driver') ? 'AMBULANCE_DRIVER'
      : req.params.id.startsWith('hospital') ? 'HOSPITAL'
      : req.params.id.startsWith('traffic') ? 'TRAFFIC_POLICE'
      : req.params.id.startsWith('admin') ? 'ADMIN' : 'PATIENT';
    user = { id: req.params.id, role: inferredRole, name: req.params.id, location: null, locationAccuracy: null, locationUpdatedAt: null, available: true } as any;
    db.users.push(user);
  }

  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) {
    return res.status(400).json({ error: "Invalid coordinates" });
  }
  const acc = Number.isFinite(Number(accuracy)) ? Number(accuracy) : null;
  // Ignore extremely coarse fixes (>5km) only if we already have a better fix
  if (acc != null && acc > 5000 && user.locationAccuracy != null && user.locationAccuracy < 1000) {
    return res.json({ success: true, location: user.location, note: "Ignored coarse fix, kept prior accurate GPS" });
  }
  user.location = { lat: la, lng: ln };
  (user as any).locationAccuracy = acc;
  (user as any).locationUpdatedAt = Date.now();
  if (pgReady && isPgEnabled()) await upsertUser(user as any).catch(e=>console.error(e));
  else await persistDb();
  // Hospitals are buildings - keep last GPS but log it; drivers/patients are mobile - location is their real position
  res.json({ success: true, location: user.location, accuracy: acc, updatedAt: (user as any).locationUpdatedAt });
});

// Submit Feedback
app.post("/api/feedbacks", (req, res) => {
  const { incidentId, fromRole, toRole, fromId, toId, rating, comment } = req.body;
  const newFeedback = {
    id: crypto.randomUUID(),
    incidentId,
    fromRole,
    toRole,
    fromId,
    toId,
    rating,
    comment,
    timestamp: Date.now()
  };
  db.feedbacks.push(newFeedback);
  persistDb().catch(e=>console.error(e));
  res.json(newFeedback);
});

export default app;

async function startServer() {
  await ensureDb();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4.x
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL !== "1") {
  startServer();
}

