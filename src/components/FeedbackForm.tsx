import React, { useState } from 'react';
import { Star, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

export default function FeedbackForm({
  incidentId, fromRole, toRole, fromId, toId, targetName, onSubmit
}: {
  incidentId: string;
  fromRole: UserRole;
  toRole: UserRole;
  fromId: string;
  toId: string;
  targetName: string;
  onSubmit: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ratingLabels = ['', 'Poor Response', 'Fair Response', 'Good Response', 'Very Good Response', 'Exceptional Service'];

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId, fromRole, toRole, fromId, toId, rating, comment
        })
      });
      onSubmit();
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'PATIENT': return 'Patient / Bystander';
      case 'AMBULANCE_DRIVER': return 'Ambulance Unit';
      case 'HOSPITAL': return 'Hospital Trauma Command';
      case 'TRAFFIC_POLICE': return 'Traffic Police Command';
      default: return role;
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border-2 border-red-500 shadow-md my-4 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2 text-red-700 font-black text-xs uppercase tracking-wider">
          <AlertCircle size={16} className="text-red-600 animate-pulse" />
          <span>Mandatory Emergency Response Review</span>
        </div>
        <span className="px-2 py-0.5 bg-red-600 text-white rounded font-black text-[9px] uppercase tracking-wider">
          Required to Close Mission
        </span>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          Emergency Record: <span className="font-mono font-bold text-gray-800">#REC-{incidentId.slice(0, 8).toUpperCase()}</span>
        </p>
        <h3 className="text-base font-black text-gray-900 mt-0.5">
          Rate Performance of {targetName} ({getRoleLabel(toRole)})
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          As part of the RESQ quality protocol, feedback from every stakeholder is mandatory after each emergency.
        </p>
      </div>

      <div className="space-y-1.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1 hover:scale-110 active:scale-95 transition-transform"
              aria-label={`Rate ${star} star`}
            >
              <Star 
                size={28} 
                className={rating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-300 stroke-[1.5]'} 
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-xs font-bold text-amber-700 ml-2">
              {ratingLabels[rating]}
            </span>
          )}
        </div>
        {rating === 0 && (
          <p className="text-[11px] text-red-500 font-semibold">
            * Please select a star rating (1-5) to proceed
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          Stakeholder Observations & Comments:
        </label>
        <textarea
          placeholder="Brief notes on response time, clinical handoff, or corridor coordination..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none bg-white"
          rows={2}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2"
      >
        <ShieldCheck size={16} />
        <span>{submitting ? 'Submitting Mandatory Review...' : 'Submit Mandatory Review & Finalize'}</span>
      </button>
    </div>
  );
}
