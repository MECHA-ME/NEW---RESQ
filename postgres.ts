import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://resq:resq@localhost:5432/resq';

let pool: pg.Pool | null = null;
let pgEnabled = false;

export function getPool(): pg.Pool | null { return pool; }
export function isPgEnabled(): boolean { return pgEnabled; }

export async function initPostgres(): Promise<boolean> {
  if (!DATABASE_URL.startsWith('postgresql://') && !DATABASE_URL.startsWith('postgres://')) {
    console.log('PostgreSQL not configured (DATABASE_URL not postgresql://) — falling back to db.json');
    return false;
  }
  try {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });
    const c = await pool.connect();
    await c.query('SELECT 1');
    c.release();
    // Ensure schema exists (init.sql already does, but runtime guard)
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, role TEXT NOT NULL, name TEXT NOT NULL,
        location_lat DOUBLE PRECISION, location_lng DOUBLE PRECISION,
        location_accuracy DOUBLE PRECISION, location_updated_at BIGINT,
        hospital_level TEXT, command_title TEXT, capacity JSONB, available BOOLEAN DEFAULT true,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())*1000
      );
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY, sos_number INTEGER, source TEXT, type TEXT NOT NULL,
        patient_id TEXT NOT NULL, caller_role TEXT, victim_count INTEGER, address TEXT,
        location_lat DOUBLE PRECISION NOT NULL, location_lng DOUBLE PRECISION NOT NULL,
        condition TEXT, condition_category TEXT, condition_acuity TEXT, condition_subtitle TEXT,
        hospital_preference TEXT, preferred_hospital_id TEXT, preferred_hospital_name TEXT,
        additional_info_provided BOOLEAN DEFAULT false, ambulances_required INTEGER,
        status TEXT NOT NULL, assigned_responder_id TEXT, notified_hospitals JSONB DEFAULT '[]'::jsonb,
        accepted_hospitals JSONB DEFAULT '[]'::jsonb, rejected_hospitals JSONB DEFAULT '[]'::jsonb,
        selected_hospital_id TEXT, created_at BIGINT NOT NULL, acceptance_deadline BIGINT,
        timeline JSONB DEFAULT '[]'::jsonb, green_corridor JSONB, ai_dispatch JSONB, keypad_sos JSONB,
        phase2_started_at BIGINT, dispatch_started_at BIGINT, accepted_at BIGINT
      );
      CREATE TABLE IF NOT EXISTS feedbacks (
        id TEXT PRIMARY KEY, incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
        from_role TEXT, to_role TEXT, from_id TEXT, to_id TEXT, rating INTEGER, comment TEXT, timestamp BIGINT
      );
      CREATE TABLE IF NOT EXISTS traffic_notifications (
        id TEXT PRIMARY KEY, incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
        type TEXT, title TEXT, message TEXT, responder_name TEXT, destination_name TEXT,
        condition TEXT, acuity TEXT, timestamp BIGINT, read BOOLEAN DEFAULT false, priority TEXT
      );
      CREATE TABLE IF NOT EXISTS sms_logs (
        id TEXT PRIMARY KEY, incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
        sos_number INTEGER, to_field TEXT, to_name TEXT, channel TEXT, provider TEXT, message TEXT, status TEXT, timestamp BIGINT
      );
      CREATE TABLE IF NOT EXISTS keypad_devices (
        device_id TEXT PRIMARY KEY, phone_number TEXT, owner_name TEXT, emergency_contacts JSONB DEFAULT '[]'::jsonb, registered_at BIGINT
      );
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value JSONB NOT NULL);
      INSERT INTO meta (key, value) VALUES ('sosCounter','1024'::jsonb) ON CONFLICT (key) DO NOTHING;
    `);
    pgEnabled = true;
    console.log('PostgreSQL 16 connected: ' + DATABASE_URL.replace(/:[^@]+@/, ':***@'));
    return true;
  } catch (e) {
    console.error('PostgreSQL init failed — falling back to db.json:', e);
    pgEnabled = false;
    pool = null;
    return false;
  }
}

// Row mappers: DB row -> app object
function userFromRow(r: any): any {
  return {
    id: r.id,
    role: r.role,
    name: r.name,
    location: (r.location_lat != null && r.location_lng != null) ? { lat: Number(r.location_lat), lng: Number(r.location_lng) } : null,
    locationAccuracy: r.location_accuracy != null ? Number(r.location_accuracy) : null,
    locationUpdatedAt: r.location_updated_at != null ? Number(r.location_updated_at) : null,
    hospitalLevel: r.hospital_level,
    commandTitle: r.command_title,
    capacity: r.capacity,
    available: r.available
  };
}

function incidentFromRow(r: any): any {
  return {
    id: r.id,
    sosNumber: r.sos_number,
    source: r.source,
    type: r.type,
    patientId: r.patient_id,
    callerRole: r.caller_role,
    victimCount: r.victim_count,
    address: r.address,
    location: { lat: Number(r.location_lat), lng: Number(r.location_lng) },
    condition: r.condition,
    conditionCategory: r.condition_category,
    conditionAcuity: r.condition_acuity,
    conditionSubtitle: r.condition_subtitle,
    hospitalPreference: r.hospital_preference,
    preferredHospitalId: r.preferred_hospital_id,
    preferredHospitalName: r.preferred_hospital_name,
    additionalInfoProvided: r.additional_info_provided,
    ambulancesRequired: r.ambulances_required,
    status: r.status,
    assignedResponderId: r.assigned_responder_id,
    notifiedHospitals: r.notified_hospitals || [],
    acceptedHospitals: r.accepted_hospitals || [],
    rejectedHospitals: r.rejected_hospitals || [],
    selectedHospitalId: r.selected_hospital_id,
    createdAt: Number(r.created_at),
    acceptanceDeadline: r.acceptance_deadline != null ? Number(r.acceptance_deadline) : undefined,
    timeline: r.timeline || [],
    greenCorridor: r.green_corridor,
    aiDispatch: r.ai_dispatch,
    keypadSos: r.keypad_sos,
    phase2StartedAt: r.phase2_started_at != null ? Number(r.phase2_started_at) : undefined,
    dispatchStartedAt: r.dispatch_started_at != null ? Number(r.dispatch_started_at) : undefined,
    acceptedAt: r.accepted_at != null ? Number(r.accepted_at) : undefined
  };
}

export async function loadFromPostgres(db: any) {
  if (!pool || !pgEnabled) return false;
  try {
    const usersRes = await pool.query('SELECT * FROM users');
    const incidentsRes = await pool.query('SELECT * FROM incidents ORDER BY created_at ASC');
    const feedbacksRes = await pool.query('SELECT * FROM feedbacks ORDER BY timestamp ASC');
    const trafRes = await pool.query('SELECT * FROM traffic_notifications ORDER BY timestamp DESC');
    const smsRes = await pool.query('SELECT * FROM sms_logs ORDER BY timestamp DESC');
    const keypadRes = await pool.query('SELECT * FROM keypad_devices');
    const metaRes = await pool.query("SELECT value FROM meta WHERE key='sosCounter'");
    if (usersRes.rows.length > 0) {
      db.users = usersRes.rows.map(userFromRow);
      console.log(`PostgreSQL: loaded ${db.users.length} users`);
    }
    if (incidentsRes.rows.length) db.incidents = incidentsRes.rows.map(incidentFromRow);
    db.feedbacks = feedbacksRes.rows.map((r:any)=>({
      id:r.id, incidentId:r.incident_id, fromRole:r.from_role, toRole:r.to_role, fromId:r.from_id, toId:r.to_id, rating:Number(r.rating), comment:r.comment, timestamp:Number(r.timestamp)
    }));
    db.trafficNotifications = trafRes.rows.map((r:any)=>({
      id:r.id, incidentId:r.incident_id, type:r.type, title:r.title, message:r.message, responderName:r.responder_name, destinationName:r.destination_name, condition:r.condition, acuity:r.acuity, timestamp:Number(r.timestamp), read:r.read, priority:r.priority
    }));
    db.smsLogs = smsRes.rows.map((r:any)=>({
      id:r.id, incidentId:r.incident_id, sosNumber:r.sos_number, to:r.to_field, toName:r.to_name, channel:r.channel, provider:r.provider, message:r.message, status:r.status, timestamp:Number(r.timestamp)
    }));
    db.keypadDevices = keypadRes.rows.map((r:any)=>({
      deviceId:r.device_id, phoneNumber:r.phone_number, ownerName:r.owner_name, emergencyContacts:r.emergency_contacts||[], registeredAt:Number(r.registered_at)
    }));
    if (metaRes.rows[0]?.value != null) {
      const v = metaRes.rows[0].value;
      db.sosCounter = typeof v === 'number' ? v : Number(v);
    }
    console.log(`PostgreSQL: loaded ${db.incidents.length} incidents, sosCounter #${db.sosCounter}`);
    return true;
  } catch (e) {
    console.error('PostgreSQL load failed:', e);
    return false;
  }
}

