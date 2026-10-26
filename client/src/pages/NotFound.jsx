import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import SEOHead from '../components/SEOHead';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-slate-50">
      <SEOHead
        title="Page Not Found (404)"
        description="The requested page could not be found on AccessPass."
        noIndex={true}
      />
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">404 — Page Not Found</h1>
        <p className="text-xs text-slate-500 mb-6">
          The requested path does not exist in AccessPass or may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}
