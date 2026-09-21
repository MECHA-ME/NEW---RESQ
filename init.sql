-- RESQ PostgreSQL 16 schema — best suitable stable version for GIS + JSONB + high concurrency
-- Enable extensions useful for accurate GPS (PostGIS optional, jsonb already)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users: all roles — location is accurate GPS (lat/lng + accuracy + updated_at)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('PATIENT','AMBULANCE_DRIVER','HOSPITAL','TRAFFIC_POLICE','ADMIN')),
  name TEXT NOT NULL,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_accuracy DOUBLE PRECISION,
  location_updated_at BIGINT,
  hospital_level TEXT,
  command_title TEXT,
  capacity JSONB,
  available BOOLEAN DEFAULT true,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())*1000
);

-- Incidents: SOS lifecycle — location is accurate GPS from device
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  sos_number INTEGER,
  source TEXT,
  type TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  caller_role TEXT,
  victim_count INTEGER,
  address TEXT,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  condition TEXT,
  condition_category TEXT,
  condition_acuity TEXT,
  condition_subtitle TEXT,
  hospital_preference TEXT,
  preferred_hospital_id TEXT,
  preferred_hospital_name TEXT,
  additional_info_provided BOOLEAN DEFAULT false,
  ambulances_required INTEGER,
  status TEXT NOT NULL,
  assigned_responder_id TEXT REFERENCES users(id),
  notified_hospitals JSONB DEFAULT '[]'::jsonb,
  accepted_hospitals JSONB DEFAULT '[]'::jsonb,
  rejected_hospitals JSONB DEFAULT '[]'::jsonb,
  selected_hospital_id TEXT REFERENCES users(id),
  created_at BIGINT NOT NULL,
  acceptance_deadline BIGINT,
  timeline JSONB DEFAULT '[]'::jsonb,
  green_corridor JSONB,
  ai_dispatch JSONB,
  keypad_sos JSONB,
  phase2_started_at BIGINT,
  dispatch_started_at BIGINT,
  accepted_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_patient ON incidents(patient_id);
CREATE INDEX IF NOT EXISTS idx_incidents_responder ON incidents(assigned_responder_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
-- GIN for fast JSONB queries on hospital lists (if needed for dispatch)
CREATE INDEX IF NOT EXISTS idx_incidents_notified_gin ON incidents USING GIN (notified_hospitals);

-- Feedbacks: mandatory after COMPLETED (no skip)
CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  from_role TEXT NOT NULL,
  to_role TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  timestamp BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedbacks_incident ON feedbacks(incident_id);

-- Traffic notifications: green corridor alerts
CREATE TABLE IF NOT EXISTS traffic_notifications (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  responder_name TEXT,
  destination_name TEXT,
  condition TEXT,
  acuity TEXT,
  timestamp BIGINT NOT NULL,
  read BOOLEAN DEFAULT false,
  priority TEXT
);
CREATE INDEX IF NOT EXISTS idx_traffic_timestamp ON traffic_notifications(timestamp DESC);

-- SMS logs: keypad flow steps 9-11
CREATE TABLE IF NOT EXISTS sms_logs (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  sos_number INTEGER,
  to_field TEXT NOT NULL,
  to_name TEXT,
  channel TEXT NOT NULL,
  provider TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Keypad devices: button phone registry
CREATE TABLE IF NOT EXISTS keypad_devices (
  device_id TEXT PRIMARY KEY,
  phone_number TEXT,
  owner_name TEXT,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  registered_at BIGINT NOT NULL
);

-- Meta: SOS counter etc.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
INSERT INTO meta (key, value) VALUES ('sosCounter', '1024'::jsonb) ON CONFLICT (key) DO NOTHING;