export async function upsertUser(user: any) {
  if (!pool || !pgEnabled) return;
  await pool.query(`
    INSERT INTO users (id, role, name, location_lat, location_lng, location_accuracy, location_updated_at, hospital_level, command_title, capacity, available)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, name=EXCLUDED.name, location_lat=EXCLUDED.location_lat, location_lng=EXCLUDED.location_lng,
      location_accuracy=EXCLUDED.location_accuracy, location_updated_at=EXCLUDED.location_updated_at,
      hospital_level=EXCLUDED.hospital_level, command_title=EXCLUDED.command_title, capacity=EXCLUDED.capacity, available=EXCLUDED.available
  `, [user.id, user.role, user.name, user.location?.lat ?? null, user.location?.lng ?? null, (user as any).locationAccuracy ?? null, (user as any).locationUpdatedAt ?? null, (user as any).hospitalLevel ?? null, (user as any).commandTitle ?? null, user.capacity ? JSON.stringify(user.capacity) : null, user.available ?? true]);
}

export async function upsertIncident(inc: any) {
  if (!pool || !pgEnabled) return;
  await pool.query(`
    INSERT INTO incidents (id, sos_number, source, type, patient_id, caller_role, victim_count, address, location_lat, location_lng,
      condition, condition_category, condition_acuity, condition_subtitle, hospital_preference, preferred_hospital_id, preferred_hospital_name,
      additional_info_provided, ambulances_required, status, assigned_responder_id, notified_hospitals, accepted_hospitals, rejected_hospitals,
      selected_hospital_id, created_at, acceptance_deadline, timeline, green_corridor, ai_dispatch, keypad_sos, phase2_started_at, dispatch_started_at, accepted_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34)
    ON CONFLICT (id) DO UPDATE SET sos_number=EXCLUDED.sos_number, source=EXCLUDED.source, type=EXCLUDED.type, patient_id=EXCLUDED.patient_id,
      caller_role=EXCLUDED.caller_role, victim_count=EXCLUDED.victim_count, address=EXCLUDED.address, location_lat=EXCLUDED.location_lat, location_lng=EXCLUDED.location_lng,
      condition=EXCLUDED.condition, condition_category=EXCLUDED.condition_category, condition_acuity=EXCLUDED.condition_acuity, condition_subtitle=EXCLUDED.condition_subtitle,
      hospital_preference=EXCLUDED.hospital_preference, preferred_hospital_id=EXCLUDED.preferred_hospital_id, preferred_hospital_name=EXCLUDED.preferred_hospital_name,
      additional_info_provided=EXCLUDED.additional_info_provided, ambulances_required=EXCLUDED.ambulances_required, status=EXCLUDED.status,
      assigned_responder_id=EXCLUDED.assigned_responder_id, notified_hospitals=EXCLUDED.notified_hospitals, accepted_hospitals=EXCLUDED.accepted_hospitals, rejected_hospitals=EXCLUDED.rejected_hospitals,
      selected_hospital_id=EXCLUDED.selected_hospital_id, created_at=EXCLUDED.created_at, acceptance_deadline=EXCLUDED.acceptance_deadline,
      timeline=EXCLUDED.timeline, green_corridor=EXCLUDED.green_corridor, ai_dispatch=EXCLUDED.ai_dispatch, keypad_sos=EXCLUDED.keypad_sos,
      phase2_started_at=EXCLUDED.phase2_started_at, dispatch_started_at=EXCLUDED.dispatch_started_at, accepted_at=EXCLUDED.accepted_at
  `, [
    inc.id, inc.sosNumber ?? null, inc.source ?? null, inc.type, inc.patientId, inc.callerRole ?? null, inc.victimCount ?? null, inc.address ?? null, inc.location.lat, inc.location.lng,
    inc.condition ?? null, inc.conditionCategory ?? null, inc.conditionAcuity ?? null, inc.conditionSubtitle ?? null, inc.hospitalPreference ?? null, inc.preferredHospitalId ?? null, inc.preferredHospitalName ?? null,
    inc.additionalInfoProvided ?? false, inc.ambulancesRequired ?? null, inc.status, inc.assignedResponderId ?? null, JSON.stringify(inc.notifiedHospitals||[]), JSON.stringify(inc.acceptedHospitals||[]), JSON.stringify(inc.rejectedHospitals||[]),
    inc.selectedHospitalId ?? null, inc.createdAt, inc.acceptanceDeadline ?? null, JSON.stringify(inc.timeline||[]), inc.greenCorridor ? JSON.stringify(inc.greenCorridor) : null, inc.aiDispatch ? JSON.stringify(inc.aiDispatch) : null, inc.keypadSos ? JSON.stringify(inc.keypadSos) : null,
    inc.phase2StartedAt ?? null, inc.dispatchStartedAt ?? null, inc.acceptedAt ?? null
  ]);
}

