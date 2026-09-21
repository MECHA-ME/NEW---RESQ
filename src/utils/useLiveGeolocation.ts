import { useEffect, useState } from 'react';

export interface GpsFix {
  lat: number;
  lng: number;
  /** Accuracy radius in meters (as reported by the device). */
  accuracy: number;
  at: number;
}

/**
 * Live device GPS via the browser Geolocation API (open web standard, no keys).
 * Works on localhost and HTTPS. Uses satellite-accurate high-accuracy fix with
 * OpenStreetMap + Esri satellite layers on the map. Falls back to IP geolocation
 * (HTTPS, no permission needed) if GPS is blocked/insecure, so the map never
 * stays on the demo SF fallback when the user is elsewhere (India, etc.).
 */
export function useLiveGeolocation(enabled = true) {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  // Bumped by retry() to restart the watcher (e.g. after the user grants
  // permission in a second attempt). Each tunnel URL is a new browser origin,
  // so permission must be granted again for every new public link.
  const [attempt, setAttempt] = useState(0);
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const isSecure = typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (!enabled) return;
    if (!supported) {
      setError('Geolocation not supported — using IP location fallback');
    }
    let watchId: number | null = null;
    let ipFallbackDone = false;
    const tryIpFallback = async () => {
      if (ipFallbackDone || fix) return;
      ipFallbackDone = true;
      try {
        // HTTPS IP geolocation fallback (approximate, ~km accuracy, but accurate city-level vs SF demo)
        const r = await fetch('https://ipapi.co/json/');
        if (!r.ok) throw new Error('ipapi failed');
        const j: any = await r.json();
        if (typeof j.latitude === 'number' && typeof j.longitude === 'number') {
          // Only use fallback if we still have no real GPS fix
          if (!fix) {
            setFix({ lat: Number(j.latitude), lng: Number(j.longitude), accuracy: 3500, at: Date.now() });
            setError('Using IP location (~city-level). Allow GPS permission for satellite-accurate ±10m fix');
          }
        }
      } catch {}
    };
    try {
      if (supported && isSecure) {
        // Immediate one-shot for fastest first fix (satellite-accurate)
        navigator.geolocation.getCurrentPosition(
          (p) => {
            setFix({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              accuracy: p.coords.accuracy,
              at: Date.now(),
            });
            setError(null);
            setErrorCode(null);
          },
          (e: any) => {
            // On error, try IP fallback after a short delay so satellite map still shows user city, not SF demo
            if (e?.code === 1) {
              setErrorCode(1);
              setError('Location permission denied — allow location for this site, then tap Retry (or use HTTPS tunnel for phone). Using IP fallback for now.');
            } else {
              setError(e?.message ? `${e.message} — trying IP fallback` : 'GPS unavailable — trying IP fallback');
            }
            setTimeout(tryIpFallback, 800);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
        watchId = navigator.geolocation.watchPosition(
          (p) => {
            // Prefer the most accurate fix seen: ignore a sudden coarse if we already have <30m
            setFix(prev => {
              const nextAcc = p.coords.accuracy;
              if (prev && prev.accuracy < 30 && nextAcc > 1000) return prev;
              return {
                lat: p.coords.latitude,
                lng: p.coords.longitude,
                accuracy: nextAcc,
                at: Date.now(),
              };
            });
            setError(null);
            setErrorCode(null);
          },
          (e: any) => {
            setErrorCode(typeof e?.code === 'number' ? e.code : null);
            if (e?.code === 1) {
              setError('Location permission denied — allow location for this site, then tap Retry. On phone, open via HTTPS tunnel (.trycloudflare.com/.loca.lt) — HTTP 192.168.x blocks GPS.');
            } else {
              setError(e?.message ? `${e.message} — tap Retry or check HTTPS` : 'GPS unavailable — tap Retry');
            }
            setTimeout(tryIpFallback, 500);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
        // If no fix after 4s, also try IP fallback so map centers on real city, not SF demo
        setTimeout(() => { if (!fix) tryIpFallback(); }, 4000);
      } else {
        if (!isSecure) {
          setError('Insecure context (HTTP 192.168.x) blocks GPS — open via http://localhost:3000 on this PC, or via HTTPS tunnel for phone (allowed: .trycloudflare.com/.loca.lt). Using IP fallback.');
        }
        tryIpFallback();
      }
    } catch (e: any) {
      setError(e?.message || 'GPS unavailable — trying IP fallback');
      tryIpFallback();
    }
    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, supported, attempt, isSecure]);

  const retry = () => {
    setError(null);
    setErrorCode(null);
    setAttempt((a) => a + 1);
  };

  return { fix, error, errorCode, supported, retry };
}
