import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

export default function AlertMessage({ type = 'error', message, onClose }) {
  if (!message) return null;

  const styles = {
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
    },
  };

  const current = styles[type] || styles.error;

  return (
    <div className={`p-4 rounded-lg border flex items-start space-x-3 text-sm mb-4 ${current.bg}`}>
      {current.icon}
      <div className="flex-grow font-medium leading-relaxed">{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 ml-2"
          aria-label="Close notification"
        >
          &times;
        </button>
      )}
    </div>
  );
}