export async function deleteIncident(id: string) {
  if (!pool || !pgEnabled) return;
  await pool.query('DELETE FROM incidents WHERE id=$1', [id]);
}

export async function persistMeta(sosCounter: number) {
  if (!pool || !pgEnabled) return;
  await pool.query(`INSERT INTO meta (key, value) VALUES ('sosCounter', to_jsonb($1::int)) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`, [sosCounter]);
}

export async function upsertFeedback(f: any) {
  if (!pool || !pgEnabled) return;
  await pool.query(`INSERT INTO feedbacks (id, incident_id, from_role, to_role, from_id, to_id, rating, comment, timestamp) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET incident_id=EXCLUDED.incident_id, from_role=EXCLUDED.from_role, to_role=EXCLUDED.to_role, from_id=EXCLUDED.from_id, to_id=EXCLUDED.to_id, rating=EXCLUDED.rating, comment=EXCLUDED.comment, timestamp=EXCLUDED.timestamp`, [f.id, f.incidentId, f.fromRole, f.toRole, f.fromId, f.toId, f.rating, f.comment, f.timestamp]);
}

export async function upsertTraffic(n: any) {
  if (!pool || !pgEnabled) return;
  await pool.query(`INSERT INTO traffic_notifications (id, incident_id, type, title, message, responder_name, destination_name, condition, acuity, timestamp, read, priority) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO UPDATE SET incident_id=EXCLUDED.incident_id, type=EXCLUDED.type, title=EXCLUDED.title, message=EXCLUDED.message, responder_name=EXCLUDED.responder_name, destination_name=EXCLUDED.destination_name, condition=EXCLUDED.condition, acuity=EXCLUDED.acuity, timestamp=EXCLUDED.timestamp, read=EXCLUDED.read, priority=EXCLUDED.priority`, [n.id, n.incidentId, n.type, n.title, n.message, n.responderName, n.destinationName, n.condition, n.acuity, n.timestamp, n.read, n.priority]);
}

