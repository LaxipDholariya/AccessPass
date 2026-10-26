import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { 
  Users, 
  Building2, 
  Ban, 
  FileSpreadsheet, 
  Clock, 
  UserCheck, 
  TrendingUp, 
  RefreshCw
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const response = await adminApi.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve admin stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Calculating system metrics..." size="lg" />;
  }

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administration Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Campus visitor flow, facility status, security controls, and system statistics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchStats(); }}
          className="inline-flex items-center self-start sm:self-auto px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Stats
        </button>
      </div>

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Summary Cards Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Visits</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-extrabold text-slate-900">{stats.todayVisits}</span>
              <span className="ml-2 text-xs text-slate-500 font-medium">scheduled</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Approvals</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-extrabold text-slate-900">{stats.pendingVisits}</span>
              <span className="ml-2 text-xs text-slate-500 font-medium">awaiting host</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Currently Inside</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-extrabold text-slate-900">{stats.currentlyInside}</span>
              <span className="ml-2 text-xs text-slate-500 font-medium">active in campus</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Blacklisted Entries</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-extrabold text-slate-900">{stats.blacklistedCount}</span>
              <span className="ml-2 text-xs text-slate-500 font-medium">blocked credentials</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Staff Accounts</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-extrabold text-slate-900">{stats.activeStaffCount}</span>
              <span className="ml-2 text-xs text-slate-500 font-medium">active personnel</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Campus Facilities</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-extrabold text-slate-900">{stats.buildingsCount}</span>
              <span className="ml-2 text-xs text-slate-500 font-medium">registered buildings</span>
            </div>
          </div>

        </div>
      )}

      {/* Quick Navigation Panels */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">
          Administrative Modules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Link
            to="/admin/users"
            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all group"
          >
            <Users className="w-6 h-6 text-blue-600 mb-3" />
            <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600">User Management</h3>
            <p className="text-xs text-slate-500 mt-1">Manage Host, Security, and Admin accounts and roles</p>
          </Link>

          <Link
            to="/admin/buildings"
            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all group"
          >
            <Building2 className="w-6 h-6 text-blue-600 mb-3" />
            <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600">Buildings & Facilities</h3>
            <p className="text-xs text-slate-500 mt-1">Manage campus premises, codes, and checkpoint zones</p>
          </Link>

          <Link
            to="/admin/blacklist"
            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all group"
          >
            <Ban className="w-6 h-6 text-rose-600 mb-3" />
            <h3 className="font-semibold text-slate-900 text-sm group-hover:text-rose-600">Blacklist Control</h3>
            <p className="text-xs text-slate-500 mt-1">Enforce security restrictions by phone, email, or ID</p>
          </Link>

          <Link
            to="/admin/reports"
            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all group"
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 mb-3" />
            <h3 className="font-semibold text-slate-900 text-sm group-hover:text-emerald-600">Audit Trail & Reports</h3>
            <p className="text-xs text-slate-500 mt-1">Review operational logbook and export visits spreadsheet</p>
          </Link>

        </div>
      </div>

    </div>
  );
}
