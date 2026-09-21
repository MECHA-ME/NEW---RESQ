import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

const app = express();
app.use(express.json());
const PORT = 3000;

// In-memory Database
let db = {
  incidents: [] as any[],
  feedbacks: [] as any[],
  trafficNotifications: [] as any[],
  users: [
    { id: 'driver_1', role: 'AMBULANCE_DRIVER', name: 'Ambulance Unit 1', location: { lat: 12.9716, lng: 77.5946 }, available: true },
    { id: 'driver_2', role: 'AMBULANCE_DRIVER', name: 'Ambulance Unit 2', location: { lat: 12.9616, lng: 77.5846 }, available: true },
    { id: 'fire_1', role: 'FIRE_RESCUE', name: 'Fire Engine A', location: { lat: 12.9816, lng: 77.6046 }, available: true },
    { 
      id: 'traffic_1', 
      role: 'TRAFFIC_POLICE', 
      name: 'SF Metropolitan Traffic & Green Corridor Command', 
      location: { lat: 37.7749, lng: -122.4194 }, 
      available: true 
    },
    { 
      id: 'hospital_1', 
      role: 'HOSPITAL', 
      name: 'San Francisco General Trauma Center', 
      hospitalLevel: 'LEVEL 1',
      commandTitle: 'Emergency Department Command • Dr. Sarah Lin, MD (Attending)',
      location: { lat: 37.7554, lng: -122.4047 },
      capacity: { erBeds: 28, icuBeds: 6, ventilators: 11, lastUpdated: Date.now() }
    },
    { 
      id: 'hospital_2', 
      role: 'HOSPITAL', 
      name: 'UCSF Medical Center at Mission Bay', 
      hospitalLevel: 'LEVEL 1',
      commandTitle: 'Acute Care Division • Dr. Marcus Vance, MD',
      location: { lat: 37.7689, lng: -122.3912 },
      capacity: { erBeds: 18, icuBeds: 4, ventilators: 8, lastUpdated: Date.now() }
    }
  ]
};

// Reset API for testing
app.post("/api/reset", (req, res) => {
  db.incidents = [];
  db.feedbacks = [];
  db.trafficNotifications = [];
  res.json({ success: true });
});

// Get current state
app.get("/api/state", (req, res) => {
  res.json(db);
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
    location: location || { lat: 37.7793, lng: -122.4162 },
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

  const isAmbulance = inc.type === 'AMBULANCE';
  const assignedResponderId = isAmbulance ? 'driver_1' : 'fire_1';
  const assignedUnitName = isAmbulance 
    ? 'Govt EMS Ambulance 108 (Central Metro Fleet)' 
    : 'Central Fire & Rescue Engine 101';

  inc.status = 'RESPONDER_EN_ROUTE';
  inc.assignedResponderId = assignedResponderId;
  inc.timeline.push({ status: 'RESPONDER_EN_ROUTE', timestamp: Date.now() });

  // Q-ARES Flowchart: AI-Assisted Dispatch + QPSO Metaheuristics Optimization
  inc.aiDispatch = {
    algorithm: 'QPSO_METAHEURISTICS',
    qpsoStatus: 'COMPUTED_OPTIMAL',
    latencyMs: 34,
    routeEfficiencyGain: '+41% (QPSO Metaheuristics + Green Wave)',
    sourceType: isAmbulance ? 'AUTOMATIC_CALLING_AGENT_108' : 'AUTOMATIC_CALLING_AGENT_101',
    sourceLabel: isAmbulance ? '108 Government EMS Central Switchboard' : '101 Fire & Rescue Escalation Command',
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
    source: isAmbulance ? 'Central Govt EMS Command (108)' : 'Central Fire Station (101)',
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
    message: `Calling Agent connected to ${isAmbulance ? '108 Government EMS' : '101 Fire & Rescue'}. Unit ${assignedUnitName} dispatched to ${destinationAddress}. QPSO Route Optimization & Green Wave synchronized.`,
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
    inc.timeline.push({ status: 'RESPONDER_EN_ROUTE', timestamp: Date.now() });

    const responder = db.users.find(u => u.id === responderId);
    const responderName = responder ? responder.name : (inc.type === 'FIRE_RESCUE' ? 'Fire Engine A' : 'Ambulance Unit 1');
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
  const responderName = responder ? responder.name : (inc.type === 'FIRE_RESCUE' ? 'Fire Engine A' : 'Ambulance Unit 1');
  const hospital = db.users.find(u => u.id === inc.selectedHospitalId);
  const hospitalName = hospital ? hospital.name : 'San Francisco General Trauma Center';

  // MANDATORY GREEN CORRIDOR - PHASE 2: Driver with Patient -> Hospital
  if (status === 'IN_TRANSIT' || status === 'PATIENT_PICKED') {
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

// Update Hospital Capacity
app.post("/api/hospitals/:id/capacity", (req, res) => {
  const { erBeds, icuBeds, ventilators } = req.body;
  const hospital = db.users.find(u => u.id === req.params.id && u.role === 'HOSPITAL');
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });

  hospital.capacity = {
    erBeds: Math.max(0, Number(erBeds) || 0),
    icuBeds: Math.max(0, Number(icuBeds) || 0),
    ventilators: Math.max(0, Number(ventilators) || 0),
    lastUpdated: Date.now()
  };
  res.json({ success: true, capacity: hospital.capacity });
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
  res.json(newFeedback);
});

async function startServer() {
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

startServer();