export async function upsertSms(s: any) {
  if (!pool || !pgEnabled) return;
  await pool.query(`INSERT INTO sms_logs (id, incident_id, sos_number, to_field, to_name, channel, provider, message, status, timestamp) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET incident_id=EXCLUDED.incident_id, sos_number=EXCLUDED.sos_number, to_field=EXCLUDED.to_field, to_name=EXCLUDED.to_name, channel=EXCLUDED.channel, provider=EXCLUDED.provider, message=EXCLUDED.message, status=EXCLUDED.status, timestamp=EXCLUDED.timestamp`, [s.id, s.incidentId, s.sosNumber, s.to, s.toName, s.channel, s.provider, s.message, s.status, s.timestamp]);
}

export async function upsertKeypad(d: any) {
  if (!pool || !pgEnabled) return;
  await pool.query(`INSERT INTO keypad_devices (device_id, phone_number, owner_name, emergency_contacts, registered_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (device_id) DO UPDATE SET phone_number=EXCLUDED.phone_number, owner_name=EXCLUDED.owner_name, emergency_contacts=EXCLUDED.emergency_contacts, registered_at=EXCLUDED.registered_at`, [d.deviceId, d.phoneNumber, d.ownerName, JSON.stringify(d.emergencyContacts||[]), d.registeredAt]);
}

export async function clearIncidents() {
  if (!pool || !pgEnabled) return;
  await pool.query('DELETE FROM traffic_notifications');
  await pool.query('DELETE FROM sms_logs');
  await pool.query('DELETE FROM feedbacks');
  await pool.query('DELETE FROM incidents');
}

export async function seedIfEmpty(defaultUsers: any[], defaultSosCounter: number) {
  if (!pool || !pgEnabled) return;
  const r = await pool.query('SELECT COUNT(*) as c FROM users');
  if (Number(r.rows[0].c) === 0) {
    for (const u of defaultUsers) await upsertUser(u as any);
    await persistMeta(defaultSosCounter);
    console.log('PostgreSQL: seeded default users');
  }
}
