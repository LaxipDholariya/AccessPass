import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import SEOHead from '../components/SEOHead';

export default function Unauthorized() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-slate-50">
      <SEOHead
        title="Access Denied (403)"
        description="You do not have permission to access this internal portal."
        noIndex={true}
      />
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Access Denied (403 Forbidden)</h1>
        <p className="text-xs text-slate-600 mb-6">
          Your account role does not have authorization to view this administrative resource.
        </p>
        <div className="space-y-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
