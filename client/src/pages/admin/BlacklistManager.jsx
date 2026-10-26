import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Ban, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Modal from '../../components/Modal';

export default function BlacklistManager() {
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    identifierType: 'phone',
    identifierValue: '',
    reason: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBlacklist = async () => {
    setError('');
    try {
      const response = await adminApi.getBlacklist();
      if (response.success) {
        setBlacklist(response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load blacklist entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlacklist();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await adminApi.addBlacklist(addForm);
      if (response.success) {
        setSuccess('Blacklist security restriction enforced.');
        setIsAddOpen(false);
        setAddForm({ identifierType: 'phone', identifierValue: '', reason: '' });
        loadBlacklist();
      }
    } catch (err) {
      setError(err.message || 'Failed to add blacklist entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id, val) => {
    if (!window.confirm(`Are you sure you want to lift blacklist restrictions for "${val}"?`)) return;
    setError('');
    setSuccess('');

    try {
      const response = await adminApi.removeBlacklist(id);
      if (response.success) {
        setSuccess('Blacklist restriction removed successfully.');
        loadBlacklist();
      }
    } catch (err) {
      setError(err.message || 'Failed to remove blacklist entry.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blacklist Security Control</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Maintain barred visitor identifiers (phones, emails, and ID proofs) to automatically prevent registration and gate access.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => { setLoading(true); loadBlacklist(); }}
            className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Blacklist Entry
          </button>
        </div>
      </div>

      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />
      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Blacklist Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner message="Retrieving security blacklist..." />
        ) : blacklist.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Ban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No active blacklist records</p>
            <p className="text-xs text-slate-400 mt-1">
              There are currently no restricted phones, emails, or IDs registered in the system.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Identifier Type</th>
                  <th className="px-4 py-3">Restricted Value</th>
                  <th className="px-4 py-3">Administrative Rationale</th>
                  <th className="px-4 py-3">Enforced By</th>
                  <th className="px-4 py-3">Date Added</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {blacklist.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <span className="capitalize font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {item.identifier_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {item.identifier_value}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-sm truncate" title={item.reason}>
                      {item.reason}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.added_by_name || 'System Admin'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id, item.identifier_value)}
                        className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:text-rose-700 hover:bg-rose-50 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Blacklist Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Enforce Security Blacklist">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Identifier Type *
            </label>
            <select
              value={addForm.identifierType}
              onChange={(e) => setAddForm({ ...addForm, identifierType: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="phone">Phone Number</option>
              <option value="email">Email Address</option>
              <option value="id_proof">Government / Student ID Number</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Exact Identifier Value *
            </label>
            <input
              type="text"
              required
              value={addForm.identifierValue}
              onChange={(e) => setAddForm({ ...addForm, identifierValue: e.target.value })}
              placeholder={
                addForm.identifierType === 'phone'
                  ? 'e.g. +919999888877'
                  : addForm.identifierType === 'email'
                  ? 'e.g. suspicious@domain.com'
                  : 'e.g. AADHAAR-1234-5678'
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Administrative Rationale / Incident Explanation *
            </label>
            <textarea
              rows={3}
              required
              value={addForm.reason}
              onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
              placeholder="e.g. Unauthorized entry attempt, forged documentation, or conduct violation."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              {isSubmitting ? 'Enforcing...' : 'Enforce Restriction'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
