import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';

export default function AuditLogsReport() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(50);
  const [isExporting, setIsExporting] = useState(false);
  const [success, setSuccess] = useState('');

  const loadLogs = async () => {
    setError('');
    try {
      const response = await adminApi.getAuditLogs(limit);
      if (response.success) {
        setLogs(response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [limit]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.downloadVisitsCSV();
      setSuccess('Visit history exported to CSV spreadsheet successfully.');
    } catch (err) {
      setError(err.message || 'Failed to download CSV export.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Audit Trail & Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable chronological record of administrative actions, authorizations, and gate check-ins.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => { setLoading(true); loadLogs(); }}
            className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-1.5" />
            <span>{isExporting ? 'Generating CSV...' : 'Export Visits CSV'}</span>
          </button>
        </div>
      </div>

      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />
      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Limit Selector */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs text-slate-600 shadow-sm">
        <span>Displaying most recent chronological activities</span>
        <div className="flex items-center space-x-2">
          <label htmlFor="limitSelect" className="font-semibold text-slate-700">Rows:</label>
          <select
            id="limitSelect"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
          >
            <option value={25}>25 entries</option>
            <option value={50}>50 entries</option>
            <option value={100}>100 entries</option>
            <option value={200}>200 entries</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner message="Querying audit trail..." />
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No audit log entries recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor / Performed By</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Operational Details</th>
                  <th className="px-4 py-3">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-800">
                      {log.user_name ? (
                        <>
                          <strong className="block text-slate-900">{log.user_name}</strong>
                          <span className="capitalize text-[11px] text-slate-400">{log.user_role}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Public / System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {log.target_entity} #{log.target_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-md truncate" title={log.details}>
                      {log.details || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
