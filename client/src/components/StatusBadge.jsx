import React from 'react';

/**
 * StatusBadge component renders a standardized, color-coded tag
 * for request states and pass validity.
 */
export default function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inside: 'bg-blue-600 text-white border-blue-700 font-semibold',
    exited: 'bg-teal-50 text-teal-700 border-teal-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
    expired: 'bg-slate-100 text-slate-600 border-slate-200',
    used: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
    revoked: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
  };

  const currentStyle = styles[normalized] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${currentStyle}`}
    >
      {normalized}
    </span>
  );
}
