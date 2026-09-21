import React, { useState, useEffect, useRef } from 'react';
import { AppState, Incident } from '../types';
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  MessageSquareText,
  Phone,
  Radio,
  Siren,
  Vibrate,
  Hash,
  RotateCcw,
} from 'lucide-react';
import { useLiveGeolocation } from '../utils/useLiveGeolocation';
import LiveEmergencyMap from './LiveEmergencyMap';

type Phase = 'choose' | 'alerting' | 'send' | 'tracking' | 'rejected' | 'done';

const TRIGGER_SEQ = ['3', '6', '3', '6', '3', '6'];
const HOLD_MS = 5000; // Case 1: hold button 3 for 5 seconds
const ALARM_SEC = 60; // Case 3: alarm + vibration for 60 seconds

const FLOW_STEPS = [
  'Keypad Phone', 'Choose SOS Type', 'Trigger SOS Actions', 'Send SOS',
  'HTTP POST / Webhook', 'Our Backend', 'Database', 'Ambulance App',
  'Backend Assign', 'SMS API', 'SMS Sent', 'End (Idle)',
];

export default function KeypadPhoneSimulator({ state, fetchState }: { state: AppState; fetchState: () => void }) {
  const [phase, setPhase] = useState<Phase>('choose');
  const [sosType, setSosType] = useState<'HIGH_EMERGENCY' | 'EMERGENCY'>('HIGH_EMERGENCY');
  const [triggerKind, setTriggerKind] = useState<'LONG_PRESS_3_5S' | 'SEQUENCE_363636'>('LONG_PRESS_3_5S');

  // Keypad interaction state
  const [seq, setSeq] = useState<string[]>([]);
  const [seqError, setSeqError] = useState(false);
  const [holdPct, setHoldPct] = useState(0);
  const holdTimerRef = useRef<any>(null);

  // Alerting state (step 3)
  const [alarmLeft, setAlarmLeft] = useState(ALARM_SEC);
  const alarmTimerRef = useRef<any>(null);
  const audioRef = useRef<{ ctx: AudioContext | null; beep: any }>({ ctx: null, beep: null });

  // Send state (step 4)
  const [deviceId, setDeviceId] = useState('KEYPAD-7841');
  const [phoneNumber, setPhoneNumber] = useState('+1-415-555-0136');
  const [ownerName, setOwnerName] = useState('Keypad Phone User');
  const [channel, setChannel] = useState<'SMS' | 'HTTP'>('SMS');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Tracking state (steps 5-12)
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [smsFired, setSmsFired] = useState(false);

  const { fix: gpsFix, retry: retryGps } = useLiveGeolocation(true);
  const incident: Incident | undefined = state.incidents.find((i: Incident) => i.id === incidentId);
  const mySms = (state.smsLogs || []).filter((s: any) => s.incidentId === incidentId);

  // ---- Alarm (WebAudio beeping) + vibration helpers ----
  const startAlarm = () => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC && !audioRef.current.ctx) {
        const ctx: AudioContext = new AC();
        audioRef.current.ctx = ctx;
        const beep = () => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'square';
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
          } catch (e) { console.error(e); }
        };
        beep();
        audioRef.current.beep = setInterval(beep, 900);
      }
    } catch (e) { console.error('Alarm audio unavailable', e); }
    try {
      if ((navigator as any).vibrate) (navigator as any).vibrate(ALARM_SEC * 1000);
    } catch (e) { console.error(e); }
  };

  const stopAlarm = () => {
    if (audioRef.current.beep) clearInterval(audioRef.current.beep);
    audioRef.current.beep = null;
    if (audioRef.current.ctx) {
      audioRef.current.ctx.close().catch(() => {});
      audioRef.current.ctx = null;
    }
    try {
      if ((navigator as any).vibrate) (navigator as any).vibrate(0);
    } catch (e) { console.error(e); }
  };

  useEffect(() => () => {
    stopAlarm();
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (alarmTimerRef.current) clearInterval(alarmTimerRef.current);
  }, []);

  // ---- Case 1: long-press button 3 for 5 seconds ----
  const beginHold = () => {
    if (phase !== 'choose') return;
    const started = Date.now();
    setHoldPct(0);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(100, Math.round((elapsed / HOLD_MS) * 100));
      setHoldPct(pct);
      if (pct >= 100) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setHoldPct(0);
        fireTrigger('HIGH_EMERGENCY', 'LONG_PRESS_3_5S');
      }
    }, 50);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    setHoldPct(0);
  };

  // ---- Case 2: key sequence 3-6-3-6-3-6 ----
  const pressKey = (key: string) => {
    if (phase !== 'choose') return;
    if (key !== '3' && key !== '6') {
      setSeq([]);
      setSeqError(true);
      setTimeout(() => setSeqError(false), 800);
      return;
    }
    const next = [...seq, key];
    const expected = TRIGGER_SEQ.slice(0, next.length);
    if (next.join('') === expected.join('')) {
      setSeq(next);
      setSeqError(false);
      if (next.length === TRIGGER_SEQ.length) {
        setSeq([]);
        fireTrigger('EMERGENCY', 'SEQUENCE_363636');
      }
    } else if (key === '3') {
      setSeq(['3']);
      setSeqError(false);
    } else {
      setSeq([]);
      setSeqError(true);
      setTimeout(() => setSeqError(false), 800);
    }
  };

  // ---- Step 2 → 3: SOS type chosen, start 60s alarm + vibration ----
  const fireTrigger = (type: 'HIGH_EMERGENCY' | 'EMERGENCY', trigger: 'LONG_PRESS_3_5S' | 'SEQUENCE_363636') => {
    setSosType(type);
    setTriggerKind(trigger);
    setAlarmLeft(ALARM_SEC);
    setPhase('alerting');
    startAlarm();
    if (alarmTimerRef.current) clearInterval(alarmTimerRef.current);
    alarmTimerRef.current = setInterval(() => {
      setAlarmLeft((prev) => {
        if (prev <= 1) {
          if (alarmTimerRef.current) clearInterval(alarmTimerRef.current);
          stopAlarm();
          setPhase('send');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipAlarm = () => {
    if (alarmTimerRef.current) clearInterval(alarmTimerRef.current);
    stopAlarm();
    setPhase('send');
  };

  // ---- Step 4 → 5: transmit SOS via SMS / HTTP webhook ----
  const transmitSos = async () => {
    if (!deviceId.trim()) {
      setSendError('Device ID is required');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/keypad-sos/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceId.trim(),
          phoneNumber: phoneNumber.trim(),
          ownerName: ownerName.trim(),
          sosType,
          trigger: triggerKind,
          channel,
          location: gpsFix ? { lat: gpsFix.lat, lng: gpsFix.lng } : null,
          cellInfo: gpsFix ? null : 'MCC 310 / MNC 120 / Cell triangulation',
          address: gpsFix
            ? `Keypad SOS GPS ${gpsFix.lat.toFixed(5)}, ${gpsFix.lng.toFixed(5)}`
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Webhook failed');
      setIncidentId(data.id);
      setSmsFired(false);
      setPhase('tracking');
      fetchState();
    } catch (e: any) {
      setSendError(e.message || 'Failed to send SOS');
    } finally {
      setSending(false);
    }
  };

  // ---- Steps 9-11: once an ambulance ACCEPTS, fire the SMS API a single time ----
  useEffect(() => {
    if (
      phase === 'tracking' &&
      incident &&
      incident.assignedResponderId &&
      incident.keypadSos?.smsStatus === 'PENDING' &&
      !smsFired
    ) {
      setSmsFired(true);
      fetch(`/api/incidents/${incident.id}/notify-contacts`, { method: 'POST' })
        .then(() => fetchState())
        .catch((e) => console.error('SMS notify failed', e));
    }
    if (phase === 'tracking' && incident && incident.status === 'CANCELLED') {
      setPhase('rejected');
    }
  }, [phase, incident, smsFired, fetchState]);

  const resetAll = () => {
    setPhase('choose');
    setSeq([]);
    setHoldPct(0);
    setIncidentId(null);
    setSmsFired(false);
    setSendError('');
    setAlarmLeft(ALARM_SEC);
  };

  const flowIndex = phase === 'choose' ? 1 : phase === 'alerting' ? 2 : phase === 'send' ? 3 : 7;

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Flow progress header */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black tracking-tight flex items-center gap-2">
            <Phone size={16} className="text-amber-400" />
            <span>Button-Phone (Keypad) SOS Flow</span>
          </h2>
          <span className="text-[10px] font-mono font-bold bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
            STEP {flowIndex + 1}/12
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {FLOW_STEPS.map((s, i) => (
            <span
              key={s}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                i <= flowIndex ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>
      </div>

      {/* ============ STEP 1+2: KEYPAD PHONE + CHOOSE SOS TYPE ============ */}
      {phase === 'choose' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl border-2 border-red-300 bg-red-50 space-y-1">
              <p className="text-xs font-black text-red-700">Case 1: High Emergency</p>
              <p className="text-[11px] text-red-600">Hold button <strong>3</strong> for <strong>5 sec</strong></p>
            </div>
            <div className="p-3 rounded-2xl border-2 border-amber-300 bg-amber-50 space-y-1">
              <p className="text-xs font-black text-amber-700">Case 2: Emergency</p>
              <p className="text-[11px] text-amber-700">Press <strong>3 6 3 6 3 6</strong></p>
            </div>
          </div>

          {/* Keypad handset */}
          <div className="bg-[#1a1d24] p-5 rounded-3xl shadow-xl border border-slate-700 max-w-[300px] mx-auto">
            <div className="bg-[#0d1117] rounded-2xl p-3 mb-4 text-center border border-slate-800">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Keypad Phone</p>
              <div className="flex items-center justify-center gap-1 mt-1 min-h-[28px]">
                {seq.map((d, i) => (
                  <span key={i} className="w-6 h-8 rounded bg-amber-400 text-slate-900 font-black text-lg flex items-center justify-center">{d}</span>
                ))}
                {seq.length === 0 && <span className="text-slate-600 text-xs font-mono">— idle —</span>}
              </div>
              {seqError && <p className="text-[10px] font-bold text-red-400 mt-1">Wrong key — sequence reset</p>}
              {holdPct > 0 && (
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full bg-red-500 transition-all" style={{ width: `${holdPct}%` }} />
                  </div>
                  <p className="text-[10px] font-mono text-red-400 mt-1">HOLDING 3… {holdPct}% (5s)</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                <button
                  key={k}
                  onPointerDown={() => { if (k === '3') beginHold(); }}
                  onPointerUp={() => { if (k === '3') { cancelHold(); } }}
                  onPointerLeave={() => { if (k === '3') cancelHold(); }}
                  onClick={() => pressKey(k)}
                  className={`h-12 rounded-xl font-black text-lg transition-all active:scale-95 select-none touch-none ${
                    k === '3'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900 ring-2 ring-red-400'
                      : k === '6'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-900 ring-1 ring-amber-300'
                        : 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3 leading-relaxed">
              Hold <strong className="text-red-400">3</strong> for 5s (Case 1) or tap <strong className="text-amber-400">3-6-3-6-3-6</strong> (Case 2)
            </p>
          </div>
        </div>
      )}

      {/* ============ STEP 3: TRIGGER SOS ACTIONS (alarm + vibration 60s) ============ */}
      {phase === 'alerting' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-red-600 text-white p-5 rounded-2xl text-center space-y-2 shadow-lg animate-pulse">
            <Siren size={40} className="mx-auto" />
            <h3 className="text-lg font-black">SOS TRIGGERED — {sosType === 'HIGH_EMERGENCY' ? 'HIGH EMERGENCY' : 'EMERGENCY'}</h3>
            <p className="text-xs font-semibold opacity-90">
              {triggerKind === 'LONG_PRESS_3_5S' ? 'Button 3 held 5 seconds (Case 1)' : 'Sequence 3-6-3-6-3-6 (Case 2)'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between text-sm font-bold text-gray-800">
              <span className="flex items-center gap-2"><Bell size={16} className="text-red-500" /> Loud alarm sounding</span>
              <span className="font-mono text-red-600">{alarmLeft}s</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${(alarmLeft / ALARM_SEC) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-gray-800">
              <span className="flex items-center gap-2"><Vibrate size={16} className="text-blue-500" /> Vibration active</span>
              <span className="font-mono text-blue-600">{alarmLeft}s</span>
            </div>
            <button
              onClick={skipAlarm}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all active:scale-[0.98]"
            >
              SEND SOS NOW (SKIP REMAINING ALARM)
            </button>
            <p className="text-[11px] text-gray-500 text-center">Alarm + vibration run 60s, then SOS auto-sends</p>
          </div>
        </div>
      )}

      {/* ============ STEP 4: SEND SOS (cellular network) ============ */}
      {phase === 'send' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-teal-700 text-white p-4 rounded-2xl space-y-1">
            <h3 className="text-sm font-black flex items-center gap-2"><Radio size={16} /> Step 4 — Send SOS via Cellular Network</h3>
            <p className="text-[11px] opacity-90">Normal SMS — or converted to HTTP webhook for the backend</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setChannel('SMS')}
                className={`py-2.5 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 ${channel === 'SMS' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-500'}`}
              >
                <MessageSquareText size={14} /> Normal SMS {channel === 'SMS' && <Check size={14} />}
              </button>
              <button
                onClick={() => setChannel('HTTP')}
                className={`py-2.5 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 ${channel === 'HTTP' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-500'}`}
              >
                <Hash size={14} /> HTTP Webhook {channel === 'HTTP' && <Check size={14} />}
              </button>
            </div>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">Device ID</span>
              <input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">Phone number</span>
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">Owner name</span>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
            </label>
            <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <MapPin size={14} className="text-red-500 shrink-0" />
              <span className="font-semibold text-slate-700 flex-1">
                {gpsFix ? `GPS ${gpsFix.lat.toFixed(5)}, ${gpsFix.lng.toFixed(5)}` : 'No GPS — cell-tower triangulation fallback'}
              </span>
              {!gpsFix && (
                <button
                  onClick={retryGps}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black shrink-0 transition-all active:scale-95"
                >
                  ENABLE GPS
                </button>
              )}
            </div>
            {sendError && <p className="text-xs font-bold text-red-600">{sendError}</p>}
            <button
              onClick={transmitSos}
              disabled={sending}
              className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-sm font-black transition-all active:scale-[0.98]"
            >
              {sending ? 'TRANSMITTING…' : `TRANSMIT SOS VIA ${channel}`}
            </button>
            <button onClick={() => setPhase('choose')} className="w-full text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1">
              <ChevronLeft size={14} /> Back to keypad
            </button>
          </div>
        </div>
      )}

      {/* ============ STEPS 5-12: BACKEND → DB → AMBULANCE → SMS → IDLE ============ */}
      {phase === 'tracking' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {!incident ? (
            <div className="bg-white p-8 rounded-2xl border text-center text-sm text-gray-500">Syncing with backend…</div>
          ) : (
            <>
              <div className="bg-violet-700 text-white p-4 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black">SOS #{incident.sosNumber ?? '—'} stored in Database</h3>
                  <span className="text-[10px] font-mono font-bold bg-white/15 px-2 py-1 rounded-lg">
                    {incident.status === 'NOTIFIED' ? 'WAITING' : incident.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  {incident.keypadSos?.channel} webhook validated • {incident.keypadSos?.locationSource} location • {incident.address}
                </p>
              </div>

              {!incident.assignedResponderId && incident.status !== 'CANCELLED' && (
                <div className="bg-white p-4 rounded-2xl border border-amber-300 space-y-2 text-center">
                  <Radio size={28} className="mx-auto text-amber-500 animate-pulse" />
                  <p className="text-sm font-black text-gray-900">Waiting for ambulance to ACCEPT…</p>
                  <p className="text-[11px] text-gray-500">Ambulance app shows: New SOS • Location available • [ ACCEPT ] [ REJECT ]</p>
                </div>
              )}

              {incident.assignedResponderId && (
                <>
                  <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 size={28} className="shrink-0" />
                    <div>
                      <p className="text-sm font-black">ACCEPTED — Ambulance assigned</p>
                      <p className="text-[11px] opacity-90">Standard driver → hospital → traffic-police flow now running</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2">
                    <p className="text-xs font-black uppercase text-gray-700">SMS API → Telecom network</p>
                    {mySms.length === 0 ? (
                      <p className="text-xs text-gray-500 animate-pulse">Sending SMS to emergency contacts + authorities…</p>
                    ) : (
                      <div className="space-y-1.5">
                        {mySms.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                            <span className="font-bold text-emerald-900">📩 {s.toName || s.to}</span>
                            <span className="font-mono font-black text-emerald-700">{s.status}</span>
                          </div>
                        ))}
                        <p className="text-[11px] text-gray-500 italic">“SOS alert sent to emergency contacts and authorities.”</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase text-gray-700">Live mission tracking</p>
                    <LiveEmergencyMap incident={incident} role="PATIENT" users={state.users} height="220px" />
                    <div className="bg-white p-4 rounded-2xl border border-gray-200">
                      <LiveSteps incident={incident} />
                    </div>
                  </div>

                  {incident.status === 'COMPLETED' && (
                    <button
                      onClick={() => setPhase('done')}
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-black transition-all active:scale-[0.98]"
                    >
                      END — RETURN TO IDLE
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {phase === 'rejected' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl border border-red-200 text-center space-y-2">
            <p className="text-lg font-black text-gray-900">SOS was not accepted</p>
            <p className="text-xs text-gray-500">
              {incident?.keypadSos?.rejectReason || 'Unit unavailable'} — record kept in database.
            </p>
            <button onClick={resetAll} className="mt-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5">
              <RotateCcw size={14} /> Back to idle — new SOS
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-emerald-600 text-white p-8 rounded-2xl text-center space-y-2">
            <CheckCircle2 size={44} className="mx-auto" />
            <p className="text-lg font-black">System ready for next SOS</p>
            <p className="text-xs opacity-90">Full mission + SMS log archived in database</p>
            <button onClick={resetAll} className="mt-2 px-5 py-2.5 bg-white text-emerald-700 rounded-xl text-xs font-black inline-flex items-center gap-1.5">
              <RotateCcw size={14} /> New keypad SOS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveSteps({ incident }: { incident: Incident }) {
  const tlHas = (s: string) => (incident.timeline || []).some((t: any) => t.status === s);
  const steps = [
    { label: 'SOS Sent', done: true },
    { label: 'Responder Accepted', done: !!incident.assignedResponderId },
    { label: 'Hospital Selected', done: !!incident.selectedHospitalId },
    { label: 'Patient Picked', done: tlHas('PATIENT_PICKED') || ['IN_TRANSIT', 'REACHED_DESTINATION', 'COMPLETED'].includes(incident.status) },
    { label: 'In Transit', done: tlHas('IN_TRANSIT') || ['REACHED_DESTINATION', 'COMPLETED'].includes(incident.status) },
    { label: 'Reached Hospital', done: tlHas('REACHED_DESTINATION') || incident.status === 'COMPLETED' },
  ];
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${s.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-gray-50 border-gray-200 text-gray-300'}`}>
            {s.done ? <Check size={14} className="stroke-[3]" /> : <div className="w-2 h-2 rounded-full bg-current" />}
          </div>
          <span className={`text-xs font-bold ${s.done ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
