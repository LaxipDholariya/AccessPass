import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ShieldCheck, Lock } from 'lucide-react';
import SEOHead from '../components/SEOHead';

export default function PassLookup() {
  const [referenceCode, setReferenceCode] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const clean = referenceCode.trim().toUpperCase();
    if (clean) {
      navigate(`/pass/${clean}`);
    }
  };

  return (
    <div className="max-w-md mx-auto my-14 px-4">
      <SEOHead
        title="Visitor Status Lookup"
        description="Check your visitor access status using your unique reference code."
        canonicalPath="/pass-lookup"
      />
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-xs">
            <Search className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Visitor Status Lookup</h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Enter the unique reference code provided during visit registration to check your appointment review status.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="refCode" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Visit Reference Code *
            </label>
            <input
              id="refCode"
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="e.g. AP-2026-X8B9K"
              required
              className="block w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 uppercase font-mono tracking-wider"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-start space-x-2">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Notice:</strong> Initial status lookup displays only your request workflow status (Pending, Approved, Rejected). Personal details and scannable QR passes require your verification secret.
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            Check Visit Status
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Haven't registered yet?{' '}
          <Link to="/register-visit" className="text-blue-600 font-semibold hover:underline">
            Register a new visit
          </Link>
        </div>
      </div>
    </div>
  );
}
